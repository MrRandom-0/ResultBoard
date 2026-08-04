# ResultBoard

ResultBoard turns Google Search results into a calm, local research board. Classify results as Keep, Maybe, or Rejected without leaving the search page, then review them in a side panel or full board.

## Features

- Unlimited local projects with archive and restore
- Keep, Maybe, and Reject controls on organic Google results
- Notes, rejection reasons, tags, filters, sorting, and keyboard navigation
- List, responsive grid, and weighted comparison views
- Per-result ratings for project-specific comparison criteria
- Complete JSON backups with merge or replace import
- Project export to CSV, JSON, Markdown, or standalone HTML
- Light/dark themes, accent colors, density, font size, and reduced motion
- Local-only production architecture with no account, billing, analytics, or cloud service

## Privacy

Saved result data and the associated search query stay in Chrome local extension storage. ResultBoard does not transmit them to ResultBoard servers. Read [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) and [PERMISSION_JUSTIFICATION.md](./PERMISSION_JUSTIFICATION.md).

## Install for development

Requirements: Node.js 20+ and Chrome 116+.

```bash
npm ci
npm run generate-icons
npm run check
npm run build
npm run zip
```

Load `.output/chrome-mv3` from `chrome://extensions` using Developer mode and **Load unpacked**. The packaged upload is written to `.output/resultboard-0.3.0-chrome.zip`.

## Development

```bash
npm run dev       # WXT development server
npm run typecheck # strict TypeScript
npm run lint      # ESLint
npm test          # Vitest unit tests
npm run test:e2e  # extension browser tests
npm run check     # typecheck + lint + unit tests
```

The project uses WXT, React, TypeScript, Zod, Vitest, and Playwright. Production UI entrypoints live under `entrypoints/`; reusable components, storage, models, and utilities live under `src/`.

## Release

Follow [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md), confirm every automated gate is green, test the unpacked build on a clean Chrome profile and live Google Search page, then use [WEBSTORE_SUBMISSION.md](./WEBSTORE_SUBMISSION.md) for the store form.

## License

[MIT](./LICENSE)
