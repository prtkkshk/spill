---
name: add-api-route
description: Scaffold a new Next.js App Router API route for FocusFlow following the project's Supabase + guarded-JSON conventions. Use whenever you need a new endpoint under app/api/.
---

# Add a FocusFlow API Route

## When to use this
Any time the backend needs a new endpoint (or you're building the Phase 1 routes:
`process-recording`, `tasks`, or the Phase 5 `cron/daily-reminder`).

## Steps
1. Create `app/api/<name>/route.ts`. Export the needed HTTP method handlers
   (`GET`, `POST`, `PATCH`) as async functions taking `(req: Request)`.
2. Import the server Supabase client from `lib/supabase.ts` (service-role, server-only).
   Never import the service-role client into a client component.
3. Import shared types from `lib/types.ts` (`Task`, `Recording`, `ParseResult`). Type the
   request body and the response.
4. If the route parses model or external JSON, wrap `JSON.parse` in try/catch, log the raw
   failing text, and return a typed error with an appropriate status — never throw uncaught.
5. For inserts, respect FK order (`recordings` before `tasks`). For updates, set the right
   timestamp (e.g. `completed_at` on complete).
6. Guard any privileged/cron route with the matching secret (`CRON_SECRET` header) and
   return 401 when it's missing or wrong.
7. Test with `curl` or a small script against `npm run dev` before wiring any UI to it.

## Conventions to follow
- Secrets from `process.env.*` only; service-role key stays server-side.
- Responses are typed and consistent; errors are logged, not swallowed silently.
- Keep the route thin — put Gemini logic in `lib/gemini.ts` and DB logic near `lib/supabase.ts`.
