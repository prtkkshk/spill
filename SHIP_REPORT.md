# FocusFlow → Ship-Ready Redesign & Bug Report

Prepared by testing the running app at `localhost:3001` (Chrome, light + dark mode, desktop viewport) and reading the source. Written as a work order for Claude Code — every item below names the file(s) to touch.

---

## 1. Bugs found while testing

### 1.1 Service Worker fails to register (breaks offline/PWA install)
**File:** `public/sw.js`
**Root cause:** the file is written in TypeScript (`event: any` type annotations) but is served as a raw static file — browsers can't parse TypeScript. Console shows:
`ServiceWorker script evaluation failed`.
**Fix:** strip all TypeScript syntax from `public/sw.js` (remove `: any` annotations, any other type-only syntax) so it's valid plain JavaScript. This file is never compiled by Next.js because it lives in `public/`.

### 1.2 Hydration mismatch on every load
**File:** `app/layout.tsx`
**Root cause:** the inline theme script sets `data-theme` on `<html>` before React hydrates, but the server-rendered HTML never has that attribute, so React logs a hydration mismatch (`data-theme="light"` diff shown in the Next.js dev overlay).
**Fix:** add `suppressHydrationWarning` to the `<html>` element in `app/layout.tsx`. This is the documented Next.js pattern for this exact dark-mode-script technique.

### 1.3 "Recently Completed" has no clear/bulk-delete action *(the issue you flagged)*
**Files:** `components/TaskList.tsx` (UI), `app/api/tasks/route.ts` (API)
**Current state:** the section only supports un-completing one task at a time (click the checkmark). There is a single-row `DELETE` endpoint but no bulk endpoint, and no "Clear all" control in the UI.
**Fix:**
- Add a `DELETE /api/tasks?scope=completed` (or a small `POST /api/tasks/clear-completed`) route that deletes all rows where `status = 'completed'`.
- Add a "Clear all" text button next to the "Recently Completed (N)" header, with a confirm step (reuse the existing `confirm()` pattern or, better, a small inline confirm state) since this is a destructive, non-undoable action.
- Optimistically empty `localTasks.completed` in `TaskList.tsx`, roll back on API failure, matching the existing optimistic-update pattern used elsewhere in that file.

### 1.4 Whole page is `select-none`
**File:** `app/page.tsx` (line ~179) and inherited by task cards in `TaskList.tsx`
**Issue:** `select-none` is applied to the root container, so users can't select/copy a task's text (useful for pasting into another app). Should only apply `select-none` to interactive chrome (buttons, badges), not to task description text.

### 1.5 Hardcoded, non-themed divider
**File:** `app/page.tsx` — `<div className="w-full border-t border-slate-800/60" />`
**Issue:** this is a raw Tailwind slate color, not one of the app's `--glass-border` / `--text-secondary` tokens, so it's invisible or wrong in light mode. Replace with a token-based class (e.g. `border-glass-border/30`) so it responds to theme.

### 1.6 Manifest icons are JPEG but declared "maskable"
**File:** `public/manifest.json`, `public/icons/icon-192.jpg`, `public/icons/icon-512.jpg`
**Issue:** `"purpose": "any maskable"` requires the icon to support safe-zone masking; JPEG has no alpha channel, which typically produces a white/square icon halo on Android home screens instead of a proper maskable icon. Regenerate icons as PNG (ideally SVG source → 192/512 PNG export) once the new brand mark exists.

### 1.7 Manifest colors don't match the live theme default
**File:** `public/manifest.json` (`background_color`/`theme_color: #090d16`) vs. the app's actual default (light "Peach" theme, `#FFF8F3`)
**Issue:** the PWA splash screen will flash dark even though the app opens in light mode by default. Align manifest colors with whatever the new redesign's default theme is (see §2).

### 1.8 Truncated category tag with no visual affordance
**File:** `components/TaskList.tsx` (`task.context` badge, ~line 523)
**Issue:** `truncate max-w-[180px]` cuts long context tags (e.g. "DEPARTMENT REPRESENTATI…") without enough contrast/space to show the ellipsis clearly, and the badge can't wrap. Worth revisiting sizing/line-wrap as part of the card redesign rather than hard truncation.

---

## 2. Redesign brief — "Bold Minimal Dark"

Direction chosen: **dark-first, high-contrast, confident typography, restrained accent color** (Linear / Arc / Raycast register), replacing the current warm peach/lavender glassmorphism look.

**Current state:** `app/globals.css` already defines a full light/dark token system (`--bg-base`, `--accent`, `--text-primary`, etc.) consumed via Tailwind `@theme`. That plumbing is good and should be kept — only the *values* and the *default theme* need to change. `design.md` in the repo documents the old peach-glassmorphism direction and should be treated as superseded; replace it with a new design doc reflecting the direction below (or update it in place).

**What to change:**

