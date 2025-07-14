-- Drop existing policies
DROP POLICY IF EXISTS "Allow anyone to read questions" ON questions;
DROP POLICY IF EXISTS "Allow authenticated users to insert questions" ON questions;
DROP POLICY IF EXISTS "Allow authenticated users to update their own questions" ON questions;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own questions" ON questions;

-- Create new policies
CREATE POLICY "Allow anyone to read questions"
  ON questions FOR SELECT
  USING (true);

CREATE POLICY "Allow anyone to insert questions"
  ON questions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anyone to update questions"
  ON questions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anyone to delete questions"
  ON questions FOR DELETE
  USING (true); 