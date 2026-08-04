# Chrome Web Store Review Notes

ResultBoard is a Manifest V3, local-only productivity extension.

## Reproduction

1. Install the extension and complete onboarding.
2. Create a project from the popup, side panel, or full board.
3. Open `https://www.google.com/search?q=research`.
4. Use Keep, Maybe, or Reject on an organic result.
5. Open the side panel to view the locally saved record.

## Data behavior

The Google Search content script reads visible organic result cards and the current `q` query. These values are stored only after the user classifies a result and remain in `chrome.storage.local`. The production background does not initialize network, authentication, payment, analytics, telemetry, or error-reporting services.

## User interfaces

- Toolbar action: small status popup with side-panel and full-board actions
- Side panel: primary compact board
- Full board: responsive project and comparison workspace
- Options: appearance, behavior, criteria, keyboard, privacy, import, export, and deletion
- Onboarding: first-install introduction

The context-menu item opens the side panel. `Alt+Shift+R` opens the full board. `Alt+Shift+K` toggles Google integration pause/resume. Chrome handles the reserved side-panel command.
