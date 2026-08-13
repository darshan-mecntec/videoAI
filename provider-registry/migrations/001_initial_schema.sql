-- Provider Registry Database Schema
-- This script creates the initial schema for the Provider Registry service

-- Providers table
CREATE TABLE IF NOT EXISTS providers (
  id VARCHAR(255) PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'disabled', 'deprecated')),
  region_codes JSONB NOT NULL DEFAULT '["global"]'::jsonb,
  org_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for fast slug lookup
CREATE INDEX idx_providers_slug ON providers(slug);
-- Index for status filtering
CREATE INDEX idx_providers_status ON providers(status);
-- Index for org_id filtering (multi-tenancy)
CREATE INDEX idx_providers_org_id ON providers(org_id) WHERE org_id IS NOT NULL;

-- Capabilities table
CREATE TABLE IF NOT EXISTS capabilities (
  id VARCHAR(255) PRIMARY KEY,
  provider_id VARCHAR(255) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  capability_type VARCHAR(100) NOT NULL CHECK (capability_type IN (
    'text-to-image', 'image-to-image', 'inpainting', 'text-to-video',
    'text-to-audio', 'voice-clone', 'avatar-lipsync', 'upscale', 'text-to-text'
  )),
  model_id VARCHAR(255) NOT NULL,
  max_resolution VARCHAR(50),
  supported_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_score DECIMAL(3,2) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 1),
  pricing_model VARCHAR(50) NOT NULL CHECK (pricing_model IN (
    'per-image', 'per-second', 'per-token', 'per-call', 'per-text'
  ))
);

-- Index for capability type lookups
CREATE INDEX idx_capabilities_type ON capabilities(capability_type);
-- Index for provider_id lookups
CREATE INDEX idx_capabilities_provider_id ON capabilities(provider_id);
-- Index for quality_score sorting
CREATE INDEX idx_capabilities_quality ON capabilities(quality_score DESC);

-- Pricing entries table
CREATE TABLE IF NOT EXISTS pricing_entries (
  id VARCHAR(255) PRIMARY KEY,
  capability_id VARCHAR(255) NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  unit VARCHAR(50) NOT NULL,
  cost_usd DECIMAL(10,6) NOT NULL,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
  effective_until TIMESTAMP WITH TIME ZONE
);

-- Index for capability_id lookups
CREATE INDEX idx_pricing_capability_id ON pricing_entries(capability_id);
-- Index for effective date range queries
CREATE INDEX idx_pricing_effective_dates ON pricing_entries(effective_from, effective_until);

-- Health records table
CREATE TABLE IF NOT EXISTS health_records (
  id VARCHAR(255) PRIMARY KEY,
  provider_id VARCHAR(255) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL,
  latency_ms INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unavailable')),
  error_message TEXT,
  availability_7d DECIMAL(3,2) NOT NULL CHECK (availability_7d >= 0 AND availability_7d <= 1)
);

-- Index for provider_id lookups
CREATE INDEX idx_health_provider_id ON health_records(provider_id);
-- Index for timestamp queries
CREATE INDEX idx_health_checked_at ON health_records(checked_at DESC);

-- Rate limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id VARCHAR(255) PRIMARY KEY,
  provider_id VARCHAR(255) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  capability_id VARCHAR(255) REFERENCES capabilities(id) ON DELETE CASCADE,
  requests_per_min INTEGER NOT NULL,
  tokens_per_min INTEGER,
  concurrency_cap INTEGER
);

-- Index for provider_id lookups
CREATE INDEX idx_rate_limits_provider_id ON rate_limits(provider_id);
-- Index for capability_id lookups
CREATE INDEX idx_rate_limits_capability_id ON rate_limits(capability_id) WHERE capability_id IS NOT NULL;

-- Credential references table
CREATE TABLE IF NOT EXISTS credential_refs (
  id VARCHAR(255) PRIMARY KEY,
  provider_id VARCHAR(255) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  secret_key VARCHAR(500) NOT NULL, -- Stores Vault/Secrets Manager path reference (for production)
  api_key TEXT, -- Direct API key for development (optional, nullable)
  environment VARCHAR(50) NOT NULL CHECK (environment IN ('production', 'staging'))
);

-- Index for provider_id lookups
CREATE INDEX idx_credential_refs_provider_id ON credential_refs(provider_id);
-- Unique constraint: one credential ref per provider per environment
CREATE UNIQUE INDEX idx_credential_refs_provider_env ON credential_refs(provider_id, environment);
