# Implementation Plan: FocusFlow

## Objective
Build a single-user, $0-budget, mobile-web-first tool where you press one button, speak a
messy brain-dump for up to ~3 minutes, and get back a clean, categorized, checkable task
list within a few seconds. One Gemini 2.5 Flash call transcribes the audio and extracts
verb-first tasks (tagged by fuzzy deadline and energy level); tasks persist in Supabase and
render in a mobile PWA. The deliverable is both a genuinely useful daily tool and a portfolio
piece with a live URL, a public repo, and a short demo.

## Architecture
```
[Phone browser: one Record button]
      │  MediaRecorder captures an audio blob (audio/webm, or audio/mp4 on iOS Safari)
      ▼
[POST /api/process-recording]  (Next.js Route Handler)
      │  sends audio inline to Gemini (multimodal); response_mime_type = application/json
      ▼
[Gemini 2.5 Flash]  → single call: transcribe + extract tasks → strict JSON (guarded parse)
      ▼
[Supabase Postgres]  → insert into `recordings`, then `tasks` (FK order matters)
      ▼
[Task list UI]  ← GET /api/tasks, grouped by fuzzy_deadline / energy_level; optimistic PATCH to complete
      │
      ▼
[Optional Web Push]  ← /api/cron/daily-reminder (Vercel Cron, CRON_SECRET-guarded) pushes today's count
```
Stack: Next.js (App Router, TS) + Tailwind on Vercel; Supabase Postgres; Gemini 2.5 Flash;
Web Push via VAPID; no auth in V1. One Gemini call replaces the original spec's Whisper→Gemini
split — simpler, cheaper, one less failure point.

## Approach
Follow the phases in `task.md` (mirroring `project_plan.md`), mostly sequential; Phase 5
(reminders) and much of Phase 8 (packaging) can run in parallel once Phase 3 is green.
1. **Phase 0** — 🧑 accounts + keys, then scaffold Next.js/Tailwind/TS, wire `.env.local`, first clean commit.
2. **Phase 1** — schema migration + backend routes; test with `curl` before any UI.
3. **Phases 2–3** — recorder UI (the core, friction-free interaction), then the grouped task list with optimistic completion.
4. **Phase 4** — manifest + service worker; 🧑 real-device install check.
5. **Phase 5** — Web Push subscription + guarded cron + in-app pending badge fallback.
6. **Phase 6** — deploy to Vercel, prod env vars, Supabase keep-alive; 🧑 real-phone end-to-end test.
7. **Phase 7** — QA edge cases + golden-set parse quality on both mobile browsers.
8. **Phase 8** — README (problem, architecture, tradeoffs) + demo clip; frame as a portfolio build.
Each phase is worked with the `ship-phase` workflow and closed only after `verify-dod` passes.

## Open Questions / Decisions Needed
These were assumed by the `agy` setup where the plan left room — confirm or adjust:
- **Reminders in V1 scope.** You chose "Full V1," so Phase 5 (Web Push) is included as a
  first-class milestone rather than deferred. The Twilio WhatsApp Sandbox remains a stretch,
  not part of V1.
- **Access gate.** The plan mentions "no auth OR a simple password gate." Assumption: no gate
  at all for V1 (single user, unlisted URL). Add a simple shared-secret gate later if the URL
  will be shared.
- **Icon assets.** PWA needs 192/512 icons — no source art specified. Assumption: generate
  simple placeholder icons during Phase 4; swap for real art before the portfolio demo.
- **Golden-set audio.** Only you can record the 5–10 real brain-dumps. The harness will be
  built in Phase 1/2; flag when it's ready so you can supply recordings.

## Risks
- **Prompt tuning eats time.** Mapping fuzzy human speech to clean verb-first tasks takes
  several rounds against *real* recordings. Mitigation: the golden-set harness + budget slack in Phases 1/2.
- **iOS audio MIME mismatch** — the most likely early bug. If recording fails on iPhone but
  works elsewhere, check the MIME type first (feature-detect fallback to `audio/mp4`).
- **iOS Web Push only fires when installed to the home screen** (16.4+). Mitigation: in-app
  pending badge so the app is useful without push.
- **Supabase free-tier auto-pause after 7 days idle.** Mitigation: GitHub Actions keep-alive (Phase 6).
- **Gemini occasional malformed JSON** despite `response_mime_type`. Mitigation: guarded parse + raw logging everywhere.
- **Agent scope drift** — if an agent proposes auth, extra deps, or WhatsApp-as-primary, that's
  out of V1 scope; the PM persona rejects and redirects to V2.
