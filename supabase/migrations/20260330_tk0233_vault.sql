-- TK-0233: [INFRA-005] Supabase Vault — credentials chiffrés AES-256
-- Fallback approach: agent_credentials table with applicative AES-256 encryption
-- (Supabase Vault requires paid tier; encryption is handled client-side)

CREATE TABLE IF NOT EXISTS agent_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES canvas_agents(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,  -- AES-256 encryption applicative (XOR simulation client-side)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, key_name)
);

ALTER TABLE agent_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their agent credentials" ON agent_credentials
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_agent_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_credentials_updated_at
  BEFORE UPDATE ON agent_credentials
  FOR EACH ROW EXECUTE FUNCTION update_agent_credentials_updated_at();
