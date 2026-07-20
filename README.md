# Spill: Voice-to-Task Parser for Capturing Tasks On the Go

Spill is a mobile-web-first, single-user Progressive Web App (PWA) designed to solve task-capture friction on the go. It allows users to record a messy, unstructured voice thought for up to 3 minutes and instantly transcribes and extracts clean, action-oriented, verb-first tasks grouped by deadline and energy level.

---

## The Problem (The Input Friction Trap)

Standard task managers (Todoist, TickTick, etc.) don't fail due to lack of features, but because of **input friction**. To capture a task, you must open an app, navigate to a list, type details, choose labels, select energy levels, and set dates. In that 15-second window, especially on the move, the thought is often forgotten or discarded. 

Spill reduces input friction to **exactly one tap**:
1. Tap the giant microphone button.
2. Speak a disorganized, self-interrupting brain dump.
3. Tap stop.
4. Multimodal AI transcribes, parses, categorizes, and updates the task list in real-time.

---

## Tech Stack & Architecture

This application is designed to run completely on free-tier infrastructure.

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend & API** | Next.js (App Router, TS, Tailwind CSS) | Scaffolds client components, layout viewports, and Route Handlers under a unified compiler. |
| **Database** | Supabase (Postgres) | Free-tier relational storage suitable for single-user scale, with active-connection REST endpoints. |
| **AI Processing** | Google Gemini 3.5 Flash | Accepts audio files natively (skipping a separate Whisper step). Performs transcription and structured JSON extraction in a single, fast API call. |
| **Reminders** | Web Push API (via `web-push` & VAPID keys) | Zero-cost native browser notifications scheduled via Vercel Cron. |
| **App Shell** | Standard PWA (Manifest + Custom Service Worker) | Enables offline loading, high-contrast theme wrapping, and full-screen standalone mobile install. |

### System Diagram

```
[Mobile Browser / PWA Shell]
       │
       │ (MediaRecorder captures audio/webm, or audio/mp4 fallback on iOS Safari)
       ▼
[POST /api/process-recording] ──► [Gemini 3.5 Flash API]
       │                                  │
       │ (Saves raw transcript)           │ (Transcribes + returns parsed JSON tasks)
       ▼                                  ▼
[Supabase Recordings Table] ◄──────── [Supabase Tasks Table]
                                           ▲
                                           │
[PWA Task List Dashboard] ◄───────────────┘ (GET /api/tasks with optimistic completion PATCH)
```

---

## Database Schema

```sql
-- Recordings table
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
    status VARCHAR(20) DEFAULT 'pending',
    fuzzy_deadline VARCHAR(30) DEFAULT 'this_week', -- today, this_week, backlog, when_free
    energy_level VARCHAR(30) DEFAULT 'low_focus',   -- high_focus, low_focus
    context TEXT,                                   -- people, tools, or links extracted
    raw_transcript TEXT,
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

---

## Non-Obvious Implementation Details & Tradeoffs

1. **iOS Safari Audio MIME Mismatch:** iOS Safari does not support recording in `audio/webm`. We implement browser feature detection to record in `audio/webm` if supported, falling back to `audio/mp4` on Safari.
2. **Excluding Whisper:** Instead of chain-loading transcription (Whisper API) followed by classification (Gemini/GPT API), we stream the raw audio binary directly to Gemini 3.5 Flash in a single payload. This halves API round-trip times and reduces point-of-failure vectors.
3. **Optimistic Task Completion:** Tapping a task checkbox updates the local state immediately and triggers a background database update. If the network call fails, the UI rolls back with a visual notification.
4. **Vercel Keep-Alive:** To prevent Supabase's free tier from auto-pausing after 7 days of inactivity, we deploy a lightweight GitHub Actions workflow (`keep-alive.yml`) that queries the public API endpoints every 3 days.
5. **JSON Parsing Resilience:** LLMs can occasionally return invalid markdown blocks (e.g. ```json ... ```) even when `response_mime_type: "application/json"` is requested. We sanitize the output and wrap `JSON.parse` in a robust try-catch block, logging raw text on failures rather than throwing uncaught route exceptions.

---

## How to Run Locally

1. **Scaffold config:** Create a `.env.local` file at the root of the project:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   VAPID_PUBLIC_KEY=your_vapid_public_key
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
   VAPID_PRIVATE_KEY=your_vapid_private_key
   CRON_SECRET=your_cron_security_secret
   ```

2. **Install & Build:**
   ```bash
   npm install
   npm run build
   ```

3. **Run Dev Server:**
   ```bash
   npm run dev
   ```

4. **Verify APIs:**
   You can run the built-in test suite to verify Supabase connections:
   ```bash
   npx tsx --env-file=.env.local scripts/test-api.ts
   ```

---

## Future Enhancements (V2 Goals)
* **Supabase Auth:** Add Magic Link login for multi-user capabilities.
* **Snooze/Reschedule:** Voice-activated rescheduling (e.g. "move groceries to next week").
* **Audio Playback:** Save the original audio blob in Supabase storage for listening to dumps later.
* **Twilio WhatsApp Integration:** Allow users to dictate tasks directly via a WhatsApp voice note.
