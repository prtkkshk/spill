---
name: gemini-golden-set
description: Build and run the golden-set harness that re-runs real recordings through the Gemini parser after any prompt change, so you can tell if a tweak actually improved parsing. Use whenever editing the system instruction in lib/gemini.ts.
---

# Gemini Golden-Set Harness

## When to use this
Before and after **any** change to the Gemini system instruction or parsing logic. Prompt
tuning against fuzzy human speech is the part of this build most likely to silently regress.

## Steps
1. Create a `golden/` directory (git-ignored if the audio is personal) holding 5–10 **real**
   recordings the human supplied — messy, self-interrupting brain-dumps, not clean scripted
   sentences. 🧑 Only the human can record these; the agent builds the harness around them.
2. Write a script (e.g. `scripts/run-golden.ts`) that, for each recording, calls the same
   `lib/gemini.ts` path the app uses, with `response_mime_type: application/json` set.
3. For each result, save the parsed JSON to `golden/out/<name>.json` and print a compact diff
   vs. the previous run so regressions are obvious at a glance.
4. Assert the invariants on every task: description starts with a verb;
   `fuzzy_deadline ∈ {today, this_week, backlog, when_free}`;
   `energy_level ∈ {high_focus, low_focus}`. Flag any violation.
5. Add a short delay between calls so the tight loop doesn't hit Gemini's 15 req/min free cap.
6. Run before editing the prompt (baseline) and after (compare). Keep the change only if the
   golden set improved or held steady.

## Conventions to follow
- Never tune against sample sentences — only the real golden recordings count.
- Every parse is guarded; log raw failures so a "bad output" is distinguishable from a crash.
- Treat the golden JSON outputs as the regression fixture for this project.
