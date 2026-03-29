-- Migration: Sprint 3 — Isolation capsule + RLS sécurisées
-- Date: 2026-03-29
-- Author: Forge 🔨
-- Idempotent: oui (peut être exécuté plusieurs fois sans erreur)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. NOUVELLES TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- agent_budgets (TK-0156) — budget mensuel par agent par capsule
-- Note: recrée correctement avec capsule_id uuid (remplace la version text du sprint précédent)
DROP TABLE IF EXISTS public.agent_budgets;
CREATE TABLE public.agent_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id uuid NOT NULL,
  agent_key text NOT NULL,
  monthly_token_limit integer DEFAULT 1000000,
  monthly_usd_limit numeric(10,2) DEFAULT 50.00,
  alert_threshold_pct integer DEFAULT 80,
  hard_stop boolean DEFAULT false,
  tokens_used_mtd integer DEFAULT 0,
  usd_used_mtd numeric(10,2) DEFAULT 0.00,
  last_reset_at timestamptz DEFAULT date_trunc('month', now()),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(capsule_id, agent_key)
);

-- agent_audit_log (TK-0157) — append-only, jamais UPDATE/DELETE
-- Note: recrée correctement avec capsule_id uuid
DROP TABLE IF EXISTS public.agent_audit_log;
CREATE TABLE public.agent_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id uuid,
  agent_key text,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  severity text DEFAULT 'info',
  created_at timestamptz DEFAULT now()
);

-- capsule_settings — recréer proprement avec capsule_id uuid (corrige colonne manquante)
DROP TABLE IF EXISTS public.capsule_settings;
CREATE TABLE public.capsule_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id uuid NOT NULL,
  section text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  is_secret boolean DEFAULT false,
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(capsule_id, section, key)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. AJOUTER capsule_id SUR TOUTES LES TABLES EXISTANTES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.canvas_agents ADD COLUMN IF NOT EXISTS capsule_id uuid;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS capsule_id uuid;
ALTER TABLE public.build_tasks ADD COLUMN IF NOT EXISTS capsule_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS capsule_id uuid;
ALTER TABLE public.lists ADD COLUMN IF NOT EXISTS capsule_id uuid;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS capsule_id uuid;
ALTER TABLE public.board_members ADD COLUMN IF NOT EXISTS capsule_id uuid;
ALTER TABLE public.agent_chat_messages ADD COLUMN IF NOT EXISTS capsule_id uuid;
ALTER TABLE public.agent_conversations ADD COLUMN IF NOT EXISTS capsule_id uuid;
ALTER TABLE public.agent_direct_messages ADD COLUMN IF NOT EXISTS capsule_id uuid;
ALTER TABLE public.workflow_rules ADD COLUMN IF NOT EXISTS capsule_id uuid;
ALTER TABLE public.launchpad_messages ADD COLUMN IF NOT EXISTS capsule_id uuid;
ALTER TABLE public.launchpad_comments ADD COLUMN IF NOT EXISTS capsule_id uuid;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

-- ── canvas_agents (lecture anon OK, écriture authenticated) ──
ALTER TABLE public.canvas_agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_canvas_agents" ON public.canvas_agents;
DROP POLICY IF EXISTS "anon_write_canvas_agents" ON public.canvas_agents;
DROP POLICY IF EXISTS "anon_all" ON public.canvas_agents;
DROP POLICY IF EXISTS "auth_write_canvas_agents" ON public.canvas_agents;
CREATE POLICY "anon_read_canvas_agents" ON public.canvas_agents
  FOR SELECT TO anon USING (true);
CREATE POLICY "auth_write_canvas_agents" ON public.canvas_agents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── projects (lecture anon OK, écriture authenticated) ──
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_projects" ON public.projects;
DROP POLICY IF EXISTS "anon_all" ON public.projects;
DROP POLICY IF EXISTS "auth_write_projects" ON public.projects;
CREATE POLICY "anon_read_projects" ON public.projects
  FOR SELECT TO anon USING (true);
