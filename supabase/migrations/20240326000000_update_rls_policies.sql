-- Allow public read access
CREATE POLICY "Allow public read access"
  ON questions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access"
  ON question_sequences FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access"
  ON question_sequence_items FOR SELECT
  TO anon
  USING (true);

-- Allow public write access for development
CREATE POLICY "Allow public write access"
  ON questions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public write access"
  ON question_sequences FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public write access"
  ON question_sequence_items FOR INSERT
  TO anon
  WITH CHECK (true); 