-- Simple SQL to add WhatsApp columns to outlets table
-- Run this directly in your MySQL client

ALTER TABLE outlets
ADD COLUMN IF NOT EXISTS whatsapp_provider VARCHAR(50) NULL COMMENT 'WhatsApp provider: fonnte, wablas, kirimwa, wablitz',
ADD COLUMN IF NOT EXISTS whatsapp_api_key TEXT NULL COMMENT 'Encrypted WhatsApp API key',
ADD COLUMN IF NOT EXISTS whatsapp_phone_number VARCHAR(20) NULL COMMENT 'WhatsApp phone number (sender number)',
ADD COLUMN IF NOT EXISTS whatsapp_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Enable WhatsApp notifications for this outlet';
