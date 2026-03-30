-- TK-0230 — Knowledge Spaces (Nebula)
-- Migration créée le 2026-03-30

CREATE TABLE IF NOT EXISTS knowledge_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📚',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
  allowed_agents TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES knowledge_spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE knowledge_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read knowledge" ON knowledge_spaces FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth write knowledge" ON knowledge_spaces FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth read entries" ON knowledge_entries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth write entries" ON knowledge_entries FOR ALL USING (auth.role() = 'authenticated');
