-- Update the default behavior to be privacy-first
-- Change default value for never_store_data to TRUE (emails not stored by default)
ALTER TABLE public.user_preferences 
ALTER COLUMN never_store_data SET DEFAULT TRUE;

-- Update the get_or_create_user_preferences function to default to privacy-first
CREATE OR REPLACE FUNCTION public.get_or_create_user_preferences(p_user_id UUID)
RETURNS public.user_preferences AS $$
DECLARE
  result public.user_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO result 
  FROM public.user_preferences 
  WHERE user_id = p_user_id;
  
  -- If no preferences exist, create privacy-first defaults
  IF NOT FOUND THEN
    INSERT INTO public.user_preferences (
      user_id, 
      never_store_data, 
      email_notifications, 
      security_alerts, 
      language, 
      theme
    )
    VALUES (
      p_user_id, 
      TRUE,  -- Default to NOT storing emails (privacy-first)
      TRUE, 
      TRUE, 
      'en', 
      'system'
    )
    RETURNING * INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;