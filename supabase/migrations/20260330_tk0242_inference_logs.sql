-- TK-0242 [ARCH-013] Inference Proxy — inference_logs table
-- Graceful degradation: all operations are conditional

CREATE TABLE IF NOT EXISTS inference_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      text,
  timestamp     timestamptz NOT NULL DEFAULT now(),
  model         text NOT NULL,
  tokens_used   integer NOT NULL DEFAULT 0,
  pii_count     integer NOT NULL DEFAULT 0,
  duration_ms   integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'rate_limited')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for agent lookups
CREATE INDEX IF NOT EXISTS idx_inference_logs_agent_id ON inference_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_inference_logs_timestamp ON inference_logs(timestamp DESC);

-- Row-level security (graceful: add policies only if table exists)
ALTER TABLE inference_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inference_logs' AND policyname = 'authenticated_users'
  ) THEN
    CREATE POLICY authenticated_users ON inference_logs
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

COMMENT ON TABLE inference_logs IS 'TK-0242: Logs des appels inference proxy avec redaction PII';
