-- Add api_key column to credential_refs table for development
-- This allows storing API keys directly for development while keeping vault paths for production

ALTER TABLE credential_refs ADD COLUMN IF NOT EXISTS api_key TEXT;
