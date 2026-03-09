-- Migration: TK-0208 — agent_conversations + agent_direct_messages
-- Date: 2026-03-09
-- Author: Forge 🔨

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: agent_conversations
-- Conversation threads between agents and users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key   TEXT        NOT NULL,
  title       TEXT,
  status      TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent_key
  ON public.agent_conversations (agent_key);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_status
  ON public.agent_conversations (status, created_at DESC);

-- RLS
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on agent_conversations"
  ON public.agent_conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.agent_conversations TO anon;
GRANT ALL ON public.agent_conversations TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: agent_direct_messages
-- Direct messages within a conversation (agent↔user or agent↔agent)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_direct_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'agent', 'system')),
  content         TEXT        NOT NULL,
  agent_key       TEXT        NOT NULL,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_dm_conversation
  ON public.agent_direct_messages (conversation_id);

CREATE INDEX IF NOT EXISTS idx_agent_dm_agent_key
  ON public.agent_direct_messages (agent_key);

CREATE INDEX IF NOT EXISTS idx_agent_dm_metadata
  ON public.agent_direct_messages USING gin (metadata);

-- RLS
ALTER TABLE public.agent_direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on agent_direct_messages"
  ON public.agent_direct_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.agent_direct_messages TO anon;
GRANT ALL ON public.agent_direct_messages TO authenticated;
