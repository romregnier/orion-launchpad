-- Migration: Semaine 2 — Goals + Board Approvals + Automations
-- Date: 2026-03-29
-- Author: Forge 🔨
-- Idempotent: oui

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. GOALS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id uuid NOT NULL,
  parent_goal_id uuid REFERENCES public.goals(id),
  title text NOT NULL,
  description text,
  level text NOT NULL DEFAULT 'capsule', -- 'capsule' | 'project' | 'sprint'
  status text DEFAULT 'active',
  target_date date,
  metrics jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_goals" ON public.goals;
CREATE POLICY "anon_all_goals" ON public.goals FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all_goals" ON public.goals;
CREATE POLICY "auth_all_goals" ON public.goals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ALTER TICKETS — add goal_id
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES public.goals(id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BOARD APPROVALS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.board_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id uuid NOT NULL,
  agent_key text NOT NULL,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}',
  status text DEFAULT 'pending', -- pending | approved | rejected | expired
  decided_by uuid,
  timeout_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.board_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_approvals" ON public.board_approvals;
CREATE POLICY "anon_all_approvals" ON public.board_approvals FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all_approvals" ON public.board_approvals;
CREATE POLICY "auth_all_approvals" ON public.board_approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AUTOMATIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  schedule text,
  script_path text,
  adapter_type text DEFAULT 'bash',
  adapter_config jsonb DEFAULT '{}',
  enabled boolean DEFAULT true,
  last_run_at timestamptz,
  last_run_status text,
  last_run_output text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_automations" ON public.automations;
CREATE POLICY "anon_all_automations" ON public.automations FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all_automations" ON public.automations;
CREATE POLICY "auth_all_automations" ON public.automations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SEEDERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Sample goal
INSERT INTO public.goals (capsule_id, title, description, level, status, target_date)
SELECT id, 'Atteindre 500k MAU en 2026', 'Objectif de croissance utilisateurs de la capsule Orion Build', 'capsule', 'active', '2026-12-31'
FROM public.capsules ORDER BY created_at ASC LIMIT 1
ON CONFLICT DO NOTHING;

-- Test approvals
INSERT INTO public.board_approvals (capsule_id, agent_key, action, detail)
SELECT id, 'forge', 'deploy', '{"description": "Déployer Sprint Semaine 2 sur orion-launchpad.surge.sh", "target": "orion-launchpad.surge.sh"}'::jsonb
FROM public.capsules ORDER BY created_at ASC LIMIT 1;

INSERT INTO public.board_approvals (capsule_id, agent_key, action, detail)
SELECT id, 'rex', 'security_scan', '{"description": "Lancer un audit de sécurité sur l API Mangas.io avant la mise en prod", "target": "api.mangas.io"}'::jsonb
FROM public.capsules ORDER BY created_at ASC LIMIT 1;

-- Automations seed
INSERT INTO public.automations (capsule_id, name, description, schedule, adapter_type, adapter_config, enabled)
SELECT c.id, 'Shop Automation — Sync 1001 Hobbies', 'Synchronisation des produits depuis le flux Kwanko vers MongoDB', '0 6 * * *', 'bash', '{"script": "/home/clawadmin/.openclaw/workspace/shop-automation/discover.js"}'::jsonb, true
FROM public.capsules c ORDER BY c.created_at ASC LIMIT 1;

INSERT INTO public.automations (capsule_id, name, description, schedule, adapter_type, adapter_config, enabled)
SELECT c.id, 'Shop Automation — Sync Awin (Fnac/Cultura)', 'Synchronisation des produits Awin vers MongoDB', '0 7 * * *', 'bash', '{"script": "/home/clawadmin/.openclaw/workspace/shop-automation/discover-awin.js"}'::jsonb, true
FROM public.capsules c ORDER BY c.created_at ASC LIMIT 1;

