-- Vylium Profile Storage
-- Persists assessment results across domains and devices

CREATE TABLE IF NOT EXISTS vylium_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner (one of these should be set)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_session_id VARCHAR(30),

  -- Raw scores (RIASEC)
  scores JSONB NOT NULL DEFAULT '{"R":0,"I":0,"A":0,"S":0,"E":0,"C":0}',

  -- Overlay trait scores
  overlay_scores JSONB DEFAULT '{}',

  -- Question answers (for resuming)
  answers JSONB DEFAULT '{}',

  -- Completion status
  profile_complete BOOLEAN DEFAULT false,
  question_count INTEGER DEFAULT 50,
  answered_count INTEGER DEFAULT 0,

  -- Computed type (cached for quick access)
  type_code VARCHAR(10),
  type_name VARCHAR(100),
  type_emoji VARCHAR(10),

  -- Top 3 dimensions (cached)
  top_dimensions JSONB,

  -- Normalized 0-100 scores (cached)
  normalized_scores JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vylium_user ON vylium_profiles(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vylium_guest ON vylium_profiles(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vylium_user_unique ON vylium_profiles(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vylium_guest_unique ON vylium_profiles(guest_session_id) WHERE guest_session_id IS NOT NULL;

-- RLS Policies
ALTER TABLE vylium_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own profiles
CREATE POLICY "Users can manage own profile"
  ON vylium_profiles
  FOR ALL
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND guest_session_id IS NOT NULL)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (user_id IS NULL AND guest_session_id IS NOT NULL)
  );

-- Allow anonymous inserts for guests
CREATE POLICY "Allow guest profile creation"
  ON vylium_profiles
  FOR INSERT
  WITH CHECK (user_id IS NULL AND guest_session_id IS NOT NULL);

-- Allow anonymous reads by guest_session_id
CREATE POLICY "Guests can read own profile"
  ON vylium_profiles
  FOR SELECT
  USING (guest_session_id IS NOT NULL);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_vylium_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vylium_profile_updated
  BEFORE UPDATE ON vylium_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_vylium_profile_timestamp();

-- Function to convert guest profile to user profile
CREATE OR REPLACE FUNCTION convert_guest_to_user_profile(
  p_guest_session_id VARCHAR,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Check if user already has a profile
  SELECT id INTO v_profile_id FROM vylium_profiles WHERE user_id = p_user_id;

  IF v_profile_id IS NOT NULL THEN
    -- User already has a profile, delete the guest one
    DELETE FROM vylium_profiles WHERE guest_session_id = p_guest_session_id AND user_id IS NULL;
    RETURN v_profile_id;
  END IF;

  -- Convert guest profile to user profile
  UPDATE vylium_profiles
  SET user_id = p_user_id,
      guest_session_id = NULL,
      updated_at = now()
  WHERE guest_session_id = p_guest_session_id
    AND user_id IS NULL
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