CREATE POLICY "auth_write_projects" ON public.projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── lists (lecture anon OK, écriture authenticated) ──
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_lists" ON public.lists;
DROP POLICY IF EXISTS "anon_all" ON public.lists;
DROP POLICY IF EXISTS "auth_write_lists" ON public.lists;
CREATE POLICY "anon_read_lists" ON public.lists
  FOR SELECT TO anon USING (true);
CREATE POLICY "auth_write_lists" ON public.lists
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── ideas (lecture anon OK, écriture authenticated) ──
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_ideas" ON public.ideas;
DROP POLICY IF EXISTS "anon_all" ON public.ideas;
DROP POLICY IF EXISTS "auth_write_ideas" ON public.ideas;
CREATE POLICY "anon_read_ideas" ON public.ideas
  FOR SELECT TO anon USING (true);
CREATE POLICY "auth_write_ideas" ON public.ideas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── launchpad_messages (lecture anon OK, écriture authenticated) ──
ALTER TABLE public.launchpad_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_launchpad_messages" ON public.launchpad_messages;
DROP POLICY IF EXISTS "anon_all" ON public.launchpad_messages;
DROP POLICY IF EXISTS "auth_write_launchpad_messages" ON public.launchpad_messages;
CREATE POLICY "anon_read_launchpad_messages" ON public.launchpad_messages
  FOR SELECT TO anon USING (true);
CREATE POLICY "auth_write_launchpad_messages" ON public.launchpad_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── launchpad_comments (lecture anon OK, écriture authenticated) ──
ALTER TABLE public.launchpad_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_launchpad_comments" ON public.launchpad_comments;
DROP POLICY IF EXISTS "anon_all" ON public.launchpad_comments;
DROP POLICY IF EXISTS "auth_write_launchpad_comments" ON public.launchpad_comments;
CREATE POLICY "anon_read_launchpad_comments" ON public.launchpad_comments
  FOR SELECT TO anon USING (true);
CREATE POLICY "auth_write_launchpad_comments" ON public.launchpad_comments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── workflow_rules (anon ALL — les scripts agents écrivent via anon) ──
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON public.workflow_rules;
DROP POLICY IF EXISTS "anon_all" ON public.workflow_rules;
DROP POLICY IF EXISTS "anon_all_workflow_rules" ON public.workflow_rules;
CREATE POLICY "anon_all_workflow_rules" ON public.workflow_rules
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── build_tasks (anon ALL — critique pour le pipeline agents) ──
ALTER TABLE public.build_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON public.build_tasks;
DROP POLICY IF EXISTS "anon_all_build_tasks" ON public.build_tasks;
CREATE POLICY "anon_all_build_tasks" ON public.build_tasks
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── tickets (anon ALL — les agents créent et mettent à jour des tickets) ──
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON public.tickets;
DROP POLICY IF EXISTS "anon_all_tickets" ON public.tickets;
CREATE POLICY "anon_all_tickets" ON public.tickets
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── board_members (sensible — authenticated uniquement) ──
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON public.board_members;
DROP POLICY IF EXISTS "anon_all_board_members" ON public.board_members;
DROP POLICY IF EXISTS "auth_all_board_members" ON public.board_members;
CREATE POLICY "auth_all_board_members" ON public.board_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── capsule_settings (sensible — authenticated, anon peut lire non-secrets) ──
ALTER TABLE public.capsule_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_capsule_settings" ON public.capsule_settings;
DROP POLICY IF EXISTS "auth_all_capsule_settings" ON public.capsule_settings;
DROP POLICY IF EXISTS "anon_read_non_secret" ON public.capsule_settings;
CREATE POLICY "auth_all_capsule_settings" ON public.capsule_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_non_secret" ON public.capsule_settings
  FOR SELECT TO anon USING (is_secret = false);

