-- Migration 0028: add image_url column to app_contents
-- Allows shopping & news items to carry an optional Cloudinary image URL

ALTER TABLE app_contents ADD COLUMN image_url TEXT;
