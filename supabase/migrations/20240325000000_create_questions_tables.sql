-- Create enum types for question types and difficulties
CREATE TYPE question_type AS ENUM ('open_ended', 'multiple_choice', 'behavioral', 'technical');
CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard');

-- Create questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  type question_type NOT NULL,
  difficulty question_difficulty NOT NULL,
  category TEXT NOT NULL,
  expected_duration INTEGER NOT NULL CHECK (expected_duration >= 30 AND expected_duration <= 600),
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sequences table
CREATE TABLE question_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  difficulty question_difficulty NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for questions in sequences
CREATE TABLE question_sequence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES question_sequences(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sequence_id, question_id),
  UNIQUE(sequence_id, "order")
);

-- Create indexes
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);
CREATE INDEX idx_sequence_items_sequence ON question_sequence_items(sequence_id);
CREATE INDEX idx_sequence_items_question ON question_sequence_items(question_id);
CREATE INDEX idx_sequence_items_order ON question_sequence_items("order");

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sequences_updated_at
  BEFORE UPDATE ON question_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_sequence_items ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to all authenticated users"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read access to all authenticated users"
  ON question_sequences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read access to all authenticated users"
  ON question_sequence_items FOR SELECT
  TO authenticated
  USING (true);

-- Allow write access only to admin users (you'll need to set up admin role)
CREATE POLICY "Allow write access to admin users"
  ON questions FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow write access to admin users"
  ON question_sequences FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow write access to admin users"
  ON question_sequence_items FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin'); 