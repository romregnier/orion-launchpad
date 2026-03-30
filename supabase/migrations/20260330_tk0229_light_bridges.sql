-- TK-0229 [FEAT-006] Light Bridges — inter-capsule networking
-- Migration: 20260330_tk0229_light_bridges

CREATE TABLE IF NOT EXISTS light_bridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE,
  target_capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE,
  bridge_type TEXT DEFAULT 'knowledge', -- knowledge | agent | workflow
  permissions JSONB DEFAULT '{"read": true, "write": false}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE light_bridges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own bridges" ON light_bridges
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users create bridges" ON light_bridges
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users update own bridges" ON light_bridges
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users delete own bridges" ON light_bridges
  FOR DELETE USING (auth.uid() = created_by);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_light_bridges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER light_bridges_updated_at
  BEFORE UPDATE ON light_bridges
  FOR EACH ROW EXECUTE FUNCTION update_light_bridges_updated_at();
