# Permission Justification

ResultBoard requests only the capabilities needed for its single purpose: organizing Google Search results in a local research board.

| Capability | Why it is needed |
| --- | --- |
| `storage` | Stores projects, saved results, query context, notes, tags, criteria, ratings, and preferences locally. |
| `sidePanel` | Shows the primary board beside Google Search without navigating away. |
| `contextMenus` | Adds one user-invoked “Open ResultBoard side panel” item on Google Search pages. |
| `commands` manifest entries | Provides user-configurable shortcuts for the side panel, full board, and pause/resume control. |
| Content script on `https://www.google.com/search*` | Reads organic result cards and the current query, injects classification controls, and reflects saved status. It does not run on unrelated pages. |

No broad host permission, cookies, history, tabs permission, identity, downloads, notifications, unlimited storage, or remotely hosted code is requested. Creating a tab and opening extension pages use Chrome APIs that do not require the broad `tabs` permission.

The content script does not alter search ranking, click ads, or transmit page content. It reads and stores a result only as needed for the user-facing workflow described in the listing and privacy policy.
