-- Clear all questions from the database
TRUNCATE TABLE questions CASCADE;

-- Reset the sequence if any
ALTER SEQUENCE questions_id_seq RESTART WITH 1; 