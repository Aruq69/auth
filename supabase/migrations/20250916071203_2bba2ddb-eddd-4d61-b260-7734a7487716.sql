-- Remove unused Nylas tokens table and related objects
DROP TRIGGER IF EXISTS update_nylas_tokens_updated_at ON public.nylas_tokens;
DROP POLICY IF EXISTS "Users can delete their own nylas tokens" ON public.nylas_tokens;
DROP POLICY IF EXISTS "Users can update their own nylas tokens" ON public.nylas_tokens; 
DROP POLICY IF EXISTS "Users can insert their own nylas tokens" ON public.nylas_tokens;
DROP POLICY IF EXISTS "Users can view their own nylas tokens" ON public.nylas_tokens;
DROP TABLE IF EXISTS public.nylas_tokens;