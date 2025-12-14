-- Migration: Add encrypted credential fields to cloud_accounts table
-- Date: 2025-12-05
-- Description: Replace single credentials_encrypted field with separate ciphertext, iv, and authTag fields
--              for AES-256-GCM encryption

-- Step 1: Add new columns
ALTER TABLE cloud_accounts
ADD COLUMN credentials_ciphertext TEXT,
ADD COLUMN credentials_iv VARCHAR(255),
ADD COLUMN credentials_auth_tag VARCHAR(255);

-- Step 2: Set NOT NULL constraints (after data migration if needed)
-- For now, allow NULL during transition
-- ALTER TABLE cloud_accounts ALTER COLUMN credentials_ciphertext SET NOT NULL;
-- ALTER TABLE cloud_accounts ALTER COLUMN credentials_iv SET NOT NULL;
-- ALTER TABLE cloud_accounts ALTER COLUMN credentials_auth_tag SET NOT NULL;

-- Step 3: Drop old column (only after all data is migrated)
-- ALTER TABLE cloud_accounts DROP COLUMN IF EXISTS credentials_encrypted;

-- Notes:
-- 1. Run this migration before deploying new code
-- 2. If existing data needs to be migrated, add migration logic here
-- 3. After confirming all applications use new fields, uncomment step 2 and 3
