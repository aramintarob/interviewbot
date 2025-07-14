-- Create a function to truncate the questions table
CREATE OR REPLACE FUNCTION truncate_questions()
RETURNS void AS $$
BEGIN
  -- Disable triggers temporarily
  ALTER TABLE questions DISABLE TRIGGER ALL;
  
  -- Delete all records
  DELETE FROM questions;
  
  -- Re-enable triggers
  ALTER TABLE questions ENABLE TRIGGER ALL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 