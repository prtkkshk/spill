# Task List: FocusFlow — MVP (project-plan Phases 0–8)

Owners map to the personas in `AGENTS.md`. 🧑 = human-in-the-loop step an agent cannot do.
Each milestone closes only when its Definition of Done (see `project_plan.md`) passes.

## Milestone: Phase 0 — Accounts & Scaffold
- [x] 🧑 Create Google AI Studio account → generate Gemini API key — owner: Human
- [x] 🧑 Create Supabase project → note URL + anon key + service role key — owner: Human
- [x] 🧑 Create Vercel account, connect GitHub; create public GitHub repo — owner: Human
- [x] `npx create-next-app@latest` with Tailwind + TypeScript — owner: DevOps
- [x] `npm install @supabase/supabase-js`; create `.env.local`; confirm `.gitignore` ignores it in first commit — owner: DevOps
- **DoD:** repo builds locally (`npm run dev`); `.env.local` git-ignored with all keys; first commit pushed with no secrets in history.

## Milestone: Phase 1 — Database & Backend Skeleton
- [x] 🧑 Run `supabase/migrations/0001_init.sql` in Supabase SQL editor — owner: Human (authored by Backend, see supabase-migration skill)
- [x] Build `POST /api/process-recording` (audio → Gemini → guarded parse → insert recordings + tasks) — owner: Backend
- [x] Build `GET /api/tasks` (grouped) and `PATCH /api/tasks` (complete) — owner: Backend
- [x] Test both routes with a sample audio file via `curl`/script before any frontend — owner: Backend
- **DoD:** sample audio POST returns valid JSON and creates rows in both tables; GET returns them grouped; PATCH flips to completed; JSON parse failures logged, not thrown.

## Milestone: Phase 2 — Voice Recorder UI
- [x] Single-screen mobile-first layout, one large central mic button — owner: Frontend
- [x] MediaRecorder capture with `audio/webm`→`audio/mp4` feature-detect fallback — owner: Frontend
- [x] State machine idle→recording→uploading→parsing→done with persistent visible timer — owner: Frontend
- [x] ~3 min client-side cap with auto-stop; graceful mic-permission + unsupported-browser states — owner: Frontend
- [x] 🧑 Grant mic permission when testing on a real device — owner: Human
- **DoD:** can record, see live time, blob reaches API with correct MIME; auto-stops at cap; denied/unsupported states show a message, not a crash.

## Milestone: Phase 3 — Task List UI
- [x] Card list grouped: Today / This Week / Low-Energy·Anytime — owner: Frontend
- [x] Optimistic tap-to-complete, reconcile with PATCH, roll back on failure — owner: Frontend
- [x] Encouraging empty state; auto-refresh after a new recording — owner: Frontend
- **DoD:** tasks render in three groups; tapping checks off instantly and persists across reload; failed PATCH rolls back; empty state renders.

## Milestone: Phase 4 — PWA / Mobile Polish
- [x] `public/manifest.json` (icons 192/512, standalone, theme color) — owner: Frontend
- [x] Minimal service worker for app-shell offline caching — owner: Frontend
- [x] 🧑 Test "Add to Home Screen" on a real iPhone (Safari only); confirm full-screen — owner: Human
- **DoD:** Lighthouse PWA checks pass; app shell loads offline; home-screen install opens standalone on a real iPhone.

## Milestone: Phase 5 — Reminders (Web Push)
- [x] 🧑 Generate VAPID keys (`web-push generate-vapid-keys`); add to env — owner: Human
- [x] Store subscription in `push_subscriptions` on first visit — owner: Backend
- [x] `POST /api/cron/daily-reminder` guarded by `CRON_SECRET`; wire Vercel Cron — owner: Backend/DevOps
- [x] In-app pending badge fallback (iOS push needs home-screen install, 16.4+) — owner: Frontend
- **DoD:** subscription stored on first visit; cron sends push with the secret and 401s without it; pending badge works regardless of push support.

