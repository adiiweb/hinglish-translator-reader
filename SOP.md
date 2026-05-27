# Standard Operating Procedure (SOP)
## Hinglish Translator & Reader Firefox Extension

### 1. Purpose
Is SOP ka purpose hai ki extension ko consistently maintain, update aur deploy kiya ja sake.

### 2. Scope
- Bug fixes aur feature updates
- New Firefox versions ke saath compatibility
- User feedback ka handling
- Security updates

### 3. Development Workflow

#### 3.1 Local Development
```bash
# 1. Repo clone karo
git clone <repo-url>
cd hinglish-tts-extension

# 2. Firefox mein load karo
# about:debugging → This Firefox → Load Temporary Add-on → manifest.json

# 3. Changes karo aur Firefox reload karo
```

#### 3.2 Code Changes
- Har change ke baad `manifest.json` version bump karo (semver)
- Content script changes → Browser reload required
- Background script changes → Extension reload required
- Popup changes → Close-reopen popup

#### 3.3 Testing Checklist
- [ ] Translation works on: news sites, blogs, Wikipedia, GitHub
- [ ] TTS works with highlighting
- [ ] Click-to-read works from middle of page
- [ ] Restore original works
- [ ] Popup buttons responsive hain
- [ ] Context menu items work
- [ ] No console errors
- [ ] Memory leaks check (DevTools → Performance)

### 4. Release Process

#### 4.1 Version Bump
```json
// manifest.json
"version": "1.0.1"  // patch fix
"version": "1.1.0"  // new feature
"version": "2.0.0"  // breaking change
```

#### 4.2 Package
```bash
cd hinglish-tts-extension
zip -r ../hinglish-reader-v1.0.1.zip * -x "*.git*"
```

#### 4.3 Submit to AMO (addons.mozilla.org)
1. [addons.mozilla.org/developers](https://addons.mozilla.org/developers) pe login karo
2. "Submit a New Add-on" → "On your own"
3. ZIP file upload karo
4. Source code bhi upload karo (if minified/obfuscated)
5. Review notes mein changes likho
6. Submit karo → Review wait karo (usually 24-48 hours)

### 5. Monitoring & Maintenance

#### 5.1 Error Tracking
- Browser console errors collect karo
- User reports ko GitHub Issues mein track karo
- Critical bugs → immediate patch release

#### 5.2 API Monitoring
- Translation API rate limits monitor karo
- Fallback API ready rakho
- API downtime pe graceful degradation

#### 5.3 Firefox Compatibility
- Har major Firefox release ke baad test karo
- WebExtensions API changes track karo
- Manifest v3 migration plan ready rakho

### 6. Security

- [ ] No hardcoded API keys in source
- [ ] Content Security Policy (CSP) check
- [ ] No eval() or inline scripts
- [ ] Permissions minimum rakho
- [ ] Regular dependency audit

### 7. Rollback Plan

Agar new version mein critical bug hai:
1. Previous version ka ZIP ready rakho
2. AMO pe previous version re-enable karo
3. Users ko auto-update milega
4. Bug fix karo aur new version submit karo

### 8. Contact & Escalation

- **Level 1**: Developer fixes bug → Test → Release
- **Level 2**: API down → Switch to fallback → Notify users
- **Level 3**: Security issue → Immediate takedown → Patch → Re-release

---
**Document Version**: 1.0  
**Last Updated**: 2026-05-27  
**Next Review**: 2026-06-27
