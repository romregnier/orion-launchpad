-- TK-0226 — Agent Memory (episodic + core)
-- Migration créée le 2026-03-30

CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key TEXT NOT NULL,
  capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('core', 'episodic')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_key ON agent_memory(agent_key);
CREATE INDEX IF NOT EXISTS idx_agent_memory_capsule ON agent_memory(capsule_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(memory_type);

-- RLS
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users read agent_memory" ON agent_memory FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth users write agent_memory" ON agent_memory FOR ALL USING (auth.role() = 'authenticated');
