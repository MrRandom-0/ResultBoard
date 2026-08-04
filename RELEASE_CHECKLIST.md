# ResultBoard Release Checklist

## Automated gates

```bash
npm ci
npm run generate-icons
npm run check
npm run test:e2e
npm run build
npm run zip
```

- `git diff --check` passes
- `npm audit` is reviewed; no production-runtime vulnerability is accepted without documentation
- Generated manifest is MV3, version 0.3.0, and minimum Chrome 116
- ZIP contains no secrets, source maps, tests, store-marketing assets, or runtime admin configuration

## Manual extension QA

- Install `.output/chrome-mv3` in a clean Chrome profile
- First install opens onboarding once
- Create, rename, switch, archive, and restore projects
- Classify and undo Keep, Maybe, and Reject on live Google Search
- Pause removes injected controls and resumes cleanly
- Popup, side panel, and full board stay synchronized
- Notes, tags, filters, status changes, and removal persist
- Select results without a mouse modifier and compare them
- Create criteria, rate results, and confirm weighted scores
- Full backup imports in both merge and replace modes
- CSV, project JSON, Markdown, and HTML exports open correctly
- Light, dark, system, font, accent, density, and reduced-motion settings apply across all extension pages
- Keyboard commands and configurable content shortcuts work
- Screen-reader labels, keyboard focus, Escape-to-close, contrast, and narrow layouts are reviewed

## Store QA

- Listing and privacy disclosures match actual behavior
- Privacy policy is hosted at a stable HTTPS URL
- Screenshots are captured from this exact build
- Support link works
- Upload `.output/resultboard-0.3.0-chrome.zip`

Record the commit SHA, ZIP SHA-256, Chrome version, OS, and reviewer in the release notes.
