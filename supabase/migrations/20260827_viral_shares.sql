-- Viral Share Tokens Table
-- Stores shareable Future Type results with privacy-safe public data

CREATE TABLE IF NOT EXISTS future_type_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token VARCHAR(30) UNIQUE NOT NULL,

  -- Creator (optional - shares can be anonymous)
  creator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Public result data (safe to expose)
  future_type VARCHAR(100) NOT NULL,
  type_emoji VARCHAR(10),
  type_code VARCHAR(10),
  type_description TEXT,
  top_traits JSONB, -- Array of {label, name, percent}

  -- Privacy settings
  show_first_name BOOLEAN DEFAULT false,
  first_name VARCHAR(100),

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  -- Analytics counters
  share_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  test_start_count INTEGER DEFAULT 0,
  test_complete_count INTEGER DEFAULT 0,
  account_conversion_count INTEGER DEFAULT 0,

  -- Viral tracking
  generation INTEGER DEFAULT 0,
  parent_share_token VARCHAR(30),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_share_token ON future_type_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_creator_user ON future_type_shares(creator_user_id) WHERE creator_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_is_active ON future_type_shares(is_active) WHERE is_active = true;

-- RLS Policies

ALTER TABLE future_type_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can read active shares (public data only via API)
CREATE POLICY "Public can read active shares"
  ON future_type_shares
  FOR SELECT
  USING (is_active = true);

-- Anyone can create shares (including anonymous users)
CREATE POLICY "Anyone can create shares"
  ON future_type_shares
  FOR INSERT
  WITH CHECK (true);

-- Only creator can update their own shares
CREATE POLICY "Creators can update own shares"
  ON future_type_shares
  FOR UPDATE
  USING (
    creator_user_id IS NULL
    OR creator_user_id = auth.uid()
  );

-- Only creator can delete their own shares
CREATE POLICY "Creators can delete own shares"
  ON future_type_shares
  FOR DELETE
  USING (
    creator_user_id IS NOT NULL
    AND creator_user_id = auth.uid()
  );

-- Guest Sessions Table (for tracking guest test progress)

CREATE TABLE IF NOT EXISTS guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(30) UNIQUE NOT NULL,

  -- Referral tracking
  referral_token VARCHAR(30),
  referral_data JSONB,

  -- Test progress
  test_started BOOLEAN DEFAULT false,
  test_completed BOOLEAN DEFAULT false,
  future_type VARCHAR(100),
  type_code VARCHAR(10),
  top_traits JSONB,

  -- Conversion
  converted_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_guest_session_id ON guest_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_referral ON guest_sessions(referral_token) WHERE referral_token IS NOT NULL;

-- RLS for guest sessions
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can create guest sessions"
  ON guest_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can read own session by ID"
  ON guest_sessions
  FOR SELECT
  USING (true); -- Session ID acts as auth

CREATE POLICY "Public can update own session"
  ON guest_sessions
  FOR UPDATE
  USING (true); -- Session ID acts as auth

-- Viral Analytics View

CREATE OR REPLACE VIEW viral_funnel_stats AS
SELECT
  COUNT(*) as total_shares,
  SUM(share_count) as total_share_attempts,
  SUM(open_count) as total_opens,
  SUM(test_start_count) as total_test_starts,
  SUM(test_complete_count) as total_test_completes,
  SUM(account_conversion_count) as total_conversions,

  -- Rates
  CASE WHEN COUNT(*) > 0
    THEN ROUND(SUM(open_count)::numeric / COUNT(*)::numeric * 100, 1)
    ELSE 0
  END as open_rate_percent,

  CASE WHEN SUM(open_count) > 0
    THEN ROUND(SUM(test_start_count)::numeric / SUM(open_count)::numeric * 100, 1)
    ELSE 0
  END as test_start_rate_percent,

  CASE WHEN SUM(test_start_count) > 0
    THEN ROUND(SUM(test_complete_count)::numeric / SUM(test_start_count)::numeric * 100, 1)
    ELSE 0
  END as test_complete_rate_percent,

  -- Generation breakdown
  COUNT(*) FILTER (WHERE generation = 0) as gen_0_shares,
  COUNT(*) FILTER (WHERE generation = 1) as gen_1_shares,
  COUNT(*) FILTER (WHERE generation = 2) as gen_2_shares,
  COUNT(*) FILTER (WHERE generation >= 3) as gen_3_plus_shares,

  -- Time-based
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '24 hours') as shares_last_24h,
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '7 days') as shares_last_7d

FROM future_type_shares
WHERE is_active = true;

-- Function to clean up expired guest sessions
CREATE OR REPLACE FUNCTION cleanup_expired_guest_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM guest_sessions
  WHERE expires_at < now()
    AND converted_to_user_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment share open count
CREATE OR REPLACE FUNCTION increment_share_open(token VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE future_type_shares
  SET open_count = open_count + 1,
      updated_at = now()
  WHERE share_token = token
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment test start count
CREATE OR REPLACE FUNCTION increment_test_start(token VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE future_type_shares
  SET test_start_count = test_start_count + 1,
      updated_at = now()
  WHERE share_token = token
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment test complete count
CREATE OR REPLACE FUNCTION increment_test_complete(token VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE future_type_shares
  SET test_complete_count = test_complete_count + 1,
      updated_at = now()
  WHERE share_token = token
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
