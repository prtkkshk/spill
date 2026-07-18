---
description: Verify the current phase's Definition of Done before marking it complete (QA persona).
---

1. Adopt the QA Engineer persona. Open the current phase's DoD in `project_plan.md`.
2. For each DoD bullet, run the concrete check and record PASS / FAIL with evidence:
   - Backend phases: `curl` the routes against `npm run dev`; confirm rows created, grouping
     correct, `PATCH` flips status, and that JSON parse failures are **logged, not thrown**.
   - Recorder: record on a supporting browser, confirm live timer, correct MIME on the blob,
     auto-stop at the cap, and helpful denied-permission / unsupported states.
   - Task list: tasks render in three groups, optimistic check persists across reload, failed
     `PATCH` rolls back, empty state renders.
   - PWA: run `/pwa-audit` (Lighthouse installable, manifest valid, SW registered, offline shell).
   - Reminders: subscription stored on first visit; cron sends push with the secret and 401s
     without it; in-app pending badge works regardless of push support.
3. Re-run the Gemini golden set (`gemini-golden-set` skill) if anything touched the prompt or parser.
4. If any check FAILS, do not mark the phase done — keep it in progress and fix, or file a
   follow-up task describing the blocker.
5. Report the full checklist result to the human before closing the phase.
