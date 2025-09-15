-- Remove the unique constraint on email_address since multiple users could have connection issues
-- and we should allow them to retry without constraint violations
ALTER TABLE gmail_tokens DROP CONSTRAINT IF EXISTS gmail_tokens_email_address_key;

-- The user_id should be the primary way to identify tokens, not email_address
-- Add an index on user_id for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_gmail_tokens_user_id ON gmail_tokens(user_id);