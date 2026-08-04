# ResultBoard Architecture

## Product boundary

ResultBoard 0.3 is a local-only Chrome MV3 extension. It has no backend, account, billing, analytics, telemetry, remote error reporting, or remotely hosted code. Future hosted features belong in a separately deployed and audited backend package; they must not be simulated with extension-side secrets or mutable local entitlements.

## Runtime

- `entrypoints/background.ts` owns validated runtime messages, local repository mutations, commands, onboarding, the context-menu action, and startup auto-archive.
- `entrypoints/google.content/` parses organic Google result cards, injects isolated classification controls, and mirrors local state.
- `entrypoints/popup/` provides quick status and navigation.
- `entrypoints/sidepanel/` is the compact primary board.
- `entrypoints/board/` is the responsive full workspace.
- `entrypoints/options/` controls appearance, behavior, criteria, shortcuts, privacy, backup, import, and deletion.
- `entrypoints/onboarding/` is opened after first install.

## Data flow

All mutations go through `ResultBoardRepository`, whose promise queue serializes read-modify-write operations against `chrome.storage.local`. Runtime messages are validated with Zod. React pages refresh after their own dispatches and listen only for the `resultboard.database` storage key, keeping popup, options, board, side panel, and content script consistent.

The persisted database is versioned. Migrations normalize legacy dates, add rejection reasons and comparison data, add per-criterion scores, and remove obsolete cloud-era settings. Imports run through the same migration and validation path.

## Data model

- Projects: local research topics with active/archive state and activity timestamps
- Records: saved search results, classification, notes, tags, source-query context, and criterion ratings
- Tags: project-scoped labels
- Comparison criteria: project-scoped names and weights
- Settings: appearance, Google behavior, shortcuts, auto-archive, and result warning threshold

## Trust boundaries

- Content-script input and imported JSON are untrusted.
- Extension messages are parsed before repository calls.
- Exported HTML escapes content and uses `noopener noreferrer`.
- CSV neutralizes formula-leading cells.
- The extension requests no broad host permission and runs its content script only on Google Search pages.
- No private keys or webhook secrets are accepted at runtime.

## Verification

`npm run check` must pass strict production TypeScript, ESLint, and Vitest. `npm run test:e2e` builds and exercises the real unpacked extension. `npm run build:prod` repeats gates, validates output size/manifest/logging, and produces the ZIP.