## Milestone: Phase 6 — Deployment
- [x] Push to GitHub; 🧑 connect repo to Vercel and add env vars in dashboard — owner: DevOps + Human
- [x] 🧑 Deploy and test the live URL end-to-end on a real phone — owner: Human
- [x] GitHub Actions keep-alive workflow pinging Supabase every few days — owner: DevOps
- **DoD:** live HTTPS URL serves the app; full record→parse→list works on a real phone against prod env; keep-alive committed and scheduled.

## Milestone: Phase 7 — Testing Pass
- [x] 🧑 Record a genuinely messy ADHD-style ramble; confirm the parser holds up — owner: Human
- [x] 🧑 Test on iOS Safari and Android Chrome — owner: Human
- [x] Test no-network mid-recording, empty state, all-completed, very long transcript — owner: QA
- **DoD:** golden-set recordings parse acceptably; both mobile browsers complete the core flow; edge cases degrade gracefully with no uncaught errors.

## Milestone: Phase 8 — Portfolio Packaging
- [x] Write `README.md`: problem, architecture diagram, tech choices + why, tradeoffs — owner: PM/Frontend
- [x] 🧑 Record a 60–90s screen-capture demo (talking → parsed list) — owner: Human
- [x] README notes the crowded space honestly and frames this as a portfolio/learning build — owner: PM
- **DoD:** README covers problem, architecture, tradeoffs; demo clip linked; repo public and clean (no secrets, no dead scaffolding).

## Milestone: Phase 9 — Text Quick-Add Input
- [x] Add POST/insert endpoint to `/api/tasks` — owner: Backend
- [x] Build glassmorphic text input field on main page — owner: Frontend
- [x] Support optimistic append and list auto-refresh — owner: Frontend
- **DoD:** Submitting text through the input field successfully creates a task in Supabase; it defaults to today/low-focus; page auto-refreshes to display it.

## Milestone: Phase 10 — Inline Card Edit & Delete
- [x] Extend `/api/tasks` to support PATCH (description, fuzzy_deadline, energy_level) and DELETE (id) — owner: Backend
- [x] Add inline pencil/edit and trash/delete buttons on task cards — owner: Frontend
- **DoD:** Tapping edit turns the card into an input, saving updates to the database; tapping delete removes the card with scaling/sliding transitions; all mutations are optimistic and smooth.

## Milestone: Phase 11 — Dynamic Rollover (Overdue Section)
- [x] Calculate relative "Overdue Today" group on GET `/api/tasks` using current date — owner: Backend
- [x] Render a red-tint alert banner section for overdue tasks at the top of list — owner: Frontend
- **DoD:** Pending tasks created on past days are grouped into a dedicated "Overdue" section with distinct styling.

## Milestone: Phase 12 — Collapsible Completed Tasks List & Undo
- [x] Query and return completed tasks (limited to 10) in GET `/api/tasks` — owner: Backend
- [x] Add a collapsible "Recently Completed" list container at bottom of task feed — owner: Frontend
- [x] Support undoing task completion (PATCH back to pending) — owner: Frontend
- **DoD:** Tapping complete moves task to Completed Today list; tapping it again restores it to pending in the DB and UI.

## Milestone: Phase 13 — Share List via Web Share API
- [ ] Add share button to header that compiles markdown formatted list — owner: Frontend
- [ ] Invoke `navigator.share()` or fallback to clipboard copy — owner: Frontend
- **DoD:** Tapping share outputs a clean markdown list of pending tasks to the mobile share menu or clipboard.

## Definition of Done (MVP, project-level)
- A live URL, openable on a phone, that turns a real messy voice thought into a clean,
  correctly-categorized task list within a few seconds.
- Public GitHub repo with a README that explains the thinking, not just the code.
- No WhatsApp, no auth, no monthly bill. Every phase above has passed its DoD.
