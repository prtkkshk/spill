# FocusFlow — Project Plan (Google Antigravity build)
### Voice-to-Task Parser for Capturing Tasks On the Go — Portfolio Build, $0 Budget, Mobile-Web-First

---

## 0. What This Document Is

This is the build plan for a **scoped-down, personal-use version** of FocusFlow: you record a voice brain-dump, an AI turns it into a categorized task list, and you check it off from your phone's browser. No WhatsApp production setup, no multi-user auth, no monthly cost. Built to be a genuinely useful daily tool *and* a strong portfolio piece.

**Why this scope, not the original spec's scope:** the original spec assumed a multi-user SaaS with WhatsApp delivery. That requires Meta Business verification (days of lead time, real per-message costs at scale) and adds auth complexity you don't need if you're the only user. Cutting those means you can build something that actually works, actually ships, and costs nothing — and you can always add them back later as "V2" stretch goals (see Section 12).

This version of the plan is written to be **executed by agents inside Google Antigravity**. Each build phase (Section 7) is framed as a discrete agent task with an explicit, verifiable **Definition of Done (DoD)**, so an agent can self-check before moving on and you can review at clean checkpoints.

---

## 1. How to Run This in Google Antigravity

**Execution model.** Treat each phase in Section 7 as one agent task. Point the agent at this file, have it work a phase to its DoD, then pause for your review before the next. Phases 1→6 are mostly sequential; Phase 5 (reminders) and much of Phase 8 (packaging) can run in parallel once Phase 3 is green.

**Suggested agent split** (optional — you can also run one generalist agent):

| Role | Owns |
|---|---|
| Backend agent | API routes, Gemini integration, Supabase schema + queries (Phases 1, 5) |
| Frontend agent | Recorder UI, task list, PWA shell (Phases 2, 3, 4) |
| DevOps agent | Deploy, env wiring, cron, keep-alive (Phase 6) |
| QA agent | Test pass, edge cases, verifying each phase's DoD (Phase 7) |

