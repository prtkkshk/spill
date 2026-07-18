---
description: Take one FocusFlow project-plan phase from start to a DoD-verified, committed state.
---

1. Identify the phase number and read its section in the human's `project_plan.md`, plus the
   matching milestone in `task.md`. Restate the phase's Definition of Done out loud.
2. Adopt the owning persona from `AGENTS.md` (Backend for Phases 1/5, Frontend for 2/3/4,
   DevOps for 6, QA for 7). Load the relevant rules in `.agents/rules/`.
3. If the phase is non-trivial, switch to Planning mode: propose the task list and pause for
   the human's approval before writing code.
4. Flag every 🧑 human-in-the-loop step in this phase (account/keys, mic permission,
   real-device install, golden-set recording) and pause for the human when you reach one.
5. Implement, following the project conventions. Keep the diff scoped to this phase.
6. Verify each DoD check explicitly — run `/verify-dod` — and report pass/fail per check.
7. Update `task.md`: check off the completed tasks. Commit with a scoped message
   (confirm no secrets are staged).
8. Stop and hand back to the human for review before starting the next phase.
