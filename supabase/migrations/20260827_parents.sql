-- Parents Table and Parent-Student Links
-- For parent dashboard and student progress tracking

-- Parents table
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Parent-Student Links table
CREATE TABLE IF NOT EXISTS parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active',
  invite_code VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_psl_parent ON parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_psl_student ON parent_student_links(student_id);
CREATE INDEX IF NOT EXISTS idx_psl_invite ON parent_student_links(invite_code);

-- RLS Policies
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for parents table (for registration)
CREATE POLICY "Allow anonymous parent operations"
  ON parents
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow anonymous read/write for parent_student_links
CREATE POLICY "Allow anonymous link operations"
  ON parent_student_links
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update timestamp trigger for parents
CREATE OR REPLACE FUNCTION update_parent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parent_updated
  BEFORE UPDATE ON parents
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_timestamp();

CREATE TRIGGER psl_updated
  BEFORE UPDATE ON parent_student_links
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_timestamp();
