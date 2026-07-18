-- Recordings table (create FIRST — tasks references it)
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript TEXT NOT NULL,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',              -- pending, completed, snoozed
    fuzzy_deadline VARCHAR(30) DEFAULT 'this_week',     -- today, this_week, backlog, when_free
    energy_level VARCHAR(30) DEFAULT 'low_focus',       -- high_focus, low_focus
    context TEXT,                                       -- freeform metadata Gemini extracts (people, tools, links)
    raw_transcript TEXT,                               -- full transcript this task came from
    recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Push subscriptions (for Web Push reminders)
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
