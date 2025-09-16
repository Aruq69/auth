-- Create user preferences for existing users who don't have them
INSERT INTO public.user_preferences (user_id, never_store_data, email_notifications, security_alerts, language, theme)
SELECT 
    id as user_id,
    true as never_store_data,  -- Default to privacy-first
    true as email_notifications,
    true as security_alerts,
    'en' as language,
    'system' as theme
FROM auth.users 
WHERE id NOT IN (
    SELECT user_id FROM public.user_preferences
)
ON CONFLICT (user_id) DO NOTHING;