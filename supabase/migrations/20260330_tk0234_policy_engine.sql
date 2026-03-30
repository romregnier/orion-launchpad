-- TK-0234: [ARCH-005] Policy Engine Gravity — YAML déclaratif versionné

CREATE TABLE IF NOT EXISTS capsule_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  capsule_id UUID REFERENCES capsules(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  policy_yaml TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(capsule_id, version)
);

ALTER TABLE capsule_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Capsule members can read policies" ON capsule_policies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage policies" ON capsule_policies
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Index for efficient version queries
CREATE INDEX IF NOT EXISTS idx_capsule_policies_capsule_active
  ON capsule_policies(capsule_id, is_active, version DESC);
