-- Remove Gmail/Google functionality and replace with Outlook/Microsoft

-- Drop Gmail tokens table
DROP TABLE IF EXISTS public.gmail_tokens CASCADE;

-- Create Outlook tokens table
CREATE TABLE IF NOT EXISTS public.outlook_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_address TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_email_outlook_token UNIQUE (user_id, email_address)
);

-- Enable RLS on Outlook tokens table
ALTER TABLE public.outlook_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Outlook tokens
CREATE POLICY "Users can view their own outlook tokens" 
ON public.outlook_tokens FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outlook tokens" 
ON public.outlook_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outlook tokens" 
ON public.outlook_tokens FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outlook tokens" 
ON public.outlook_tokens FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_outlook_tokens_updated_at
BEFORE UPDATE ON public.outlook_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_outlook_tokens_user_id ON public.outlook_tokens(user_id);

-- Update emails table to reference Outlook instead of Gmail
ALTER TABLE public.emails DROP COLUMN IF EXISTS gmail_id;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS outlook_id TEXT UNIQUE;