---
name: pwa-audit
description: Verify FocusFlow's PWA installability and mobile behavior — manifest, service worker, iOS audio + push caveats. Use before marking Phase 4 or Phase 5 done, or before a deploy.
---

# PWA / Mobile Audit

## When to use this
Before closing Phase 4 (PWA polish) or Phase 5 (reminders), and before any production deploy
that touches the app shell, manifest, or push.

## Steps
1. Confirm `public/manifest.json` has: name, icons at 192 and 512, `display: standalone`, and
   a theme color. Validate it parses and is linked from the document head.
2. Confirm a service worker registers and caches the app shell so it loads offline.
3. Run Lighthouse's PWA checks; installable + valid manifest + registered SW should pass.
4. **iOS audio:** verify the MIME feature-detect falls back to `audio/mp4` on iOS Safari. If
   recording fails on iPhone but works on desktop/Android, suspect the MIME type first.
5. **iOS Web Push:** it only fires when the site is **installed to the home screen** (iOS
   16.4+), not when merely open in a tab. Confirm the in-app pending badge fallback works so
   the app is useful even without push.
6. 🧑 Real-device checks the agent cannot do: "Add to Home Screen" from iOS Safari, confirming
   the installed app opens full-screen without Safari chrome, and granting mic permission on a
   physical phone. Flag these for the human and pause.

## Conventions to follow
- Feature-detection over user-agent sniffing for every browser quirk.
- Degrade gracefully: unsupported browser, denied mic, and no-push all show helpful UI, never a crash.
