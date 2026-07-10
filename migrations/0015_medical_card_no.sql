-- Migration 0015: Add card_no column to medical_card_applications
-- Run manually: npx wrangler d1 execute webapp-production --file=./migrations/0015_medical_card_no.sql
ALTER TABLE medical_card_applications ADD COLUMN card_no TEXT;
