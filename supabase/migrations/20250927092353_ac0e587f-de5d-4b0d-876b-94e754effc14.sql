-- Clean up existing duplicates by keeping only the most recent email for each subject+sender+user combination
WITH ranked_emails AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, subject, sender 
      ORDER BY received_date DESC, created_at DESC
    ) as rn
  FROM emails
)
DELETE FROM emails 
WHERE id IN (
  SELECT id FROM ranked_emails WHERE rn > 1
);