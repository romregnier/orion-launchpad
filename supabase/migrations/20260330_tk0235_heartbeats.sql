-- TK-0235: [ARCH-006] Heartbeat System — Pulse

CREATE TABLE IF NOT EXISTS agent_heartbeats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES canvas_agents(id) ON DELETE CASCADE,
  capsule_id UUID,
  heartbeat_type TEXT NOT NULL DEFAULT 'scheduled',  -- 'scheduled' | 'on_demand' | 'task_start' | 'task_end'
  status TEXT NOT NULL DEFAULT 'alive',              -- 'alive' | 'idle' | 'error'
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read heartbeats" ON agent_heartbeats
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert heartbeats" ON agent_heartbeats
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Index pour les requêtes récentes (hot path)
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_agent_created
  ON agent_heartbeats(agent_id, created_at DESC);

-- Index pour les requêtes par capsule (realtime)
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_capsule_created
  ON agent_heartbeats(capsule_id, created_at DESC);