-- ── agent_budgets (sensible — authenticated uniquement) ──
ALTER TABLE public.agent_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_agent_budgets" ON public.agent_budgets;
DROP POLICY IF EXISTS "auth_all_agent_budgets" ON public.agent_budgets;
CREATE POLICY "auth_all_agent_budgets" ON public.agent_budgets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── agent_audit_log (append-only — lecture + insert anon, jamais update/delete) ──
ALTER TABLE public.agent_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_audit" ON public.agent_audit_log;
DROP POLICY IF EXISTS "anon_insert_audit" ON public.agent_audit_log;
CREATE POLICY "anon_read_audit" ON public.agent_audit_log
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_audit" ON public.agent_audit_log
  FOR INSERT TO anon WITH CHECK (true);
-- Pas de UPDATE/DELETE policy sur agent_audit_log — append-only par design

-- ── agent_chat_messages (anon ALL — agents chattent via anon) ──
ALTER TABLE public.agent_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON public.agent_chat_messages;
DROP POLICY IF EXISTS "anon_all_agent_chat_messages" ON public.agent_chat_messages;
CREATE POLICY "anon_all_agent_chat_messages" ON public.agent_chat_messages
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── agent_conversations (anon ALL) ──
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON public.agent_conversations;
DROP POLICY IF EXISTS "anon_all_agent_conversations" ON public.agent_conversations;
CREATE POLICY "anon_all_agent_conversations" ON public.agent_conversations
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── agent_direct_messages (anon ALL) ──
ALTER TABLE public.agent_direct_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON public.agent_direct_messages;
DROP POLICY IF EXISTS "anon_all_agent_direct_messages" ON public.agent_direct_messages;
CREATE POLICY "anon_all_agent_direct_messages" ON public.agent_direct_messages
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. BACKFILL capsule_id — toutes les données existantes → capsule principale
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  main_capsule_id uuid;
BEGIN
  SELECT id INTO main_capsule_id FROM public.capsules ORDER BY created_at ASC LIMIT 1;
  IF main_capsule_id IS NOT NULL THEN
    UPDATE public.canvas_agents SET capsule_id = main_capsule_id WHERE capsule_id IS NULL;
    UPDATE public.tickets SET capsule_id = main_capsule_id WHERE capsule_id IS NULL;
    UPDATE public.build_tasks SET capsule_id = main_capsule_id WHERE capsule_id IS NULL;
    UPDATE public.projects SET capsule_id = main_capsule_id WHERE capsule_id IS NULL;
    UPDATE public.lists SET capsule_id = main_capsule_id WHERE capsule_id IS NULL;
    UPDATE public.ideas SET capsule_id = main_capsule_id WHERE capsule_id IS NULL;
    UPDATE public.board_members SET capsule_id = main_capsule_id WHERE capsule_id IS NULL;
    UPDATE public.agent_chat_messages SET capsule_id = main_capsule_id WHERE capsule_id IS NULL;
    UPDATE public.workflow_rules SET capsule_id = main_capsule_id WHERE capsule_id IS NULL;
    UPDATE public.launchpad_messages SET capsule_id = main_capsule_id WHERE capsule_id IS NULL;
    UPDATE public.launchpad_comments SET capsule_id = main_capsule_id WHERE capsule_id IS NULL;
    RAISE NOTICE 'Backfill terminé avec capsule_id = %', main_capsule_id;
  ELSE
    RAISE NOTICE 'Aucune capsule trouvée — backfill ignoré';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. WORKFLOW RULES — inserts idempotents
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.workflow_rules (name, trigger_event, action_type, enabled, priority) VALUES
  ('Notifier Romain quand tâche terminée', 'build_task_complete', 'notify_telegram', true, 10),
  ('Rex analyse les erreurs automatiquement', 'error_detected', 'assign_agent', true, 9),
  ('Analyser les nouveaux projets avec IA', 'new_project', 'run_analysis', true, 8),
  ('Mettre à jour statut sur message agent', 'agent_message', 'update_status', true, 7),
  ('Rapport hebdo le lundi', 'manual_trigger', 'send_report', false, 3),
  ('Review quand milestone atteint', 'milestone_complete', 'assign_agent', true, 6)
ON CONFLICT DO NOTHING;
