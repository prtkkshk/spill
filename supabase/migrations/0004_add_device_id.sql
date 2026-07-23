-- Add device_id column to recordings and tasks for unauthenticated device isolation
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Index device_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_recordings_device_id ON recordings(device_id);
CREATE INDEX IF NOT EXISTS idx_tasks_device_id ON tasks(device_id);
