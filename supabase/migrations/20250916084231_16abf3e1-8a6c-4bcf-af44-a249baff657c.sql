-- Enable leaked password protection for better security
UPDATE auth.config 
SET value = 'true'::text 
WHERE parameter = 'password_pwned_check';