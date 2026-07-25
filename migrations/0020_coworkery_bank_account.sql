-- Add combined bank_account text field to co_workery
-- (Separate bank_account_name / bank_account_no fields exist but are rarely used;
--  self-apply flow stores free-text bank info in this single field)
ALTER TABLE co_workery ADD COLUMN bank_account TEXT DEFAULT NULL;
