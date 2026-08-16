-- Migration: Add email tracking to notifications table
-- Description: Adds persistent email delivery state for duplicate prevention
-- Date: 2026-08-16
-- Status: Pending review - DO NOT apply automatically

-- Add email_sent and email_sent_at columns (safe to run multiple times)
-- These columns track whether an email was successfully delivered for a notification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'email_sent'
  ) THEN
    ALTER TABLE notifications ADD COLUMN email_sent BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'email_sent_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN email_sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for efficient anomaly email deduplication lookup
-- Used by hasAnomalyEmailBeenSent() to check if (anomaly_id, recipient_user_id, notification_type) email was sent
CREATE INDEX IF NOT EXISTS idx_notif_email_anomaly
  ON notifications(anomaly_id, recipient_user_id, notification_type, email_sent)
  WHERE email_sent = TRUE AND deleted_at IS NULL;

-- Create index for incident email deduplication lookup  
-- Used by hasIncidentEmailBeenSent() to check if (incident_id, recipient_user_id, notification_type) email was sent
CREATE INDEX IF NOT EXISTS idx_notif_email_incident
  ON notifications(incident_id, recipient_user_id, notification_type, email_sent)
  WHERE email_sent = TRUE AND deleted_at IS NULL;
