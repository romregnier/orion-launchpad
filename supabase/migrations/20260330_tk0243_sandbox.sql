-- TK-0243 [ARCH-014] Agent Sandbox — sandbox_policies + sandbox_executions
-- Graceful degradation: all operations are conditional

-- Sandbox policies table
CREATE TABLE IF NOT EXISTS sandbox_policies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  landlock_paths    text[] NOT NULL DEFAULT '{}',
  seccomp_syscalls  text[] NOT NULL DEFAULT '{}',
  network_allowed   boolean NOT NULL DEFAULT false,
  fs_read_only      boolean NOT NULL DEFAULT true,
  max_memory_mb     integer NOT NULL DEFAULT 256,
  max_cpu_percent   integer NOT NULL DEFAULT 25,
  timeout_ms        integer NOT NULL DEFAULT 10000,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Sandbox executions table
CREATE TABLE IF NOT EXISTS sandbox_executions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key   text NOT NULL,
  policy_id   uuid REFERENCES sandbox_policies(id) ON DELETE SET NULL,
  start_time  timestamptz NOT NULL DEFAULT now(),
  end_time    timestamptz,
  status      text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'violation', 'timeout')),
  violations  jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sandbox_executions_agent_key ON sandbox_executions(agent_key);
CREATE INDEX IF NOT EXISTS idx_sandbox_executions_policy_id ON sandbox_executions(policy_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_executions_start_time ON sandbox_executions(start_time DESC);

-- RLS
ALTER TABLE sandbox_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_executions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sandbox_policies' AND policyname = 'authenticated_users'
  ) THEN
    CREATE POLICY authenticated_users ON sandbox_policies
      FOR ALL TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sandbox_executions' AND policyname = 'authenticated_users'
  ) THEN
    CREATE POLICY authenticated_users ON sandbox_executions
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Seed default policies
INSERT INTO sandbox_policies (id, name, landlock_paths, seccomp_syscalls, network_allowed, fs_read_only, max_memory_mb, max_cpu_percent, timeout_ms)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Strict',
   ARRAY['/tmp/agent-workspace'],
   ARRAY['read', 'write', 'open', 'close', 'exit'],
   false, true, 128, 10, 5000),
  ('00000000-0000-0000-0000-000000000002', 'Standard',
   ARRAY['/tmp/agent-workspace', '/tmp/shared', '/usr/local/lib'],
   ARRAY['read', 'write', 'open', 'close', 'exit', 'stat', 'fstat', 'mmap', 'mprotect'],
   true, false, 512, 40, 30000),
  ('00000000-0000-0000-0000-000000000003', 'Permissive',
   ARRAY['/tmp', '/home', '/usr', '/var/log/agents'],
   ARRAY['read', 'write', 'open', 'close', 'exit', 'stat', 'fstat', 'mmap', 'mprotect', 'socket', 'connect', 'sendto', 'recvfrom', 'fork', 'clone'],
   true, false, 2048, 80, 120000)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE sandbox_policies IS 'TK-0243: Policies de sandbox kernel-level pour agents';
COMMENT ON TABLE sandbox_executions IS 'TK-0243: Historique des exécutions en sandbox';
