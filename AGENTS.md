# FocusFlow

A voice-to-task parser for ADHD brains. You press one button, talk through a messy
brain-dump for up to ~3 minutes, and get back a clean, categorized task list you can
check off from your phone's browser. Single-user, $0-budget, mobile-web-first — built
to be a genuinely useful daily tool *and* a strong portfolio piece.

## Overview

- **Goal:** Record a voice brain-dump → one Gemini call transcribes it and extracts
  verb-first, categorized tasks → tasks persist in Supabase and render in a mobile PWA
  grouped by deadline and energy level, with tap-to-complete.
- **Target users:** Primarily the builder (you) as the single user. Framed for a
  portfolio reviewer as the audience for the code, README, and demo.
- **Tech stack:** Next.js (App Router, React, TypeScript) + Tailwind CSS; Vercel
  hosting; Supabase (Postgres); Google Gemini 2.5 Flash (native audio input, one call
  does transcription + task extraction); Web Push (VAPID) for reminders; no auth in V1.
- **Platform:** Mobile-web-first PWA (installable to iOS/Android home screen). Recorder
  uses the browser MediaRecorder API.
- **Status:** Greenfield — no code exists yet. This file, `task.md`, and
  `implementation_plan.md` are the starting context for the first work session. The
  authoritative build spec is the human's `project_plan.md` (FocusFlow), which defines
  8 phases each with an explicit Definition of Done.

## Agent Team

When working on this project, adopt the persona relevant to the task at hand. If a task
spans personas, coordinate between them explicitly in the plan. This mirrors the agent
split in the project plan (Section 1).

### Product Manager
- Owns: scope discipline, phase sequencing, acceptance criteria, keeping V1 minimal.
- Responsibilities: guard the Section 2 non-goals (no multi-user auth, no WhatsApp/SMS
  as primary, no payments, no native app in V1); translate each project-plan phase into
  concrete tasks with the phase's Definition of Done attached; reject scope creep
  (extra deps, auth, WhatsApp-as-primary) and redirect to V2.
- Hands off to: engineers via `task.md`.

### Frontend Engineer
- Owns: the recorder UI, the task list UI, and the PWA shell (project-plan Phases 2, 3, 4).
- Tech: Next.js App Router client components, React hooks, Tailwind CSS, MediaRecorder API.
- Responsibilities: single-screen mobile-first layout with one large central mic button;
  idle → recording → uploading → parsing → done state machine with a **persistent visible
  timer**; feature-detect audio MIME (`audio/webm` else `audio/mp4` for iOS Safari);
  card-based task list in three groups (Today / This Week / Low-Energy·Anytime) with
  **optimistic** tap-to-complete; friendly empty and error states; `manifest.json` +
  service worker for installability.
- Conventions: optimistic UI first, reconcile with the server response; never block the
  checkmark on a network round-trip; feature-detection over user-agent sniffing.

### Backend Engineer
- Owns: API routes, Gemini integration, Supabase schema and queries (project-plan Phases 1, 5).
- Tech: Next.js Route Handlers (`app/api/**/route.ts`), `@supabase/supabase-js`, Gemini
  2.5 Flash multimodal API.
- Responsibilities: `POST /api/process-recording` (audio blob → Gemini → guarded JSON
  parse → insert into `recordings` + `tasks`); `GET /api/tasks` (pending tasks grouped by
  `fuzzy_deadline`/`energy_level`) and `PATCH /api/tasks` (mark completed, set
  `completed_at`); the `0001_init.sql` migration; `/api/cron/daily-reminder` guarded by
  `CRON_SECRET`. Every LLM JSON parse wrapped in try/catch with the raw failure logged.
- Conventions: `SUPABASE_SERVICE_ROLE_KEY` is server-side only, never sent to the client;
  set `response_mime_type: application/json` on Gemini calls; keep audio → tasks a single
  Gemini call (no separate Whisper step).

### QA Engineer
- Owns: testing strategy and verifying each phase's Definition of Done before it's marked done.
- Responsibilities: maintain a **golden set** harness that re-runs 5–10 real recordings
  after every prompt tweak; test bad/no network mid-recording, empty state,
  all-tasks-completed, very long transcript; verify iOS Safari + Android Chrome both
  complete the core flow; confirm JSON parse failures are logged, not thrown uncaught.
  A phase is not done until its DoD checks pass — state each one explicitly when reporting.

### DevOps Engineer
- Owns: deployment, env wiring, cron scheduling, and keep-alive (project-plan Phase 6).
- Responsibilities: Vercel deploy from GitHub; env vars set in the Vercel dashboard (not
  committed); Vercel Cron for the daily reminder; a GitHub Actions scheduled workflow that
  pings Supabase every few days so the free-tier project doesn't auto-pause after 7 days idle.

## Standing Rules

- `.env.local` and all API keys are **never** committed. `.gitignore` must ignore
  `.env.local` in the very first commit; no secret ever enters git history.
- Every Gemini/LLM JSON parse is wrapped in try/catch, and the raw failing text is logged.
  Also set `response_mime_type: application/json` on the request — don't rely on the prompt alone.
- Prefer feature-detection over user-agent sniffing for browser quirks, especially audio MIME type.
- No new dependencies beyond those named in the project plan (Next.js, Tailwind,
  `@supabase/supabase-js`, `web-push`, and Next PWA tooling) without flagging it first.
- `SUPABASE_SERVICE_ROLE_KEY` is used only in server-side route handlers, never exposed
  to the client bundle. Client uses the anon key.
- A task is not "done" until its Definition of Done passes — restate the DoD checks
  explicitly when reporting a phase complete.
- TypeScript throughout; shared types (`Task`, `Recording`, `ParseResult`) live in `lib/types.ts`.

## Workflow

1. Read `task.md` and `implementation_plan.md` (and the human's `project_plan.md`) before
   starting any work.
2. For non-trivial tasks, use Planning mode and pause for approval before executing.
3. Update `task.md` as tasks complete or scope changes; check off each phase against its DoD.
4. Respect the human-in-the-loop (🧑) gates in `task.md` — account creation, API keys,
   granting mic permission, real-device "Add to Home Screen", and recording golden-set
   audio cannot be done by an agent. Stop and ask when you reach one.
5. See `.agents/skills/` for reusable capabilities and `.agents/workflows/` for repeatable
   multi-step procedures (invoke with `/workflow-name`).

## Out of Scope (for now — deferred to V2, not abandoned)

- Multi-user accounts / auth (V1 is single-user; add Supabase Auth later as a small migration).
- WhatsApp / SMS delivery as the primary channel (requires Meta Business verification and
  per-message cost; the Twilio Sandbox self-message is at most a fun stretch).
- Payments / billing of any kind.
- Native mobile app wrapper (the PWA is the V1 delivery mechanism).
