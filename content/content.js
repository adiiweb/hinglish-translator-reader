/**
 * Hinglish Translator & Reader — Content Script (Bug-Fixed v1.1.1)
 * Fixes: delimiter bug, voice race-condition, stale DOM refs, SPA support, error handling
 */

(function() {
  'use strict';

  // ─── State ──────────────────────────────────────────────────────────
  let isTranslating = false;
  let isReading = false;
  let translatedNodes = new Map();        // DOM node → metadata
  let speechUtterance = null;
  let currentHighlightSpans = [];
  let observer = null;                     // MutationObserver for SPAs

  // ─── Config ─────────────────────────────────────────────────────────
  const HIGHLIGHT_COLOR = '#ffeb3b';
  const HIGHLIGHT_TEXT_COLOR = '#000000';
  const DELIMITER = '\u0001\u0002\u0003';   // Unicode unlikely to be translated

  // ─── Utility: Debounce ──────────────────────────────────────────────
  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // ─── Utility: Get visible text nodes ────────────────────────────────
  function getTextNodes(root = document.body) {
    const walker = document.createTreeWalker(
      root, NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          const blacklist = ['script','style','noscript','iframe','canvas','svg','code','pre','textarea','input'];
          if (blacklist.includes(tag)) return NodeFilter.FILTER_REJECT;
          if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
          if (parent.closest('.hinglish-translated, .hinglish-toast')) return NodeFilter.FILTER_REJECT;
          // Skip invisible nodes
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  }

  // ─── Utility: Chunk text (max ~3000 chars) ─────────────────────────
  function chunkText(texts, maxLen = 3000) {
    const chunks = [];
    let current = [], currentLen = 0;
    for (const t of texts) {
      if (currentLen + t.length > maxLen && current.length > 0) {
        chunks.push(current);
        current = [t]; currentLen = t.length;
      } else {
        current.push(t); currentLen += t.length;
      }
    }
    if (current.length) chunks.push(current);
    return chunks;
  }

  // ─── Translation: Google Translate (free) ───────────────────────────
  async function translateChunkGoogle(texts) {
    const joined = texts.join(DELIMITER);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=hi&dt=t&q=${encodeURIComponent(joined)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // data[0] = [[translated, original, …], [translated2, original2, …], …]
    if (!Array.isArray(data[0])) throw new Error('Bad response format');

    // Reconstruct by matching delimiters in translated output
    const rawTranslated = data[0].map(item => item[0]).join('');
    const parts = rawTranslated.split(DELIMITER).map(s => s.trim());

    // If split count mismatch (delimiter got mangled), fallback to proportional split
    if (parts.length !== texts.length) {
      console.warn('[Hinglish] Delimiter mismatch, using proportional fallback');
      return proportionalSplit(rawTranslated, texts);
    }
    return parts;
  }

  // Fallback split: divide by original text length ratios
  function proportionalSplit(fullText, originals) {
    const totalLen = originals.reduce((a, b) => a + b.length, 0);
    const result = [];
    let start = 0;
    for (const orig of originals) {
      const ratio = orig.length / totalLen;
      const len = Math.max(1, Math.round(fullText.length * ratio));
      result.push(fullText.substring(start, start + len).trim());
      start += len;
    }
    // Last one gets remainder
    if (result.length) result[result.length - 1] = fullText.substring(start - len).trim();
    return result;
  }

  // ─── Translation: MyMemory (fallback) ─────────────────────────────
  async function translateChunkMyMemory(texts) {
    const results = [];
    for (const text of texts) {
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|hi`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        results.push(data.responseData?.translatedText || text);
      } catch (e) {
        results.push(text); // fallback: keep original
      }
    }
    return results;
  }

  // ─── Transliteration: Devanagari → Roman Hinglish ───────────────────
  function devanagariToRoman(text) {
    const map = {
      'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ए':'e','ऐ':'ai','ओ':'o','औ':'au',
      'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ng',
      'च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'ny',
      'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n',
      'त':'t','थ':'th','द':'d','ध':'dh','न':'n',
      'प':'p','फ':'ph','ब':'b','भ':'bh','म':'m',
      'य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h',
      '्':'','ा':'a','ि':'i','ी':'ee','ु':'u','ू':'oo','े':'e','ै':'ai','ो':'o','ौ':'au',
      'ं':'n','ः':'h','ँ':'n','़':'','ॅ':'e','ॉ':'o',
      '०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9',
      '।':'.','॥':'.',' ':' ','\n':'\n'
    };
    let result = '';
    for (const char of text) result += map[char] || char;
    // Hinglish simplification
    result = result
      .replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/aa/g, 'a')
      .replace(/kh/g, 'k').replace(/gh/g, 'g').replace(/chh/g, 'ch')
      .replace(/jh/g, 'j').replace(/th/g, 't').replace(/dh/g, 'd')
      .replace(/ph/g, 'f').replace(/bh/g, 'b').replace(/sh/g, 's')
      .replace(/ny/g, 'n').replace(/ng/g, 'n');
    return result;
  }

  // ─── Main Translate ───────────────────────────────────────────────
  async function translatePage() {
    if (isTranslating) return;
    isTranslating = true;
    showToast('Translating to Hinglish…');

    try {
      const textNodes = getTextNodes();
      const texts = textNodes.map(n => n.textContent.trim());
      if (texts.length === 0) { isTranslating = false; return; }

      const chunks = chunkText(texts, 3000);
      let translatedAll = [];

      for (const chunk of chunks) {
        let translated;
        try {
          translated = await translateChunkGoogle(chunk);
        } catch (e) {
          console.warn('[Hinglish] Google failed, using MyMemory:', e.message);
          translated = await translateChunkMyMemory(chunk);
        }
        const hinglish = translated.map(t => devanagariToRoman(t));
        translatedAll.push(...hinglish);
      }

      // Replace in DOM (reverse order to preserve indices)
      for (let i = textNodes.length - 1; i >= 0; i--) {
        const node = textNodes[i];
        const original = node.textContent;
        const translated = translatedAll[i] || original;

        const span = document.createElement('span');
        span.className = 'hinglish-translated';
        span.dataset.original = original;
        span.textContent = translated;
        span.style.display = 'inline';

        if (node.parentNode) {
          node.parentNode.replaceChild(span, node);
          translatedNodes.set(span, { originalText: original, translatedText: translated });
        }
      }

      // Watch for SPA changes
      startObserver();
      showToast('Translation complete! Click text to read from there.');
    } catch (err) {
      console.error('[Hinglish] Translation error:', err);
      showToast('Translation failed. Try again.');
    } finally {
      isTranslating = false;
    }
  }

  // ─── Restore Original ───────────────────────────────────────────────
  function restoreOriginal() {
    stopReading();
    stopObserver();
    const nodes = Array.from(translatedNodes.keys());
    // Reverse to avoid index shifts
    for (let i = nodes.length - 1; i >= 0; i--) {
      const span = nodes[i];
      const data = translatedNodes.get(span);
      if (span.parentNode && data) {
        const textNode = document.createTextNode(data.originalText);
        span.parentNode.replaceChild(textNode, span);
      }
    }
    translatedNodes.clear();
    showToast('Original text restored.');
  }

  // ─── SPA Support: MutationObserver ──────────────────────────────────
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(debounce((mutations) => {
      // If new untranslated nodes appear, user can re-translate manually
      // Auto-retranslate can be annoying on SPAs
      console.log('[Hinglish] Page mutated, new content may need re-translation.');
    }, 1000));
    observer.observe(document.body, { childList: true, subtree: true });
  }
  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
  }

  // ─── Voice Selection (with retry for async voice loading) ─────────────
  function getVoicesWithRetry(maxAttempts = 10) {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0 || attempts >= maxAttempts) {
          resolve(voices);
        } else {
          attempts++;
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  async function findBestVoice(preferredURI) {
    const voices = await getVoicesWithRetry();
    if (!voices.length) return null;

    // 1. Exact URI match
    if (preferredURI) {
      const exact = voices.find(v => v.voiceURI === preferredURI);
      if (exact) return exact;
    }
    // 2. Hindi voices (best for Hinglish)
    const hindiVoices = voices.filter(v => /hi/i.test(v.lang));
    if (hindiVoices.length) {
      const premium = hindiVoices.find(v =>
        /google|microsoft|neural|natural/i.test(v.name)
      );
      if (premium) return premium;
      return hindiVoices[0];
    }
    // 3. Indian English
    const indian = voices.find(v => /en[-_]IN/i.test(v.lang));
    if (indian) return indian;
    // 4. Any English
    const english = voices.find(v => /en/i.test(v.lang));
    if (english) return english;
    return voices[0];
  }

  // ─── Text-to-Speech ─────────────────────────────────────────────────
  async function speakText(text, settings = {}) {
    if (!window.speechSynthesis) {
      showToast('TTS not supported in this browser.');
      return;
    }

    stopReading();
    prepareHighlights();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.rate || 1.0;
    utterance.pitch = settings.pitch || 1.0;
    utterance.lang = 'hi-IN';

    const selectedVoice = await findBestVoice(settings.voiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('[Hinglish TTS] Voice:', selectedVoice.name, selectedVoice.lang);
    } else {
      console.warn('[Hinglish TTS] No suitable voice found, using default');
    }

    utterance.onboundary = (event) => {
      if (event.name === 'word') highlightWordAtPosition(event.charIndex);
    };
    utterance.onend = () => {
      isReading = false;
      clearHighlights();
      showToast('Reading complete.');
    };
    utterance.onerror = (e) => {
      console.error('[Hinglish TTS] Error:', e.error);
      isReading = false;
      clearHighlights();
      if (e.error !== 'canceled') showToast('Voice error: ' + e.error);
    };

    speechUtterance = utterance;
    isReading = true;
    window.speechSynthesis.speak(utterance);
  }

  // ─── Prepare Highlights ─────────────────────────────────────────────
  function prepareHighlights() {
    clearHighlights();
    const spans = document.querySelectorAll('.hinglish-translated');
    spans.forEach(span => {
      const text = span.textContent;
      // Preserve original whitespace by splitting on word boundaries
      const tokens = text.split(/(\s+)/);           // captures spaces too
      span.innerHTML = '';
      tokens.forEach((token) => {
        if (!token) return;
        const wSpan = document.createElement('span');
        wSpan.className = 'hinglish-word';
        wSpan.textContent = token;
        wSpan.style.transition = 'background-color 0.15s ease';
        span.appendChild(wSpan);
        if (token.trim()) currentHighlightSpans.push(wSpan);
      });
    });
  }

  // ─── Highlight Word ─────────────────────────────────────────────────
  function highlightWordAtPosition(charIndex) {
    let counted = 0;
    for (let i = 0; i < currentHighlightSpans.length; i++) {
      const span = currentHighlightSpans[i];
      const len = span.textContent.length;
      if (counted + len > charIndex) {
        currentHighlightSpans.forEach(s => { s.style.backgroundColor = ''; s.style.color = ''; });
        span.style.backgroundColor = HIGHLIGHT_COLOR;
        span.style.color = HIGHLIGHT_TEXT_COLOR;
        span.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        break;
      }
      counted += len;
    }
  }

  // ─── Clear Highlights ─────────────────────────────────────────────────
  function clearHighlights() {
    currentHighlightSpans.forEach(s => { s.style.backgroundColor = ''; s.style.color = ''; });
    currentHighlightSpans = [];
  }

  // ─── Stop Reading ───────────────────────────────────────────────────
  function stopReading() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    isReading = false;
    clearHighlights();
    document.querySelectorAll('.hinglish-translated').forEach(span => {
      const data = translatedNodes.get(span);
      if (data) span.textContent = data.translatedText;
    });
  }

  // ─── Click-to-Read ──────────────────────────────────────────────────
  function handleClickToRead(e) {
    if (translatedNodes.size === 0) return;
    const target = e.target.closest('.hinglish-translated, .hinglish-word');
    if (!target) return;

    const translatedSpan = target.closest('.hinglish-translated') || target;
    const allSpans = Array.from(document.querySelectorAll('.hinglish-translated'));
    const startIdx = allSpans.indexOf(translatedSpan);
    if (startIdx < 0) return;

    const remainingText = allSpans.slice(startIdx).map(s => {
      const d = translatedNodes.get(s);
      return d ? d.translatedText : s.textContent;
    }).join('');

    browser.storage.local.get(['hinglish_rate', 'hinglish_pitch', 'hinglish_voice']).then(settings => {
      speakText(remainingText, {
        rate: settings.hinglish_rate || 1.0,
        pitch: settings.hinglish_pitch || 1.0,
        voiceURI: settings.hinglish_voice || null
      });
    }).catch(err => console.error('Click-to-read error:', err));
  }

  // ─── Toast ──────────────────────────────────────────────────────────
  function showToast(msg) {
    let toast = document.getElementById('hinglish-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'hinglish-toast';
      toast.className = 'hinglish-toast';
      toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
        background: #1a1a2e; color: #fff; padding: 12px 20px; border-radius: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        transition: opacity 0.3s, transform 0.3s; opacity: 0; transform: translateY(10px);
        pointer-events: none; max-width: 320px; line-height: 1.4;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 3500);
  }

  // ─── Message Listener ───────────────────────────────────────────────
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      switch (message.action) {
        case 'translate':
          await translatePage();
          sendResponse({ status: 'done' });
          break;
        case 'restore':
          restoreOriginal();
          sendResponse({ status: 'restored' });
          break;
        case 'speak':
          if (message.text) {
            await speakText(message.text, {
              rate: message.rate, pitch: message.pitch, voiceURI: message.voiceURI
            });
          } else {
            const allText = Array.from(document.querySelectorAll('.hinglish-translated'))
              .map(s => { const d = translatedNodes.get(s); return d ? d.translatedText : s.textContent; })
              .join('');
            if (allText) {
              await speakText(allText, {
                rate: message.rate, pitch: message.pitch, voiceURI: message.voiceURI
              });
            }
          }
          sendResponse({ status: 'speaking' });
          break;
        case 'stop':
          stopReading();
          sendResponse({ status: 'stopped' });
          break;
        case 'getStatus':
          sendResponse({ isTranslating, isReading, isTranslated: translatedNodes.size > 0 });
          break;
        default:
          sendResponse({ status: 'unknown' });
      }
    })();
    return true; // async response
  });

  // ─── Event Listeners ────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    if (translatedNodes.size > 0 && !e.target.closest('.hinglish-toast')) {
      handleClickToRead(e);
    }
  });

  // Pre-warm TTS engine
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }

  console.log('[Hinglish Extension] v1.1.1 loaded. Ready.');
})();
