# 🇮🇳 Hinglish Translator & Reader — Firefox Extension

> Kisi bhi webpage ko Hinglish (Roman script) mein translate karo aur suno!

[![Firefox Add-on](https://img.shields.io/badge/Firefox-Add--on-orange?logo=firefoxbrowser)](https://addons.mozilla.org/firefox/addon/hinglish-translator-reader/)
[![Version](https://img.shields.io/badge/version-1.1.1-blue)](https://github.com/YOUR_USERNAME/hinglish-translator-reader/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 🚀 Live on Firefox Add-ons

**[Install from AMO →](https://addons.mozilla.org/firefox/addon/hinglish-translator-reader/)**

## Features

- **🔄 Translate** — Kisi bhi webpage ka text Hinglish mein convert karo
- **🔊 Read Aloud** — Translate hone ke baad text ko awaaz mein suno
- **🖍️ Highlight** — Jis word ko padha ja raha hai, woh highlight hoga
- **🖱️ Click to Read** — Kahi bhi click karo, wahi se padhna shuru hoga
- **⚡ Speed Control** — 0.5x se 1.5x tak speed adjust karo
- **🎵 Pitch Control** — Voice ka tone change karo
- **🎤 Voice Selection** — Apni pasand ki voice chuno
- **💾 Auto-Save** — Settings automatically save hoti hain

## Screenshots

*(Add screenshots here)*

## Installation

### From Firefox Add-ons (Recommended)
1. [addons.mozilla.org](https://addons.mozilla.org/firefox/addon/hinglish-translator-reader/) pe jao
2. **"Add to Firefox"** pe click karo
3. Done!

### Developer Mode (Temporary)
1. Firefox open karo → `about:debugging` type karo
2. **"This Firefox"** → **"Load Temporary Add-on..."**
3. `manifest.json` select karo

## Usage

1. **Toolbar icon** pe click karo → Popup khulega
2. **"Translate Page"** pe click karo
3. Page Hinglish mein convert ho jayega
4. **"Read Aloud"** pe click karo ya kisi bhi text pe click karo
5. **"Stop"** se reading band karo
6. **"Restore Original"** se wapas English mein lao

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | Translate page |
| `Ctrl+Shift+R` | Read aloud |
| `Ctrl+Shift+S` | Stop reading |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Popup UI   │────▶│ Content Script│────▶│  Web APIs   │
│ (popup.html)│     │ (content.js)  │     │ Translate   │
└─────────────┘     └──────────────┘     │ + TTS       │
       │                     │            └─────────────┘
       ▼                     ▼
┌─────────────┐     ┌──────────────┐
│ Background  │────▶│   DOM (Page)  │
│ (background)│     │  Highlighting │
└─────────────┘     └──────────────┘
```

## File Structure

```
├── manifest.json          # Extension config
├── icons/
│   ├── icon16.png         # Toolbar icon
│   ├── icon48.png         # Add-ons manager
│   └── icon128.png        # Store listing
├── background/
│   └── background.js      # Context menus, shortcuts
├── content/
│   ├── content.js         # Translation, TTS, highlighting
│   └── content.css        # Highlight styles
├── popup/
│   ├── popup.html         # UI
│   ├── popup.css          # Styles
│   └── popup.js           # Popup logic
├── README.md              # This file
├── LICENSE                # MIT License
├── CHANGELOG.md           # Version history
└── CONTRIBUTING.md        # Contribution guide
```

## APIs Used

| Feature | API | Notes |
|---------|-----|-------|
| Translation | Google Translate (unofficial) | Free, rate-limited |
| Translation (fallback) | MyMemory API | 1000 words/day free |
| TTS | Web Speech API (`speechSynthesis`) | Browser built-in |
| Highlight | DOM + CSS | Custom implementation |

## Known Limitations

1. **Translation API** — Free APIs use kiye hain; heavy usage pe rate limit aa sakta hai
2. **Transliteration** — Basic character mapping; perfect nahi hai
3. **TTS Voice** — System ke Hindi voice pe depend karta hai
4. **Offline** — TTS offline kaam karta hai, translation nahi

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

[MIT License](LICENSE) — Free to use and modify.

---

**Built with ❤️ for Hinglish readers everywhere.**

*Extension ID: `{ddce04a4-76bc-4a2e-a00f-528af2658cf4}`*
