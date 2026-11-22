CREATE TYPE notification_type AS ENUM ('PAYMENT_REMINDER', 'TRIAL_ENDING', 'PRICE_CHANGE', 'RENEWAL', 'SYSTEM');

ALTER TABLE notifications
ALTER COLUMN type TYPE notification_type
    USING (CASE
               WHEN type IN ('PAYMENT_REMINDER', 'TRIAL_ENDING', 'PRICE_CHANGE', 'RENEWAL') THEN type
               ELSE 'SYSTEM'
           END)::notification_type;
