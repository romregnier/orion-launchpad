-- TK-0238: [ARCH-008] Learning Loop
-- Table pour détecter passivement les patterns d'efficacité (Phase 1: observation only)

CREATE TABLE IF NOT EXISTS learning_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,  -- 'routing' | 'model_selection' | 'prompt' | 'workflow'
  pattern_key TEXT NOT NULL,   -- identifiant du pattern (ex: 'agent:forge:task_type:dev')
  success_rate FLOAT DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  avg_cost_cents INTEGER DEFAULT 0,
  sample_count INTEGER DEFAULT 0,
  last_observed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(capsule_id, pattern_type, pattern_key)
);

ALTER TABLE learning_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capsule_read" ON learning_patterns FOR SELECT USING (true);
CREATE POLICY "service_write" ON learning_patterns FOR INSERT WITH CHECK (true);
CREATE POLICY "service_update" ON learning_patterns FOR UPDATE USING (true);

CREATE INDEX idx_learning_patterns_capsule ON learning_patterns(capsule_id);
CREATE INDEX idx_learning_patterns_type ON learning_patterns(pattern_type);
