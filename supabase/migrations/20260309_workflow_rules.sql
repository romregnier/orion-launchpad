-- Create workflow_rules table
CREATE TABLE IF NOT EXISTS public.workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN ('ticket_status_change','milestone_complete','ticket_created','ticket_assigned','label_added','build_task_complete','error_detected','new_project','agent_message','manual_trigger')),
  trigger_agent TEXT,
  trigger_value TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('notify_telegram','assign_agent','update_status','run_analysis','send_report','spawn_agent','create_ticket')),
  action_config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON public.workflow_rules FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.workflow_rules TO anon;
GRANT ALL ON public.workflow_rules TO authenticated;

-- Seed default rules
INSERT INTO public.workflow_rules (name, trigger_event, action_type, enabled, priority)
VALUES
  ('Notifier Romain quand tâche terminée', 'build_task_complete', 'notify_telegram', true, 10),
  ('Rex analyse les erreurs automatiquement', 'error_detected', 'assign_agent', true, 9),
  ('Analyser les nouveaux projets avec IA', 'new_project', 'run_analysis', true, 8),
  ('Mettre à jour statut sur message agent', 'agent_message', 'update_status', true, 7),
  ('Rapport hebdo le lundi', 'manual_trigger', 'send_report', false, 3),
  ('Review quand milestone atteint', 'milestone_complete', 'assign_agent', true, 6)
ON CONFLICT DO NOTHING;
