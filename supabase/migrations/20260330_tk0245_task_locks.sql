-- TK-0245: Atomic Task Checkout
-- Migration: task_locks table

CREATE TABLE IF NOT EXISTS task_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL UNIQUE,
  locked_by TEXT NOT NULL,       -- agent_key
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,  -- locked_at + 5 minutes
  capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE
);

ALTER TABLE task_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_locks_read" ON task_locks FOR SELECT USING (true);
CREATE POLICY "task_locks_write" ON task_locks FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX idx_task_locks_task_id ON task_locks(task_id);
CREATE INDEX idx_task_locks_expires ON task_locks(expires_at);
