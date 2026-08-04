# Changelog

## 0.3.0 - 2026-08-02

### Added

- Responsive full-board UI and polished side-panel, popup, settings, and onboarding flows
- Unlimited local projects with archive/restore
- Accessible result selection and up-to-four-result comparison
- Project-specific weighted criteria with per-result 0-5 ratings
- Full JSON backup plus merge/replace import
- CSV, project JSON, Markdown, and standalone HTML exports
- Theme, accent, font-size, density, animation, auto-archive, and result-count preferences
- Working manifest commands and first-install onboarding

### Fixed

- Live state refresh across extension pages and the Google content script
- Google redirect URL parsing and multi-domain Google host handling
- Pause/resume cleanup, configurable modifier shortcuts, and result warning delivery
- Serialized import/delete mutations and project activity timestamps
- Legacy date migration and database schema evolution
- CSV formula injection, exported HTML opener isolation, and Markdown escaping
- Typecheck, ESLint, Vitest, Playwright ESM, and production build scripts

### Security and privacy

- Removed unfinished account, cloud sync, billing, analytics, remote error reporting, paywall, runtime admin, endpoint override, and client-side secret surfaces
- Reduced the release to truthful local-only behavior and minimum permissions
- Moved Web Store marketing assets outside the extension package
- Consolidated privacy, store disclosure, review, architecture, and release documentation
