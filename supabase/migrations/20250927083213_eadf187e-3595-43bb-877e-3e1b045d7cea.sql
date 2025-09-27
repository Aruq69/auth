-- Add unique constraint to prevent duplicate emails per user
-- We'll use a combination of user_id, subject, sender, and received_date to ensure uniqueness
-- This handles cases where message_id might not be available or reliable

-- First, let's remove any existing duplicates (keep the one with the earliest created_at)
DELETE FROM emails 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, subject, sender, received_date) id
  FROM emails 
  ORDER BY user_id, subject, sender, received_date, created_at ASC
);

-- Add unique constraint to prevent future duplicates
-- Using a combination of user_id, subject, sender, and received_date
ALTER TABLE emails 
ADD CONSTRAINT unique_email_per_user 
UNIQUE (user_id, subject, sender, received_date);

-- Also add an index on message_id for better performance when it's available
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id) WHERE message_id IS NOT NULL;

-- Add an index on outlook_id for Outlook integration performance
CREATE INDEX IF NOT EXISTS idx_emails_outlook_id ON emails(outlook_id) WHERE outlook_id IS NOT NULL;