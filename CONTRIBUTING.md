# Contributing to Hinglish Translator & Reader

## Getting Started

1. Fork the repo
2. Clone locally: `git clone https://github.com/YOUR_USERNAME/hinglish-translator-reader.git`
3. Load in Firefox: `about:debugging` → This Firefox → Load Temporary Add-on → `manifest.json`

## Development Workflow

```bash
# Make changes to JS/CSS files
# Test in Firefox (reload extension after changes)
# Commit with clear message
git add .
git commit -m "fix: description of fix"
```

## Code Style

- Use single quotes for strings
- 2-space indentation
- JSDoc comments for functions
- Handle all errors with try/catch

## Pull Request Process

1. Update version in `manifest.json` (semver)
2. Update `CHANGELOG.md`
3. Ensure no console errors
4. Submit PR with description

## Reporting Bugs

Open an issue with:
- Firefox version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
