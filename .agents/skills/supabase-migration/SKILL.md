---
name: supabase-migration
description: Author a new Supabase/Postgres migration for FocusFlow with correct FK ordering and single-user-now / multi-user-ready structure. Use when creating or altering the database schema.
---

# Supabase Migration

## When to use this
Creating the initial schema (`0001_init.sql`) or any later schema change (e.g. the eventual
V2 `users` table).

## Steps
1. Add a new numbered file under `supabase/migrations/` (e.g. `0002_<change>.sql`). Never
   edit an already-applied migration — append a new one.
2. Respect **foreign-key order**: a referenced table must be created before the table that
   references it. In `0001`, `recordings` comes before `tasks` because `tasks.recording_id`
   references `recordings(id)` with `ON DELETE CASCADE`.
3. Use `gen_random_uuid()` PK defaults and `TIMESTAMP WITH TIME ZONE DEFAULT NOW()` for
   created_at columns, matching the existing schema.
4. Keep V1 single-user: do **not** add a `users` table or auth columns now. Structure new
   tables so a future `user_id` column is an additive migration, not a rewrite.
5. 🧑 The human runs the SQL in Supabase's SQL editor (or via CLI) — the agent authors and
   reviews it but cannot execute it against the live project.
6. After applying, verify with a quick insert/select that constraints behave as intended.

## Conventions to follow
- Enum-like columns stay as constrained `VARCHAR` with documented allowed values
  (`status`, `fuzzy_deadline`, `energy_level`) matching what Gemini emits.
- Migrations are forward-only and idempotent where practical.
