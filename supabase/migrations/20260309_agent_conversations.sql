-- Migration: TK-0208 — agent_chat_messages (table réelle du code)
-- Date: 2026-03-09
-- Author: Forge 🔨
-- Note: agent_conversations + agent_direct_messages déjà créées dans 20260309_agent_messaging.sql
--       Cette migration crée agent_chat_messages, la table effectivement utilisée par AgentChatPanel.tsx

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: agent_chat_messages
-- Messages directs entre un utilisateur et un agent dans le Launchpad
-- Utilisée par : src/components/AgentChatPanel.tsx
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_chat_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key     TEXT        NOT NULL,           -- ex: 'forge', 'rex', 'nova', 'orion'
  role          TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'agent', 'system')),
  message       TEXT        NOT NULL,           -- contenu du message
  user_id       TEXT,                           -- identifiant de l'utilisateur (peut être null côté agent)
  read_by_agent BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performance (filtre par agent_key + user_id — pattern utilisé dans AgentChatPanel)
CREATE INDEX IF NOT EXISTS idx_acm_agent_key
  ON public.agent_chat_messages (agent_key);

CREATE INDEX IF NOT EXISTS idx_acm_user_agent
  ON public.agent_chat_messages (agent_key, user_id);

CREATE INDEX IF NOT EXISTS idx_acm_created_at
  ON public.agent_chat_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_acm_unread
  ON public.agent_chat_messages (agent_key, read_by_agent)
  WHERE read_by_agent = FALSE;

-- RLS — accès total (même pattern que les autres tables Launchpad)
ALTER TABLE public.agent_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on agent_chat_messages"
  ON public.agent_chat_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.agent_chat_messages TO anon;
GRANT ALL ON public.agent_chat_messages TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Complément: agent_conversations (si absente, alias sécurisé)
-- Déjà créée dans 20260309_agent_messaging.sql — IF NOT EXISTS en guarde-fou
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key   TEXT        NOT NULL,
  title       TEXT,
  project     TEXT,
  status      TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent_key
  ON public.agent_conversations (agent_key);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all operations on agent_conversations"
  ON public.agent_conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.agent_conversations TO anon;
GRANT ALL ON public.agent_conversations TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Complément: agent_direct_messages (si absente, alias sécurisé)
-- Déjà créée dans 20260309_agent_messaging.sql — IF NOT EXISTS en garde-fou
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

CREATE INDEX IF NOT EXISTS idx_agent_dm_conversation
  ON public.agent_direct_messages (conversation_id);

CREATE INDEX IF NOT EXISTS idx_agent_dm_agent_key
  ON public.agent_direct_messages (agent_key);

ALTER TABLE public.agent_direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all operations on agent_direct_messages"
  ON public.agent_direct_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.agent_direct_messages TO anon;
GRANT ALL ON public.agent_direct_messages TO authenticated;
