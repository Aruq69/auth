-- Check if RLS is enabled on emails table and enable if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = 'emails' 
    AND relrowsecurity = true
  ) THEN
    ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Check if RLS is enabled on gmail_tokens table and enable if not  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = 'gmail_tokens' 
    AND relrowsecurity = true
  ) THEN
    ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;