- **Default theme:** make dark the default (`data-theme="dark"` when no preference is stored), matching the "bold minimal dark" direction and the manifest's existing dark theme_color.
- **Palette:** move off the current dark-mode purple/teal orb gradient toward a tighter, more restrained palette — one confident accent color (not two competing orb hues), neutral near-black backgrounds (`#0A0A0C`–`#111114` range), and off-white text rather than pure white for a more "designed" feel.
- **Typography:** current General Sans + Geist stack is a reasonable base — lean into it harder. Bigger, bolder headline type for the date/stats area, tighter tracking, clearer hierarchy between primary task text and metadata badges. Reduce the number of `font-extrabold` + `uppercase` + `tracking-widest` combinations currently used almost everywhere (header, badges, section titles, buttons) — that combination is overused across the app and flattens the hierarchy.
- **Cards & glassmorphism:** the blurred "glass" card treatment (`bg-glass-surface/50 backdrop-blur-md`) is applied uniformly to nearly every element (stat cards, task cards, input, header, badges). For an awwwards-level look, reduce blur usage to 1–2 signature surfaces (e.g. header, main recorder card) and give task list items a flatter, more precise surface treatment with intentional borders/shadows instead.
- **Motion:** keep the existing Framer Motion stagger/spring patterns (they're solid) but tone down the constant `animate-pulse` on badges and the header dot — persistent pulsing everywhere reads as "unfinished" rather than polished. Reserve motion for state changes (recording, completing a task, success).
- **Contrast:** several text/badge combinations are low-contrast, especially `--text-secondary` on `--accent-soft`/`--glass-surface` backgrounds in light mode (e.g. energy badges, context tags) — run the new palette through a contrast check (WCAG AA, 4.5:1 for body text) before finalizing.
- **Layout:** the whole app is constrained to `max-w-md mx-auto` regardless of viewport, so on desktop it renders as a narrow mobile column in a sea of empty space (see screenshots taken during testing). Decide whether desktop gets a genuinely different layout (e.g. wider container, two-column task board) or whether "mobile-only, centered card on desktop" is an intentional constraint to keep — either way it should be a deliberate decision, not a default.
- **Component-by-component:** re-skin `Recorder.tsx` (mic button, permission explainer card, status states), `TaskList.tsx` (task cards, energy/context badges, completed section), header stat cards and date pill in `page.tsx`, `ShareButton.tsx` and `ThemeToggle.tsx` icon buttons — all currently share the same glass/pill/badge language that should evolve together.

---

## 3. Remove AI-vendor branding from the UI

Per your call: strip all AI/Gemini mentions from user-facing text; describe things functionally instead.

| File | Line | Current text | Replace with (functional, no AI mention) |
|---|---|---|---|
| `components/Recorder.tsx` | ~196 | "Your audio is processed privately by Gemini." | e.g. "Your audio is processed securely and never shared." |
| `components/Recorder.tsx` | ~237 | "Gemini is extracting tasks..." | e.g. "Organizing your thoughts..." / "Extracting your tasks..." |

Also sweep `README.md`, `design.md`, and code comments if you want the vendor name scrubbed from developer-facing docs too — those don't affect the shipped UI, so lower priority. `lib/gemini.ts` and `app/api/process-recording/route.ts` are backend-only and never rendered, no user-facing change needed there.

---

## 4. Rename: FocusFlow → ?

"FocusFlow" appears in 15+ files (UI strings, `app/layout.tsx` metadata, `public/manifest.json`, `components/ShareButton.tsx` share text, `document.title` logic in `app/page.tsx`, README/docs, localStorage key `focusflow-theme`, cache name `focusflow-v1` in `sw.js`). Full occurrence list gathered during this audit — Claude Code should grep `FocusFlow|focusflow` across the repo to catch all of them, including non-obvious ones like the localStorage key and service-worker cache name (renaming those requires a migration/versioning thought, not just a find-replace, since existing users' stored theme preference and cache would silently reset — acceptable for a pre-launch app, but worth doing deliberately).

**Name options** (all one word or short, fit the "bold minimal dark" direction and the "voice brain-dump → organized tasks" concept):

1. **Spill** — "Spill your thoughts, we'll sort them out." Short, punchy, easy mark to design (a single drop/blob shape).
2. **Untangle** — leans into a declutter-your-head promise directly; calmer, more premium-sounding.
3. **Braindrop** — a mic-drop pun on "brain dump"; distinctive and memorable, pairs well with a drop-shaped logomark.
4. **Scatter** (or **Unscatter**) — names the problem (scattered thoughts) the app solves.
5. **Nowdo** — action-first, fast, minimal — matches the "one tap" pitch in the README.

Pick one (or ask for more direction) and Claude Code can do the rename pass — happy to also check basic domain/npm-name availability once you've narrowed it down.

---

## 5. Ship-readiness checklist

- [ ] Fix `public/sw.js` TypeScript-in-JS bug (§1.1)
- [ ] Add `suppressHydrationWarning` to `<html>` in `app/layout.tsx` (§1.2)
- [ ] Add "Clear all" to Recently Completed + bulk-delete API route (§1.3)
- [ ] Remove `select-none` from task text (§1.4)
- [ ] Fix hardcoded divider color (§1.5)
- [ ] Regenerate manifest icons as maskable-safe PNGs (§1.6)
- [ ] Align manifest theme colors with final default theme (§1.7)
- [ ] Execute the redesign (§2) — new palette/tokens in `globals.css`, re-skin components, update/replace `design.md`
- [ ] Remove all Gemini/AI mentions from UI copy (§3)
- [ ] Full rename pass, including localStorage key and SW cache name (§4)
- [ ] Re-test: run `npm run build` (currently untested by this audit) to confirm no build-time errors, re-check console for the 2 dev-overlay issues clearing, spot-check both themes and at least one narrow mobile viewport
- [ ] Update `README.md` (product description already assumes Gemini branding is fine there — decide if you want that scrubbed too, see §3)

---

## 6. Not covered by this report

This audit was UI/browser-based plus source reading — it did not run `npm run build`, did not exercise the actual voice recording → Gemini extraction flow end-to-end (would need a live mic + API key in this environment), and did not test push notifications or the cron reminder route. Worth a manual pass on those before calling it fully ship-ready.