**Human-in-the-loop gates (🧑).** Agents cannot do these — the plan flags each one inline. Do them yourself when the agent reaches that step:
- Creating accounts (Google AI Studio, Supabase, Vercel, GitHub) and generating API keys
- Approving anything that asks for a card or billing consent (nothing here should)
- Granting microphone permission on a real phone
- "Add to Home Screen" on a physical iPhone (can't be triggered programmatically)
- Recording your own real, messy voice samples for the golden set

**Ground rules for the agent (put these in AGENTS.md / project rules):**
- `.env.local` and all keys are **never** committed. Add to `.gitignore` in the first commit.
- Every LLM JSON parse is wrapped in try/catch with the raw failure logged.
- Prefer feature-detection over user-agent sniffing for browser quirks (esp. audio MIME).
- No new dependencies beyond those named in Section 2 without flagging it.
- A phase is not "done" until its DoD checks pass — state each one explicitly when reporting.

---

## 2. Goals

**Functional goal:** Press a button, talk for up to ~3 minutes, get back a clean, categorized task list, on a page that works well on your phone's browser (installable as a home-screen web app).

**Portfolio goals** (what this should demonstrate to someone reviewing your work):
- Full-stack build: frontend, API routes, database, third-party AI API integration
- Working with audio in the browser (a genuinely fiddly, underrated skill)
- Prompt engineering for structured JSON output from an LLM
- Responsive, mobile-first UI design
- Real deployment (not just `localhost`) with a live demo link
- Understanding of free-tier constraints and designing around them (a very real, very hireable skill — most junior devs have never had to think about rate limits or cold-starts)

**Non-goals for V1:** multi-user accounts, WhatsApp/SMS delivery, payments, native mobile app. These are explicitly deferred (Section 12), not abandoned.

---

## 3. Final Tech Stack (all free tier)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (React) + Tailwind CSS | One framework for frontend + API routes, huge community, deploys natively to Vercel |
| Hosting | Vercel (Hobby/free plan) | Free, zero-config Next.js deploys, free HTTPS, free custom subdomain |
| Database | Supabase (free tier) | Free Postgres, free auth if you add it later, generous limits for solo use |
| Transcription + parsing | Google Gemini 2.5 Flash (free tier, native audio input) | Free tier covers this easily (1,500 requests/day); accepts audio directly, so **you skip Whisper entirely** — one API call does transcription + task extraction |
| Reminders (V1) | Web Push (browser notifications) — no third-party service needed | Free, no account needed beyond your own VAPID keys which you generate yourself |
| Reminders (optional) | Twilio WhatsApp **Sandbox** (personal use only) | Free indefinitely for messaging yourself; not for other users (see Section 12) |
| Auth (V1) | None — single hardcoded user / simple password gate | You're the only user; don't build auth you don't need yet |
| Version control | GitHub (public repo) | Needed for the portfolio aspect regardless |

**Total monthly cost at this scope: $0.** No credit card required for any service above at this usage level.

---

## 4. Architecture

```
[Phone browser: Record button]
        │  MediaRecorder API captures audio blob
        ▼
[POST /api/process-recording]  (Next.js API route)
        │  sends audio directly to Gemini (multimodal)
        ▼
[Gemini 2.5 Flash]
        │  single call: transcribe + extract structured tasks
        │  returns strict JSON array
        ▼
[Supabase Postgres]
        │  tasks inserted, linked to raw transcript
        ▼
[Task list UI]  ← reads from Supabase, groups by energy/deadline
        │
        ▼
[Optional: Web Push reminder]  ← scheduled via Vercel Cron, reads pending tasks, pushes notification
```

One API call does what the original spec split into two (Whisper → Gemini). This is simpler, cheaper, and has one less thing to debug.

---

## 5. Repo Layout & Environment

The agent should scaffold roughly this structure (Next.js App Router):

```
focusflow/
├─ app/
│  ├─ page.tsx                     # single-screen recorder + task list
│  ├─ layout.tsx
│  └─ api/
│     ├─ process-recording/route.ts   # audio → Gemini → Supabase
│     ├─ tasks/route.ts               # GET grouped tasks, PATCH complete
│     └─ cron/daily-reminder/route.ts # Web Push (Phase 5)
├─ lib/
│  ├─ supabase.ts                  # client init
│  ├─ gemini.ts                    # Gemini call + JSON parse guard
│  └─ types.ts                     # Task, Recording, ParseResult
├─ components/
│  ├─ Recorder.tsx
│  └─ TaskList.tsx
├─ public/
│  ├─ manifest.json
│  └─ icons/ (192, 512)
├─ supabase/migrations/0001_init.sql
├─ .env.local            # NEVER committed
└─ .gitignore
```

**Environment variables** (set in `.env.local` locally and in Vercel dashboard for deploy):

```
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-side inserts only, never exposed to client
VAPID_PUBLIC_KEY=               # Phase 5
VAPID_PRIVATE_KEY=              # Phase 5
CRON_SECRET=                    # guards the cron route
```

---

## 6. Database Schema (Supabase / Postgres)

Simplified from the original spec — no `users` table needed for a single-user V1, but structured so adding multi-user later is a small migration, not a rewrite. Put this in `supabase/migrations/0001_init.sql`.

```sql
-- Recordings table (create FIRST — tasks references it)
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript TEXT NOT NULL,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',              -- pending, completed, snoozed
    fuzzy_deadline VARCHAR(30) DEFAULT 'this_week',     -- today, this_week, backlog, when_free
    energy_level VARCHAR(30) DEFAULT 'low_focus',       -- high_focus, low_focus
    context TEXT,                                       -- freeform metadata Gemini extracts (people, tools, links)
    raw_transcript TEXT,                               -- full transcript this task came from
    recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Push subscriptions (for Web Push reminders)
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

> FK order matters: `recordings` must exist before `tasks`, since `tasks.recording_id` references it. The block above is already in the correct order.

---

## 7. The Gemini Prompt (Transcription + Parsing in One Call)

Send the audio blob as inline data plus this system instruction. Gemini 2.5 Flash accepts audio natively — no separate transcription step.

```json
{
  "system_instruction": "You are FocusFlow's parser. You receive a raw audio recording of a personal, unstructured brain-dump. Do two things: (1) transcribe the audio faithfully, (2) extract clear, actionable tasks from it. Rules: 1. Each task description must start with a verb (e.g. 'Draft project pitch', not 'thinking about the pitch'). 2. Infer fuzzy_deadline as one of: today, this_week, backlog, when_free. 3. Infer energy_level as one of: high_focus (deep work, writing, coding), low_focus (quick errands, replies, calls). 4. Extract any mentioned people, tools, or links into a 'context' field. 5. Ignore filler words, false starts, and rambling asides that aren't tasks. 6. Return ONLY valid JSON, no markdown fences, no commentary, in this exact shape: { \"transcript\": string, \"tasks\": [ { \"description\": string, \"fuzzy_deadline\": string, \"energy_level\": string, \"context\": string } ] }",
  "response_mime_type": "application/json"
}
```

**Practical notes:**
- Setting `response_mime_type: application/json` on the Gemini API call forces valid JSON back — use this rather than just asking nicely in the prompt; it's far more reliable.
- Budget real iteration time here. Getting fuzzy human speech ("ugh I really need to deal with the Sarah thing at some point") to map cleanly to a verb-first task description takes several rounds of testing against your own actual rambling, not sample sentences.
- 🧑 Keep a small "golden set" of 5–10 **real** recordings you save and re-run every time you tweak the prompt, so you can tell if a change actually improved things or just changed what broke. The agent can build the harness that runs the set; only you can supply the recordings.

---

## 8. Step-by-Step Build Plan (phases as agent tasks)

Each phase lists its work and a **Definition of Done** the agent must verify before proceeding.

### Phase 0 — Accounts & Setup (30–45 min) 🧑 mostly human
- [ ] 🧑 Create a free Google AI Studio account → generate a Gemini API key (`ai.google.dev`)
- [ ] 🧑 Create a free Supabase project (`supabase.com`) → note project URL + anon key + service role key
- [ ] 🧑 Create a free Vercel account (`vercel.com`), connect your GitHub
- [ ] 🧑 Create a new GitHub repo (public, for portfolio visibility)
- [ ] Agent: `npx create-next-app@latest` with Tailwind + TypeScript enabled
- [ ] Agent: `npm install @supabase/supabase-js`
- [ ] Agent: create `.env.local` with the keys from Section 5, and confirm `.gitignore` ignores it in the first commit

**DoD:** repo builds locally (`npm run dev` serves a page); `.env.local` is git-ignored and holds all keys from Section 5; first commit is pushed to GitHub with no secrets in history.

### Phase 1 — Database & Backend Skeleton (1–2 hrs)
- [ ] 🧑 Run `supabase/migrations/0001_init.sql` (Section 6) in Supabase's SQL editor
- [ ] Agent: build `/api/process-recording` — accepts an audio blob, calls Gemini via `lib/gemini.ts`, parses response (guarded), inserts into `recordings` + `tasks`
- [ ] Agent: build `/api/tasks` — `GET` returns pending tasks grouped by `fuzzy_deadline`/`energy_level`; `PATCH` marks a task completed (sets `completed_at`)
- [ ] Agent: test both routes with a sample audio file via `curl`/a script before any frontend exists — isolates backend bugs from frontend bugs

**DoD:** posting a sample audio file to `/api/process-recording` returns valid JSON and creates rows in both tables; `GET /api/tasks` returns them grouped; `PATCH` flips a task to completed. JSON parse failures are logged, not thrown uncaught.

### Phase 2 — Voice Recorder UI (2–4 hrs)
- [ ] Agent: single-screen mobile-first layout — one large central mic button, nothing else competing for attention (this is the whole point of the product — no friction here)
- [ ] Agent: `navigator.mediaDevices.getUserMedia({ audio: true })` + `MediaRecorder` to capture audio
- [ ] Agent: **iOS Safari gotcha** — Safari doesn't support `audio/webm`. Feature-detect and fall back to `audio/mp4`:
  ```js
  const mimeType = MediaRecorder.isTypeSupported('audio/webm')
    ? 'audio/webm'
    : 'audio/mp4';
  ```
- [ ] Agent: clear UI states: idle → recording (with a **visible, persistent** timer, so you always know how much time is left) → uploading → parsing → done
- [ ] Agent: cap recording length (~3 min) client-side to keep Gemini calls fast and cheap
- [ ] Agent: handle the mic permission prompt gracefully — show a clear explanation *before* the OS dialog so users don't reflexively deny it
- [ ] 🧑 Grant mic permission when testing on a real device

**DoD:** on a supporting browser you can record, see live elapsed time, and the blob reaches `/api/process-recording` with the correct MIME type; recording auto-stops at the cap; denied-permission and unsupported-browser states show a helpful message, not a crash.

### Phase 3 — Task List UI (2–3 hrs)
- [ ] Agent: card-based list grouped into three sections — "Today," "This Week," "Low-Energy / Anytime"
- [ ] Agent: tap-to-complete with immediate **optimistic** UI update (don't wait on the network round-trip to show the checkmark, instant feedback matters for a tool used in passing moments), reconciling with the `PATCH` result
- [ ] Agent: empty state that doesn't feel like failure — "Nothing pending. Go brain-dump something."
- [ ] Agent: auto-refresh after a new recording completes

**DoD:** tasks render in the three groups; tapping one checks it off instantly and persists (survives reload); a failed `PATCH` rolls the optimistic update back; empty state renders when there are no pending tasks.

### Phase 4 — PWA / Mobile Polish (2–3 hrs)
- [ ] Agent: add `public/manifest.json` (name, icons at 192/512, `display: standalone`, theme color)
- [ ] Agent: minimal service worker for offline app-shell caching (`next-pwa` handles most of this)
- [ ] 🧑 Test "Add to Home Screen" on an actual iPhone — **works from Safari only**, not Chrome-on-iOS, and can't be triggered programmatically (you can only show instructions)
- [ ] 🧑 Confirm the installed home-screen version opens full-screen without Safari's UI chrome

**DoD:** Lighthouse PWA checks pass (installable, manifest valid, service worker registered); app shell loads offline; on a real iPhone the home-screen install opens standalone/full-screen.

### Phase 5 — Reminders (2–4 hrs, optional for true V1)
- [ ] 🧑 Generate VAPID keys once (`web-push generate-vapid-keys`), add to env
- [ ] Agent: store subscription in `push_subscriptions` on first visit; build `/api/cron/daily-reminder` (guarded by `CRON_SECRET`) that reads pending tasks and pushes a notification with today's count; wire a Vercel Cron schedule
- [ ] Agent: **iOS caveat** — Web Push on iOS only fires if the site is installed to the home screen, iOS 16.4+. Build an in-app fallback badge ("you have 3 pending") so the app isn't useless without push
- [ ] Optional 🧑: if you still want WhatsApp, use the Twilio Sandbox to message only your own number, accepting the 3-day rejoin requirement. Treat as a fun stretch feature, not the primary path

**DoD:** a subscription is stored on first visit; hitting the cron route with the secret sends a push (verified on a supported install) and 401s without the secret; the in-app pending badge works regardless of push support.

### Phase 6 — Deployment (30–60 min)
- [ ] Agent: push to GitHub; 🧑 connect repo to Vercel and add env vars in Vercel's dashboard
- [ ] 🧑 Deploy, then test the live URL end-to-end on your actual phone (real mic permission flows differ from desktop emulators)
- [ ] Agent: set up a GitHub Actions scheduled workflow pinging Supabase every few days so the free-tier DB doesn't auto-pause from inactivity

**DoD:** live HTTPS URL serves the app; full record→parse→list flow works on a real phone against production env; the keep-alive workflow is committed and scheduled.

### Phase 7 — Testing Pass (1–2 hrs) — QA agent + 🧑
- [ ] 🧑 Record a genuinely messy, self-interrupting ramble (interrupt yourself, change topics, mumble) and confirm the parser holds up — not a clean scripted sentence
- [ ] 🧑 Test on both iOS Safari and Android Chrome — audio codec and permission behavior differ meaningfully
- [ ] Agent: test bad/no network mid-recording; the empty state; all-tasks-completed; and a very long transcript (edge cases interviewers ask about)

**DoD:** the golden-set recordings parse acceptably; both mobile browsers complete the core flow; network-failure and edge-case states degrade gracefully with no uncaught errors.

### Phase 8 — Portfolio Packaging (1–2 hrs)
- [ ] Agent: write a proper `README.md` — what it does, why (the input-friction problem), architecture diagram, tech choices and *why*, what you'd do differently with more time
- [ ] 🧑 Record a 60–90 second screen-capture demo (talking → parsed list appearing) — worth more than paragraphs to a reviewer
- [ ] Agent: note honestly in the README that this is a crowded space (Todoist, TickTick, etc.) and frame it explicitly as a learning/portfolio exercise — reads as self-aware and credible, not weak

**DoD:** README covers problem, architecture, and tradeoffs; demo clip is linked; repo is public and clean (no secrets, no dead scaffolding).

---

## 9. Realistic Timeline

| Phase | Time |
|---|---|
| 0–1: Setup + backend | 2–3 hrs |
| 2–3: Recorder + task UI | 4–7 hrs |
| 4: PWA/mobile polish | 2–3 hrs |
| 5: Reminders | 2–4 hrs |
| 6: Deploy | 0.5–1 hr |
| 7: Testing | 1–2 hrs |
| 8: Portfolio packaging | 1–2 hrs |
| **Total** | **~13–22 hrs** |

A solid weekend if you're comfortable with React (Fri evening + all Saturday). Prompt-tuning in Phases 1/2 is the part most likely to eat unplanned time — budget slack there. With agents running phases in parallel where allowed, wall-clock time drops, but the 🧑 gates (account setup, real-device testing, golden-set recording) still pace the critical path.

---

## 10. Risks & Troubleshooting Notes

- **Gemini free-tier rate limit (1,500 req/day, 15 req/min):** irrelevant at personal scale, but a tight test loop can hit the per-minute cap — add a short delay between test calls.
- **Supabase free project auto-pause after 7 days idle:** fixed by the GitHub Actions keep-alive in Phase 6. If it pauses anyway, it's a one-click unpause, not data loss.
- **iOS audio format mismatch:** the #1 likely early bug. If recordings fail on iPhone but work on desktop/Android, check the MIME type first.
- **iOS Web Push silently not firing:** confirm the PWA is actually installed to the home screen (not just bookmarked/open in a tab) before debugging the push code.
- **Gemini returning malformed JSON occasionally:** even with `response_mime_type: application/json`, wrap the parse in try/catch and log the raw failure — LLM JSON is reliable, not infallible.
- **Agent scope drift:** if an agent proposes auth, extra dependencies, or WhatsApp-as-primary, that's out of V1 scope (Section 2) — reject and redirect.

---

## 11. Definition of Done (project-level)

A live URL you can open on your phone, record a real messy thought into, and watch turn into a clean, correctly-categorized task list within a few seconds — plus a public GitHub repo with a README that explains the thinking, not just the code. No WhatsApp, no auth, no monthly bill required. Every phase in Section 8 has passed its DoD.

---

## 12. Stretch Goals / V2 (Not Required for Portfolio Completion)

Only pursue these after V1 is solid and deployed — they add real complexity:

- **Multi-user auth** via Supabase Auth (magic link or OAuth) — moderate effort, well-documented
- **Production WhatsApp delivery** — requires Meta Business verification (several days of lead time) and real per-message costs once you message people other than yourself
- **Native app wrapper** (Capacitor/React Native shell around the same web core) for proper background push and App Store presence — meaningfully more work than the PWA path
- **Voice-based check-off** ("mark the dentist task done") using the same Gemini pipeline in reverse
