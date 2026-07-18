---
description: Deploy FocusFlow to Vercel and wire the free-tier keep-alive (DevOps persona, Phase 6).
---

1. Adopt the DevOps persona. Confirm the working tree is clean and `.env.local` is git-ignored
   with no secrets in history (`git log -p` spot check).
2. Push to the GitHub repo. 🧑 Ask the human to connect the repo to Vercel and add every env
   var from the plan (GEMINI_API_KEY, the three Supabase keys, VAPID pair, CRON_SECRET) in the
   Vercel dashboard — these are never committed.
3. Trigger the deploy. 🧑 Ask the human to test the live HTTPS URL end-to-end on a real phone
   (record → parse → list), since mic-permission flows differ from desktop emulators.
4. Add/verify the Vercel Cron schedule for `/api/cron/daily-reminder`.
5. Commit a GitHub Actions scheduled workflow that pings Supabase every few days so the
   free-tier project doesn't auto-pause after 7 days idle.
6. Run `/verify-dod` for Phase 6: live URL serves the app, full flow works against production
   env, keep-alive workflow committed and scheduled. Report results.
