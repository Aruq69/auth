-- Disable Row Level Security since we removed authentication
ALTER TABLE public.gmail_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails DISABLE ROW LEVEL SECURITY;