/**
 * Hinglish Translator & Reader — Popup Script (Bug-Fixed)
 * Handles UI, voice population, settings storage, robust messaging
 */

document.addEventListener('DOMContentLoaded', () => {
  const btnTranslate = document.getElementById('btn-translate');
  const btnRead = document.getElementById('btn-read');
  const btnStop = document.getElementById('btn-stop');
  const btnRestore = document.getElementById('btn-restore');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const voiceSelect = document.getElementById('voice-select');
  const rateSlider = document.getElementById('rate-slider');
  const rateValue = document.getElementById('rate-value');
  const pitchSlider = document.getElementById('pitch-slider');
  const pitchValue = document.getElementById('pitch-value');

  let statusInterval = null;

  // ─── Load Settings ──────────────────────────────────────────────────
  async function loadSettings() {
    try {
      const stored = await browser.storage.local.get(['hinglish_rate', 'hinglish_pitch', 'hinglish_voice']);
      if (stored.hinglish_rate) {
        rateSlider.value = stored.hinglish_rate;
        rateValue.textContent = stored.hinglish_rate + 'x';
      }
      if (stored.hinglish_pitch) {
        pitchSlider.value = stored.hinglish_pitch;
        pitchValue.textContent = stored.hinglish_pitch;
      }
      if (stored.hinglish_voice) {
        voiceSelect.value = stored.hinglish_voice;
      }
    } catch (e) {
      console.error('Load settings error:', e);
    }
  }

  async function saveSettings() {
    try {
      await browser.storage.local.set({
        hinglish_rate: parseFloat(rateSlider.value),
        hinglish_pitch: parseFloat(pitchSlider.value),
        hinglish_voice: voiceSelect.value
      });
    } catch (e) {
      console.error('Save settings error:', e);
    }
  }

  // ─── Populate Voices ──────────────────────────────────────────────────
  function populateVoices() {
    if (!window.speechSynthesis) {
      voiceSelect.innerHTML = '<option value="">❌ TTS not available</option>';
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      voiceSelect.innerHTML = '<option value="">⏳ Loading voices…</option>';
      return;
    }

    const savedValue = voiceSelect.value;
    voiceSelect.innerHTML = '<option value="">🤖 System Default</option>';

    const hindiVoices = voices.filter(v => /hi/i.test(v.lang));
    const indianVoices = voices.filter(v => /en[-_]IN/i.test(v.lang));
    const otherVoices = voices.filter(v => !/hi/i.test(v.lang) && !/en[-_]IN/i.test(v.lang));

    const addGroup = (label, voiceList) => {
      if (voiceList.length === 0) return;
      const optgroup = document.createElement('optgroup');
      optgroup.label = label;
      voiceList.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.voiceURI;
        let icon = '🎙️';
        if (/google/i.test(voice.name)) icon = '🔵';
        else if (/microsoft/i.test(voice.name)) icon = '🟦';
        else if (/apple/i.test(voice.name)) icon = '🍎';
        option.textContent = `${icon} ${voice.name} (${voice.lang})`;
        optgroup.appendChild(option);
      });
      voiceSelect.appendChild(optgroup);
    };

    addGroup('🇮🇳 Hindi / Hinglish — Best', hindiVoices);
    addGroup('🇮🇳 Indian English', indianVoices);
    addGroup('🌍 Other Voices', otherVoices);

    // Restore selection if still valid
    if (savedValue) {
      const stillExists = Array.from(voiceSelect.options).some(o => o.value === savedValue);
      if (stillExists) voiceSelect.value = savedValue;
    }
  }

  // Init voices
  if (window.speechSynthesis) {
    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;
    // Retry after delay if voices empty initially
    setTimeout(() => { if (!window.speechSynthesis.getVoices().length) populateVoices(); }, 500);
  }

  // ─── Settings Events ────────────────────────────────────────────────
  rateSlider.addEventListener('input', (e) => {
    rateValue.textContent = e.target.value + 'x';
    saveSettings();
  });
  pitchSlider.addEventListener('input', (e) => {
    pitchValue.textContent = e.target.value;
    saveSettings();
  });
  voiceSelect.addEventListener('change', saveSettings);

  // ─── Status & Messaging ─────────────────────────────────────────────
  function updateStatus(status) {
    statusDot.className = 'dot';
    if (status.isTranslating) {
      statusDot.classList.add('translating');
      statusText.textContent = 'Translating…';
    } else if (status.isReading) {
      statusDot.classList.add('reading');
      statusText.textContent = 'Reading aloud…';
    } else if (status.isTranslated) {
      statusText.textContent = 'Translated';
    } else {
      statusText.textContent = 'Ready';
    }
  }

  async function sendMessage(action, data = {}) {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].id) return;
      const res = await browser.tabs.sendMessage(tabs[0].id, { action, ...data });
      if (action === 'getStatus') updateStatus(res);
      return res;
    } catch (err) {
      // Content script not loaded → inject it manually or show error
      if (err.message && err.message.includes('Could not establish connection')) {
        statusText.textContent = 'Reload page & try again';
      } else {
        statusText.textContent = 'Error';
      }
      console.error('Popup message error:', err.message || err);
    }
  }

  // ─── Buttons ────────────────────────────────────────────────────────
  btnTranslate.addEventListener('click', async () => {
    statusDot.classList.add('translating');
    statusText.textContent = 'Translating…';
    await sendMessage('translate');
    setTimeout(() => sendMessage('getStatus'), 1500);
  });

  btnRead.addEventListener('click', async () => {
    const settings = {
      rate: parseFloat(rateSlider.value),
      pitch: parseFloat(pitchSlider.value),
      voiceURI: voiceSelect.value || null
    };
    statusDot.classList.add('reading');
    statusText.textContent = 'Reading…';
    await sendMessage('speak', settings);
  });

  btnStop.addEventListener('click', async () => {
    await sendMessage('stop');
    sendMessage('getStatus');
  });

  btnRestore.addEventListener('click', async () => {
    await sendMessage('restore');
    sendMessage('getStatus');
  });

  // ─── Init ───────────────────────────────────────────────────────────
  loadSettings();
  sendMessage('getStatus');

  // Poll status every 2s (clear on unload)
  statusInterval = setInterval(() => sendMessage('getStatus'), 2000);
  window.addEventListener('unload', () => clearInterval(statusInterval));
});
