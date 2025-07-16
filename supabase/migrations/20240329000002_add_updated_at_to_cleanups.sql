-- Add updated_at column to interview_cleanups
ALTER TABLE interview_cleanups
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL; 