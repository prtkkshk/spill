# Master Prompt — FocusFlow Product/UX Audit & Productivity Roadmap

How to use this file: copy everything inside the fenced block below and paste it as your first message to an AI coding agent that has file access to this repo, a shell, and a browser (i.e. an agent like the one you're using now — not a chat-only model with no tool access). It has the app running locally, or knows how to start it, at the URL you give it.

Before pasting, fill in the one placeholder near the top: `{{APP_URL}}` (e.g. `http://localhost:3001`).

---

```
You are acting as a senior product-minded full-stack engineer doing a candid audit of an existing app called FocusFlow, followed by a scoped feature roadmap. Do not start writing code yet — this is an analysis-and-proposal task first, implementation second, gated by my approval in between.

## What FocusFlow is

Read these files in the repo root before doing anything else, in this order: AGENTS.md, README.md, project_plan.md, task.md, design.md. They define the product (a mobile-web PWA that turns a rambling voice brain-dump into a clean, categorized task list — built for on-the-go "input friction," single-user, $0-budget infra), the standing engineering rules, and a visual redesign plan (design.md) that has already been decided — treat design.md's direction as settled; don't re-litigate colors/motion/theming, but do keep any new feature ideas visually and behaviorally consistent with it.

## Step 1 — Orient yourself in the real app, not just the docs

- Browse the running app at {{APP_URL}} yourself, end to end: the idle state, tapping the mic, the recording state, upload/parsing state, the resulting task list, tapping a task complete, an empty state, and an error state if you can trigger one (e.g. by killing the network mid-recording). Use a mobile viewport, not just desktop — this is a mobile-first PWA.
- Read the actual source, not just the README's description of it: components/Recorder.tsx, components/TaskList.tsx, everything under app/api/**/route.ts, lib/, and the Supabase migration(s) under supabase/. Note any mismatch between what the docs claim and what the code actually does.

## Step 2 — Audit

Produce a candid, specific audit (cite file names / UI states, not generalities) covering:

1. UX friction in the record → transcribe → parse → task-list flow — where would a distracted or overwhelmed user bounce off?
2. Reliability/edge-case gaps in the voice/AI parsing pipeline (the Gemini call, JSON-parse guarding, fuzzy_deadline / energy_level classification quality, what happens with a rambling 3-minute dump with 15 tasks buried in it vs. one clean sentence).
3. What's structurally missing for this to be a genuinely useful daily productivity tool beyond "capture," e.g. what happens to a task after it's captured — is there a review loop, a way to reschedule, any sense of progress over time?
4. Anything in the current data model (recordings/tasks/push_subscriptions tables) or API shape that would block good ideas later if not addressed now.

## Step 3 — Ideation (scoped to three areas only)

Brainstorm concrete feature/utility ideas in exactly these three categories — do not propose ideas outside them (no new categories like multi-user social features, gamified leaderboards, etc., unless they clearly serve one of these three):

- **Task/productivity features** — e.g. daily review ritual, snooze/reschedule, recurring tasks, priority within a group, a calendar/agenda view, streaks or completion trends, smarter grouping.
- **Voice/AI parsing improvements** — e.g. better extraction accuracy or prompt design, handling ambiguous/contradictory dumps, a lightweight clarify-and-confirm step, editing an already-parsed task by voice, re-parsing a past recording.
- **Integrations & sharing** — e.g. calendar export/sync (.ics, Google Calendar), sharing/exporting the task list, browser/PWA widgets, anything that plugs FocusFlow into tools the user already has — bias toward options that don't require paid infra or a full auth system, but see the scope rule below.

For every idea, give: a short name, the problem it solves, roughly how it would work (UI + data + API implications), an effort estimate (S/M/L), and an explicit scope check against AGENTS.md's V1 rules (single-user, no auth, no payments, PWA-only, free-tier infra only).

**Scope rule:** you may brainstorm freely, including ideas that would require breaking a V1 rule (e.g. an idea that really needs auth, or a paid API tier). Don't self-censor those out — just tag them clearly, e.g. `[REQUIRES: auth]` or `[REQUIRES: paid tier]`, so I can see the full idea space and decide. Never silently assume a rule change; always flag it.

## Step 4 — Prioritize

Rank all ideas by impact vs. effort. Recommend a specific slate of ideas for a "V1.1" pass (small enough to actually ship, high leverage, no rule-breaks) separately from a "flagged for later / needs a decision" list (rule-breaking or high-effort ideas).

## Step 5 — Write it up

Write the audit, the full idea list, and the prioritized roadmap to a new file, PRODUCT_ROADMAP.md, in the repo root. Structure the recommended V1.1 slate as phases with an explicit Definition of Done per phase, matching the phase+DoD convention already used in design.md and task.md, so it slots into the existing workflow.

## Step 6 — Stop and wait for approval

Do not write any implementation code yet. After PRODUCT_ROADMAP.md is written, summarize it for me in chat (the prioritized V1.1 slate, and the flagged/deferred list) and explicitly ask me which items to approve for implementation. If anything in your audit or ideation depends on a judgment call only I can make (e.g. "should reminders be push notifications or in-app only," "is a calendar view worth the added complexity"), ask me directly instead of guessing, one question at a time or batched clearly — don't bury decisions in prose I might skim past.

## Step 7 — Implement (only after I approve)

Once I've told you which items to build: re-read task.md and update it as you go, respect every standing rule in AGENTS.md (env vars, JSON-parse try/catch discipline, optimistic UI convention, no unapproved new dependencies without flagging), implement phase by phase in the order from PRODUCT_ROADMAP.md, verify each phase's DoD explicitly before moving to the next, and pause for my review after each phase rather than running through all of them silently.
```
