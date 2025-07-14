-- Create a function to delete all questions
CREATE OR REPLACE FUNCTION delete_all_questions()
RETURNS void AS $$
BEGIN
  DELETE FROM questions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 