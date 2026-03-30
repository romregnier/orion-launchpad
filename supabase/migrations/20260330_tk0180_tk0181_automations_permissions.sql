-- Migration: TK-0180 + TK-0181 — Automations next_run_at + Communication Permissions
-- Date: 2026-03-30
-- Author: Forge 🔨
-- Idempotent: oui

-- ─────────────────────────────────────────────────────────────────────────────
-- TK-0180: Add next_run_at column to automations
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- TK-0181: Create communication_permissions table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  capsule_id UUID NOT NULL REFERENCES public.capsules(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'team' CHECK (visibility IN ('public', 'team', 'admin', 'private')),
  can_message TEXT[] DEFAULT ARRAY['owner', 'admin', 'member'],
  can_mention TEXT[] DEFAULT ARRAY['owner', 'admin', 'member', 'junior'],
  can_view TEXT[] DEFAULT ARRAY['owner', 'admin', 'member', 'junior', 'viewer'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(capsule_id, agent_key)
);

-- RLS
ALTER TABLE public.communication_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read" ON public.communication_permissions;
CREATE POLICY "Authenticated users can read" ON public.communication_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert" ON public.communication_permissions;
CREATE POLICY "Authenticated users can insert" ON public.communication_permissions
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update" ON public.communication_permissions;
CREATE POLICY "Authenticated users can update" ON public.communication_permissions
  FOR UPDATE TO authenticated USING (true);

-- Also allow anon access (consistent with other tables in this project)
DROP POLICY IF EXISTS "anon_all_communication_permissions" ON public.communication_permissions;
CREATE POLICY "anon_all_communication_permissions" ON public.communication_permissions
  FOR ALL TO anon USING (true) WITH CHECK (true);
