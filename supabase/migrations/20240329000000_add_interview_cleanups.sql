-- Create interview_cleanups table
CREATE TABLE IF NOT EXISTS interview_cleanups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prefix TEXT NOT NULL,
  cleanup_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add index for cleanup date queries
CREATE INDEX IF NOT EXISTS idx_interview_cleanups_cleanup_date ON interview_cleanups(cleanup_date);

-- Add RLS policies
ALTER TABLE interview_cleanups ENABLE ROW LEVEL SECURITY;

-- Allow insert for authenticated users
CREATE POLICY "Allow insert for authenticated users" ON interview_cleanups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow read for authenticated users
CREATE POLICY "Allow read for authenticated users" ON interview_cleanups
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow delete for authenticated users
CREATE POLICY "Allow delete for authenticated users" ON interview_cleanups
  FOR DELETE
  TO authenticated
  USING (true); 