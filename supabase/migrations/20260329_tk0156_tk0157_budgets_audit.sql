-- Migration: TK-0156 + TK-0157 — agent_budgets + agent_audit_log
-- Date: 2026-03-29
-- Author: Forge 🔨

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: agent_budgets (TK-0156)
-- Budget mensuel par agent pour le cost tracking
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key text NOT NULL REFERENCES public.canvas_agents(agent_key) ON DELETE CASCADE,
  capsule_id text,
  monthly_token_limit integer DEFAULT 1000000,
  monthly_usd_limit numeric(10,2) DEFAULT 50.00,
  alert_threshold_pct integer DEFAULT 80,
  hard_stop boolean DEFAULT false,
  tokens_used_mtd integer DEFAULT 0,
  usd_used_mtd numeric(10,2) DEFAULT 0.00,
  last_reset_at timestamptz DEFAULT date_trunc('month', now()),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_agent_budgets" ON public.agent_budgets FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: agent_audit_log (TK-0157)
-- Log immuable des events par capsule — append-only (pas d'UPDATE/DELETE)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id text,
  agent_key text,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  severity text DEFAULT 'info',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_audit" ON public.agent_audit_log FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_audit" ON public.agent_audit_log FOR INSERT TO anon WITH CHECK (true);
-- append-only : pas de UPDATE/DELETE policy
