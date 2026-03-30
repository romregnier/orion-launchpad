-- TK-0244: [DS-005] Config Versioning + Rollback
-- Migration: agent_config_versions table

CREATE TABLE IF NOT EXISTS agent_config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,  -- ref canvas_agents
  capsule_id UUID,
  version_number INTEGER NOT NULL,
  config_snapshot JSONB NOT NULL,  -- snapshot complet de agent_meta
  change_summary TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_agent_config_versions_agent
  ON agent_config_versions(agent_id, version_number DESC);

-- RLS policies
ALTER TABLE agent_config_versions ENABLE ROW LEVEL SECURITY;

-- Allow users to read/write their own versions (or capsule owner)
CREATE POLICY "Users can read own agent config versions"
  ON agent_config_versions FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own agent config versions"
  ON agent_config_versions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own agent config versions"
  ON agent_config_versions FOR UPDATE
  USING (auth.uid() = created_by);
