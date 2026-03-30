-- TK-0188: Knowledge Sources — base
-- Migration: knowledge_sources table

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES knowledge_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('notion', 'google_drive', 'ga4', 'url', 'file', 'api', 'database')),
  config JSONB DEFAULT '{}',           -- credentials, IDs, etc. (chiffrés)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'error', 'paused')),
  last_sync_at TIMESTAMPTZ,
  entry_count INTEGER DEFAULT 0,
  error_message TEXT,
  capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ks_read" ON knowledge_sources FOR SELECT USING (true);
CREATE POLICY "ks_write" ON knowledge_sources FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX idx_ks_space_id ON knowledge_sources(space_id);
CREATE INDEX idx_ks_capsule ON knowledge_sources(capsule_id);
