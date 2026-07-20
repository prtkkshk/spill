# Next.js + Frontend Conventions

FocusFlow is App Router. These are the non-obvious project rules; follow them over generic habits.

## Recorder (the core interaction)
- One large central mic button, single screen, nothing competing for attention. Friction
  here defeats the whole product.
- Capture with `navigator.mediaDevices.getUserMedia({ audio: true })` + `MediaRecorder`.
- **iOS Safari does not support `audio/webm`.** Feature-detect, never user-agent sniff:
  ```js
  const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
  ```
- Explicit state machine: `idle → recording → uploading → parsing → done` (plus `error`).
- The recording timer must be **visible and persistent** while recording — users need
  elapsed time on screen, not hidden.
- Cap recording client-side at ~3 minutes; auto-stop at the cap to keep Gemini calls fast/cheap.
- Show a plain-language explanation of *why* the mic is needed **before** the OS permission
  dialog, so users don't reflexively deny it. Denied-permission and unsupported-browser
  states render a helpful message, never a crash.

## Task list
- Card-based, grouped into exactly three sections: **Today**, **This Week**,
  **Low-Energy / Anytime** (derived from `fuzzy_deadline` + `energy_level`).
- Tap-to-complete is **optimistic**: flip the checkmark immediately in local state, fire the
  `PATCH`, and roll back if it fails. Never wait on the network to show the check.
- Empty state is encouraging, not a dead end: e.g. "Nothing pending. Go brain-dump something."
- Auto-refresh the list after a new recording finishes parsing.

## PWA
- `public/manifest.json`: name, icons at 192 and 512, `display: standalone`, theme color.
- Minimal service worker for app-shell offline caching (Next PWA tooling handles most of it).
- "Add to Home Screen" works from iOS **Safari only** (not Chrome-on-iOS) and can't be
  triggered programmatically — provide instructions, don't try to automate it.

## Styling
- Tailwind utility classes only; mobile-first breakpoints. Large tap targets, high contrast,
  minimal visual noise.
