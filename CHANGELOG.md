# Changelog

## [1.1.1] - 2026-05-27

### Added
- AMO compatibility: `browser_specific_settings` with `data_collection_permissions`
- Firefox 140+ minimum version support
- Android compatibility (Firefox 142+)

### Fixed
- Unicode delimiter for Google Translate API (replaced `---SPLIT---`)
- Proportional fallback text splitting
- Voice loading race-condition (10 retries)
- Context menu duplicate errors
- Popup error handling with user-friendly messages
- SPA MutationObserver for dynamic content
- DOM traversal blacklist (textarea, input, code blocks)
- Invisible node filtering
- Highlight whitespace preservation
- Toast z-index maxed to prevent hiding
- Stale DOM reference handling
- Fetch timeouts (8s Google, 5s MyMemory)
- Async message listener response leaks

## [1.1.0] - 2026-05-27

### Added
- Voice speed control (0.5x - 1.5x)
- Voice pitch control (0.5 - 1.5)
- Voice dropdown with auto-detection
- Hindi voice prioritization
- Settings auto-save to browser storage
- Keyboard shortcuts (Ctrl+Shift+T/R/S)

## [1.0.0] - 2026-05-27

### Added
- Initial release
- Webpage translation to Hinglish (Roman script)
- Text-to-Speech with Web Speech API
- Real-time highlighting during TTS
- Click-to-read from any point
- Popup UI with controls
- Context menu integration
