-- 0005_strict_user_rls.sql
-- Update Row Level Security policies on recordings and tasks to strictly isolate user data

-- Drop old lax policies
DROP POLICY IF EXISTS "Users can access their own recordings or unassigned recordings" ON recordings;
DROP POLICY IF EXISTS "Users can access their own tasks or unassigned tasks" ON tasks;

-- Recordings RLS Policies: Authenticated users only see their own recordings (user_id = auth.uid())
CREATE POLICY "Users can access their own recordings" ON recordings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Tasks RLS Policies: Authenticated users only see their own tasks (user_id = auth.uid())
CREATE POLICY "Users can access their own tasks" ON tasks
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
