-- Migration 0026: Add card_image_url column to medical_card_applications
-- Stores Cloudinary URL of the issued medical card image (PNG/JPEG)
-- Admin pastes the Cloudinary URL; member can open it with one tap

ALTER TABLE medical_card_applications ADD COLUMN card_image_url TEXT DEFAULT '';
