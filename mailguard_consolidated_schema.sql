-- ================================================
-- MailGuard Email Security Platform - Complete Database Schema
-- Generated: 2025-09-23
-- Description: Consolidated migration with all tables, RLS policies, and functions
-- ================================================

-- ================== CORE TABLES ==================

-- Users Profile Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT profiles_user_id_key UNIQUE (user_id)
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    never_store_data BOOLEAN NOT NULL DEFAULT true,
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    security_alerts BOOLEAN NOT NULL DEFAULT true,
    language CHARACTER VARYING NOT NULL DEFAULT 'en',
    theme CHARACTER VARYING NOT NULL DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT user_preferences_user_id_key UNIQUE (user_id)
);

-- Gmail OAuth Tokens Table
CREATE TABLE IF NOT EXISTS public.gmail_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_address TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_email_token UNIQUE (user_id, email_address)
);

-- Emails Analysis Table
CREATE TABLE IF NOT EXISTS public.emails (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    gmail_id TEXT UNIQUE,
    subject TEXT NOT NULL,
    sender TEXT NOT NULL,
    content TEXT,
    raw_content TEXT,
    received_date TIMESTAMP WITH TIME ZONE NOT NULL,
    classification TEXT,
    confidence NUMERIC,
    threat_level TEXT,
    threat_type TEXT,
    keywords TEXT[],
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Statistics Table
CREATE TABLE IF NOT EXISTS public.email_statistics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_emails INTEGER DEFAULT 0,
    low_threat_emails INTEGER DEFAULT 0,
    medium_threat_emails INTEGER DEFAULT 0,
    high_threat_emails INTEGER DEFAULT 0,
    spam_emails INTEGER DEFAULT 0,
    phishing_emails INTEGER DEFAULT 0,
    malware_emails INTEGER DEFAULT 0,
    suspicious_emails INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT email_statistics_user_id_date_key UNIQUE (user_id, date)
);

-- User Feedback Table
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    feedback_type TEXT NOT NULL,
    category TEXT NOT NULL,
    rating INTEGER,
    feedback_text TEXT NOT NULL,
    email TEXT,
    page_url TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ================== INDEXES ==================

CREATE INDEX IF NOT EXISTS idx_emails_user_id ON public.emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_date ON public.emails(received_date);
CREATE INDEX IF NOT EXISTS idx_emails_threat_level ON public.emails(threat_level);
CREATE INDEX IF NOT EXISTS idx_gmail_tokens_user_id ON public.gmail_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_statistics_user_id ON public.email_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_email_statistics_date ON public.email_statistics(date);

-- ================== ROW LEVEL SECURITY ==================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- ================== RLS POLICIES ==================

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences" 
ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Gmail tokens policies
CREATE POLICY "Users can view their own gmail tokens" 
ON public.gmail_tokens FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gmail tokens" 
ON public.gmail_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gmail tokens" 
ON public.gmail_tokens FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gmail tokens" 
ON public.gmail_tokens FOR DELETE USING (auth.uid() = user_id);

-- Emails policies
CREATE POLICY "Users can view their own emails" 
ON public.emails FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emails" 
ON public.emails FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emails" 
ON public.emails FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emails" 
ON public.emails FOR DELETE USING (auth.uid() = user_id);

-- Email statistics policies
CREATE POLICY "Users can view their own email statistics" 
ON public.email_statistics FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email statistics" 
ON public.email_statistics FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email statistics" 
ON public.email_statistics FOR UPDATE USING (auth.uid() = user_id);

-- User feedback policies
CREATE POLICY "Users can view their own feedback" 
ON public.user_feedback FOR SELECT USING ((auth.uid() = user_id) OR (user_id IS NULL));

CREATE POLICY "Users can create feedback" 
ON public.user_feedback FOR INSERT WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));

-- ================== DATABASE FUNCTIONS ==================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get or create user preferences
CREATE OR REPLACE FUNCTION public.get_or_create_user_preferences(p_user_id UUID)
RETURNS user_preferences AS $$
DECLARE
  result public.user_preferences;
BEGIN
  SELECT * INTO result 
  FROM public.user_preferences 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_preferences (
      user_id, never_store_data, email_notifications, 
      security_alerts, language, theme
    )
    VALUES (p_user_id, TRUE, TRUE, TRUE, 'en', 'system')
    RETURNING * INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to increment email statistics
CREATE OR REPLACE FUNCTION public.increment_email_statistics(
  p_user_id UUID, 
  p_threat_level TEXT DEFAULT 'safe', 
  p_threat_type TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.email_statistics (
    user_id, date, total_emails, safe_emails, low_threat_emails,
    medium_threat_emails, high_threat_emails, spam_emails,
    phishing_emails, malware_emails, suspicious_emails
  )
  VALUES (
    p_user_id, CURRENT_DATE, 1,
    CASE WHEN p_threat_level = 'safe' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_level = 'low' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_level = 'medium' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_level = 'high' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_type = 'spam' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_type = 'phishing' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_type = 'malware' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_type = 'suspicious' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_emails = email_statistics.total_emails + 1,
    safe_emails = email_statistics.safe_emails + CASE WHEN p_threat_level = 'safe' THEN 1 ELSE 0 END,
    low_threat_emails = email_statistics.low_threat_emails + CASE WHEN p_threat_level = 'low' THEN 1 ELSE 0 END,
    medium_threat_emails = email_statistics.medium_threat_emails + CASE WHEN p_threat_level = 'medium' THEN 1 ELSE 0 END,
    high_threat_emails = email_statistics.high_threat_emails + CASE WHEN p_threat_level = 'high' THEN 1 ELSE 0 END,
    spam_emails = email_statistics.spam_emails + CASE WHEN p_threat_type = 'spam' THEN 1 ELSE 0 END,
    phishing_emails = email_statistics.phishing_emails + CASE WHEN p_threat_type = 'phishing' THEN 1 ELSE 0 END,
    malware_emails = email_statistics.malware_emails + CASE WHEN p_threat_type = 'malware' THEN 1 ELSE 0 END,
    suspicious_emails = email_statistics.suspicious_emails + CASE WHEN p_threat_type = 'suspicious' THEN 1 ELSE 0 END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ================== TRIGGERS ==================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gmail_tokens_updated_at
  BEFORE UPDATE ON public.gmail_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emails_updated_at
  BEFORE UPDATE ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_statistics_updated_at
  BEFORE UPDATE ON public.email_statistics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================== SECURITY CONFIGURATION ==================

UPDATE auth.config 
SET leaked_password_protection = true 
WHERE NOT leaked_password_protection;