-- Create profile for the current user
INSERT INTO public.profiles (user_id, username) 
VALUES ('dbf2eb97-a216-4949-a276-30308608d311', 'User')
ON CONFLICT (user_id) DO NOTHING;