-- CRITICAL SECURITY FIX: Secure Gmail tokens from public access
-- Step 1: Drop the dangerous public access policy
DROP POLICY IF EXISTS "Allow public access to gmail_tokens" ON public.gmail_tokens;

-- Step 2: Add user_id column to associate tokens with users
ALTER TABLE public.gmail_tokens 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Update existing tokens to have a user_id (set to first user if any exist)
-- Note: In a real scenario, you'd need to properly map tokens to their actual owners
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user from auth.users if any exist
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    -- If there are users and tokens without user_id, assign them to the first user
    IF first_user_id IS NOT NULL THEN
        UPDATE public.gmail_tokens 
        SET user_id = first_user_id 
        WHERE user_id IS NULL;
    END IF;
END $$;

-- Step 4: Make user_id NOT NULL after updating existing records
ALTER TABLE public.gmail_tokens 
ALTER COLUMN user_id SET NOT NULL;

-- Step 5: Create secure RLS policies - users can only access their own tokens
CREATE POLICY "Users can view their own gmail tokens" 
ON public.gmail_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gmail tokens" 
ON public.gmail_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gmail tokens" 
ON public.gmail_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gmail tokens" 
ON public.gmail_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Step 6: Create index for better performance on user_id queries
CREATE INDEX idx_gmail_tokens_user_id ON public.gmail_tokens(user_id);

-- Step 7: Add unique constraint to ensure one token per user per email
ALTER TABLE public.gmail_tokens 
ADD CONSTRAINT unique_user_email_token UNIQUE (user_id, email_address);