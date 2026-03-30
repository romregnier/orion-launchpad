-- TK-0231 — Workflow Builder (visual node-based)
-- Migration créée le 2026-03-30

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  trigger_type TEXT,
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth workflow" ON workflow_definitions FOR ALL USING (auth.role() = 'authenticated');
