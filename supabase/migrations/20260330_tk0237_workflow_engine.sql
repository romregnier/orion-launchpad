-- TK-0237: [ARCH-007] Durable Workflow Engine
-- Tables pour la persistance des exécutions de workflow

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID,
  capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  current_step_id TEXT,
  checkpoint JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT
);

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capsule_access" ON workflow_executions FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS workflow_step_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  attempt INTEGER DEFAULT 1,
  status TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT
);
