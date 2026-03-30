-- TK-0185 — Agent sessions persistantes
-- Permet aux agents de maintenir un contexte de conversation persistant entre sessions

CREATE TABLE IF NOT EXISTS agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key text NOT NULL,
  capsule_id uuid REFERENCES capsules(id) ON DELETE CASCADE,
  session_name text,
  context_summary text,
  message_count integer DEFAULT 0,
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage their agent sessions"
  ON agent_sessions FOR ALL USING (true);

CREATE INDEX idx_agent_sessions_agent_key ON agent_sessions(agent_key);
CREATE INDEX idx_agent_sessions_capsule ON agent_sessions(capsule_id);
