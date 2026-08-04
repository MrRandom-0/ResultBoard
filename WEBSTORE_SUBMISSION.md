# Chrome Web Store Submission

Use this file as a form-filling checklist. Reconfirm the wording against the current Developer Dashboard before submission.

## Package

- Upload: `.output/resultboard-0.3.0-chrome.zip`
- Manifest: V3
- Version: 0.3.0
- Minimum Chrome: 116
- Category: Productivity
- Language: English
- In-app purchases: No

Use the copy in [STORE_LISTING.md](./STORE_LISTING.md).

## Privacy practices

Single purpose: organize organic Google Search results in a local research board.

Disclose that the extension handles:

- Website content: result titles, URLs, domains, and snippets selected by the user
- Web/search activity: the current Google Search query associated with a saved result
- User-generated content: project names, notes, rejection reasons, tags, criteria, and ratings

Purpose: core user-facing functionality only.

Data behavior:

- Sold: No
- Used for advertising: No
- Used for credit/lending: No
- Transmitted off device by the extension: No
- Stored locally: Yes, in `chrome.storage.local`
- Optional export: only when the user invokes an export or backup action
- Account/authentication data: No
- Analytics or crash reporting: No

The privacy policy URL must be a stable public HTTPS page containing the exact text of [PRIVACY_POLICY.md](./PRIVACY_POLICY.md). Do not submit with a temporary or inaccessible URL.

## Permission explanations

Copy the matching explanations from [PERMISSION_JUSTIFICATION.md](./PERMISSION_JUSTIFICATION.md). The context menu opens the side panel; it does not classify a clicked link.

## Assets

- `store-assets/small-tile.png` — 440 x 280
- `store-assets/marquee.png` — 1400 x 560
- `store-assets/screenshot-1.png` to `screenshot-5.png` — 1280 x 800

## Final review

- All checks in [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) pass
- Listing claims match the submitted ZIP
- Screenshots come from the submitted build
- Support URL works and warns against sharing private data
- Privacy policy is publicly reachable without sign-in
- No test, source-map, store-marketing, secret, admin configuration, or backend credential file is present in the ZIP
