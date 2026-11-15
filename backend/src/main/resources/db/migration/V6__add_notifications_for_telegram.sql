ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(64);

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS sent_to_telegram BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE notifications n
SET user_id = s.user_id
    FROM subscriptions s
WHERE n.subscription_id = s.subscription_id
  AND n.user_id IS NULL;

ALTER TABLE notifications
    ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN message SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_notifications_sub_msg
    ON notifications (subscription_id, message)
    WHERE subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_notifications_user ON notifications (user_id);