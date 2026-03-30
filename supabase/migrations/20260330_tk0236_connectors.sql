-- TK-0236: [ARCH-009] BaseConnector SDK
-- Définitions persistantes des connecteurs

CREATE TABLE IF NOT EXISTS connector_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  config JSONB DEFAULT '{}',
  capabilities JSONB DEFAULT '[]',
  knowledge_space_id UUID,
  enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE connector_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capsule_members_read" ON connector_definitions FOR SELECT USING (true);
CREATE POLICY "authenticated_write" ON connector_definitions FOR ALL USING (auth.uid() IS NOT NULL);
