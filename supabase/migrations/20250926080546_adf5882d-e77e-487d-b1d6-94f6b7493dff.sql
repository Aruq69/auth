-- Add foreign key relationship between emails and profiles tables
-- First, let's add the foreign key constraint
ALTER TABLE emails 
ADD CONSTRAINT fk_emails_user_profiles 
FOREIGN KEY (user_id) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;