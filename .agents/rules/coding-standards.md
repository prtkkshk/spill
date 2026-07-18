# Coding Standards

- **Language:** TypeScript everywhere (`.ts` / `.tsx`). No plain `.js` source files.
  Strict mode on. No `any` unless justified with a comment.
- **Shared types:** `Task`, `Recording`, and `ParseResult` live in `lib/types.ts` and are
  imported everywhere — never redefine them inline in a route or component.
- **File structure:** one screen and its logic per file; API routes live under
  `app/api/<name>/route.ts`; reusable client init and helpers under `lib/`; presentational
  pieces under `components/`. Keep the app single-screen — resist adding routes.
- **Secrets:** never hardcode a key. All secrets come from `process.env.*`. `.env.local`
  is git-ignored from the first commit. `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY`
  are used only inside server route handlers — never imported into a client component.
- **Error handling:** any parse of model output or external JSON is wrapped in try/catch;
  on failure, log the raw text and return a typed error, never throw uncaught into a route.
- **Comments:** explain *why*, not *what*. Document the non-obvious browser/LLM quirks
  inline where they bite (iOS MIME fallback, iOS push install requirement, JSON guard).
- **Dependencies:** stick to the approved set (Next.js, Tailwind, `@supabase/supabase-js`,
  `web-push`, Next PWA tooling). Adding anything else requires flagging it in the plan first.
- **Commits:** small and scoped to a phase; the first commit must already contain a
  `.gitignore` that excludes `.env.local`.
