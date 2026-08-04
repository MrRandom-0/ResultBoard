# ResultBoard Privacy Policy

Effective: August 2, 2026

ResultBoard is a local-first Chrome extension. This production build has no account, advertising, analytics, billing, telemetry, crash-reporting, or cloud-sync service.

## Data handled by the extension

When you use ResultBoard on Google Search, the extension reads the visible organic result cards and the current search query. If you classify a result, it stores the following in Chrome local extension storage:

- Project names and archive state
- Saved result titles, URLs, domains, snippets, and Keep/Maybe/Reject status
- The search query associated with a saved result
- Notes, rejection reasons, tags, comparison criteria, and ratings you add
- Extension preferences

This information is used only to provide ResultBoard's local organization, filtering, comparison, import, and export features.

## Data transmission and sharing

ResultBoard does not transmit this information to ResultBoard or third-party servers. It does not sell, share, or use user data for advertising, credit, lending, or personalized recommendations. Links you choose to open are handled by your browser and the destination website under their own policies.

## Storage, retention, and deletion

Data remains in `chrome.storage.local` until you delete it in ResultBoard Settings, remove individual items, clear the extension's storage, or uninstall the extension. Full JSON backups and project exports are created only when you request them and are saved through Chrome's download flow.

## Permissions

ResultBoard runs its content script only on Google Search result pages. The `storage`, `sidePanel`, `contextMenus`, and command manifest features support local data, the board interface, and user-invoked shortcuts. See `PERMISSION_JUSTIFICATION.md` for details.

## Security

The extension validates imported data and extension messages. No system can guarantee absolute security, so users should protect exported backup files as they would other research documents.

## Children

ResultBoard is a general productivity tool and is not directed to children under 13. Because no account or server collection exists, ResultBoard cannot identify a user's age.

## Changes

Material policy changes will be published with an extension update before new data practices take effect.

## Contact

For privacy or support questions, use the ResultBoard repository's issue tracker and do not include private research data: https://github.com/clicklinc/ResultBoard/issues
