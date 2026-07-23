-- ==============================================================================
-- SPILL MASTER DATABASE RESET & PRODUCTION SETUP SCRIPT
-- ==============================================================================
-- Execute this entire script in Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- STEP 1: CLEAN RESET (DROP OLD TABLES)
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS recordings CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;

-- STEP 2: CREATE RECORDINGS TABLE
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript TEXT NOT NULL,
    duration_seconds INTEGER,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: CREATE TASKS TABLE WITH STRICT ENUM CONSTRAINTS
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'snoozed')),
    fuzzy_deadline VARCHAR(30) DEFAULT 'today' CHECK (fuzzy_deadline IN ('today', 'this_week', 'next_week', 'backlog', 'when_free')),
    energy_level VARCHAR(30) DEFAULT 'low_focus' CHECK (energy_level IN ('high_focus', 'low_focus')),
    context TEXT,
    specific_deadline VARCHAR(100),
    raw_transcript TEXT,
    recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- STEP 4: CREATE PUSH SUBSCRIPTIONS TABLE
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 5: PRODUCTION PERFORMANCE INDEXES FOR SCALE
CREATE INDEX idx_tasks_user_status_created ON tasks(user_id, status, created_at DESC);
CREATE INDEX idx_tasks_device_status_created ON tasks(device_id, status, created_at DESC) WHERE user_id IS NULL;
CREATE INDEX idx_recordings_user_created ON recordings(user_id, created_at DESC);
CREATE INDEX idx_recordings_device_created ON recordings(device_id, created_at DESC) WHERE user_id IS NULL;

-- STEP 6: ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- STEP 7: CREATE PRODUCTION RLS POLICIES FOR USER & DEVICE ISOLATION
CREATE POLICY "Recordings isolation policy" ON recordings
    FOR ALL
    USING (auth.uid() = user_id OR (user_id IS NULL AND device_id IS NOT NULL))
    WITH CHECK (auth.uid() = user_id OR (user_id IS NULL AND device_id IS NOT NULL));

CREATE POLICY "Tasks isolation policy" ON tasks
    FOR ALL
    USING (auth.uid() = user_id OR (user_id IS NULL AND device_id IS NOT NULL))
    WITH CHECK (auth.uid() = user_id OR (user_id IS NULL AND device_id IS NOT NULL));

CREATE POLICY "Push subscriptions isolation policy" ON push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id OR (user_id IS NULL AND device_id IS NOT NULL))
    WITH CHECK (auth.uid() = user_id OR (user_id IS NULL AND device_id IS NOT NULL));
