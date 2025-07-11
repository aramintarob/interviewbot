-- Add branching_conditions table
CREATE TABLE IF NOT EXISTS branching_conditions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('keyword', 'sentiment', 'duration')),
  value TEXT NOT NULL,
  next_question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add parent_question_id to questions table
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS parent_question_id UUID REFERENCES questions(id) ON DELETE SET NULL;

-- Add RLS policies for branching_conditions
ALTER TABLE branching_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON branching_conditions
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON branching_conditions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON branching_conditions
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON branching_conditions
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for branching_conditions
CREATE TRIGGER update_branching_conditions_updated_at
  BEFORE UPDATE ON branching_conditions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_branching_conditions_question_id ON branching_conditions(question_id);
CREATE INDEX IF NOT EXISTS idx_branching_conditions_next_question_id ON branching_conditions(next_question_id);
CREATE INDEX IF NOT EXISTS idx_questions_parent_question_id ON questions(parent_question_id); 