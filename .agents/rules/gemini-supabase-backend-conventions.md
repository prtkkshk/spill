# Gemini + Supabase Backend Conventions

## Gemini (transcription + parsing in ONE call)
- Model: **Gemini 2.5 Flash**, which accepts audio natively. Send the audio blob as inline
  data. **Do not** add a separate transcription step (no Whisper) — one call transcribes and
  extracts tasks.
- Always set `response_mime_type: "application/json"` on the request. This forces valid JSON
  far more reliably than asking in the prompt.
- Even so, **wrap every `JSON.parse` in try/catch and log the raw failing text.** LLM JSON is
  reliable, not infallible. On failure, return a typed error the route can surface — never
  throw uncaught.
- The system instruction lives in `lib/gemini.ts`. It must enforce: verb-first task
  descriptions; `fuzzy_deadline ∈ {today, this_week, backlog, when_free}`;
  `energy_level ∈ {high_focus, low_focus}`; a freeform `context` field for people/tools/links;
  ignore filler and rambling; return only this JSON shape:
  ```json
  { "transcript": string,
    "tasks": [ { "description": string, "fuzzy_deadline": string,
                 "energy_level": string, "context": string } ] }
  ```
- Prompt quality is tuned against the **golden set** of real recordings, not sample
  sentences. Any prompt change is validated by re-running the harness (see the golden-set skill).
- Free tier is 1,500 req/day and 15 req/min — irrelevant at personal scale, but add a short
  delay between calls in tight test loops so you don't hit the per-minute cap.

## Supabase (Postgres)
- Schema lives in `supabase/migrations/0001_init.sql`. **FK order matters:** create
  `recordings` before `tasks`, because `tasks.recording_id` references `recordings(id)`.
- Tables: `recordings` (transcript, duration, created_at), `tasks` (description, status,
  fuzzy_deadline, energy_level, context, raw_transcript, recording_id FK, timestamps,
  completed_at), `push_subscriptions` (endpoint, p256dh, auth).
- Design assumes single-user V1 but stays multi-user-ready — adding a `users` table later is
  a small migration, not a rewrite. Do not add auth or a users table in V1.
- Server-side inserts use `SUPABASE_SERVICE_ROLE_KEY` and happen only in route handlers.
  The client uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never ship the service role key to the browser.
- Client init helpers live in `lib/supabase.ts` (separate server and browser clients).

## API routes
- `POST /api/process-recording`: accept audio blob → Gemini via `lib/gemini.ts` → guarded
  parse → insert `recordings` then `tasks`.
- `GET /api/tasks`: return pending tasks grouped by `fuzzy_deadline`/`energy_level`.
  `PATCH /api/tasks`: mark a task completed and set `completed_at`.
- `POST /api/cron/daily-reminder`: guarded by `CRON_SECRET` header; reads pending tasks and
  sends a Web Push with today's count; returns 401 without the secret.
- Test routes with a sample audio file via `curl`/a script **before** any frontend exists —
  this isolates backend bugs from frontend bugs.
