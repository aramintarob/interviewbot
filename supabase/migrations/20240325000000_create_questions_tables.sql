-- Create the questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add RLS policies
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read questions
CREATE POLICY "Allow anyone to read questions"
  ON questions FOR SELECT
  USING (true);

-- Only allow authenticated users to insert questions
CREATE POLICY "Allow authenticated users to insert questions"
  ON questions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only allow authenticated users to update their own questions
CREATE POLICY "Allow authenticated users to update their own questions"
  ON questions FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Only allow authenticated users to delete their own questions
CREATE POLICY "Allow authenticated users to delete their own questions"
  ON questions FOR DELETE
  USING (auth.role() = 'authenticated'); 