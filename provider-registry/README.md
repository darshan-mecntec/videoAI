# Provider Registry Service

System-of-record for AI capabilities, providers, health, pricing, rate limits, and secret credential references.

## Responsibilities
- Stores provider metadata (slug, status, regions, org isolation).
- Stores capability definitions per provider (capability type, model id, parameters, quality score).
- Stores pricing history and rate limit rules.
- Tracks provider health records and rolling 7-day availability scores.
- Exposes fast lookup endpoints for the Routing Engine with cache-aside TTL.
- Emits `provider.config.updated` (v1) events upon provider configuration mutations.

## Does NOT own
- Routing decision scoring logic (Routing Engine's job).
- Executing AI requests / provider adapters (AI Services / Adapter layer's job).
- Direct credential storage (stores Vault / Secrets Manager reference paths only).

## API Endpoints
- `GET /v1/providers` — List all providers
- `GET /v1/providers/:id` — Get provider details + capabilities
- `POST /v1/providers` — Register provider
- `PATCH /v1/providers/:id` — Update provider details
- `DELETE /v1/providers/:id` — Soft-delete provider (`status: deprecated`)
- `GET /v1/capabilities?type=...&region=...` — Fast capability lookup
- `POST /v1/providers/:id/capabilities` — Add capability
- `PATCH /v1/providers/:id/capabilities/:capId` — Update capability
- `GET /v1/providers/:id/pricing` — Get pricing
- `POST /v1/providers/:id/pricing` — Add pricing entry
- `GET /v1/providers/:id/health` — Get health status
- `POST /v1/providers/:id/health-check` — Record health check
- `GET /v1/providers/health-summary` — Health summary for all providers
- `GET /v1/providers/:id/rate-limits` — Get rate limits
- `PUT /v1/providers/:id/rate-limits` — Update rate limits

## Architecture

The Provider Registry supports two deployment modes:

### Development Mode (In-Memory)
- Uses in-memory storage for providers, capabilities, pricing, health records, and rate limits
- Uses in-memory cache
- Uses in-memory event bus
- Ideal for local development and testing
- Enabled by default or when `USE_PRODUCTION_SERVICES=false`

### Production Mode (PostgreSQL + Redis + NATS)
- Uses PostgreSQL for persistent data storage
- Uses Redis for distributed caching
- Uses NATS JetStream for event publishing
- Required for production deployments
- Enabled when `USE_PRODUCTION_SERVICES=true`

## Folder Structure
```
provider-registry/
├── src/
│   ├── api/            # Controllers/routes — thin, no business logic
│   │   ├── middleware.ts
│   │   └── routes.ts
│   ├── domain/          # Core business logic, use-cases
│   │   ├── providerService.ts
│   │   ├── capabilityService.ts
│   │   ├── healthService.ts
│   │   └── types.ts
│   ├── infra/            # DB, external calls, adapters
│   │   ├── repository.ts           # Interface definitions
│   │   ├── postgresqlRepository.ts # PostgreSQL implementation
│   │   └── redisCache.ts           # Redis implementation
│   ├── events/          # Event publishers/consumers
│   │   ├── publisher.ts
│   │   └── natsPublisher.ts        # NATS implementation
│   ├── config/
│   │   └── index.ts
│   ├── app.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   │   ├── providerService.test.ts
│   │   ├── capabilityService.test.ts
│   │   ├── healthService.test.ts
│   │   └── postgresRepository.test.ts (requires TEST_DATABASE_URL)
│   └── integration/
│       └── api.test.ts
├── migrations/
│   └── 001_initial_schema.sql
├── README.md
├── openapi.yaml
├── Dockerfile
├── package.json
├── tsconfig.json
├── jest.config.js
├── jest.setup.js
└── .env.example
```

## Running Locally

### Development Mode (In-Memory)
```bash
npm install
npm run dev
```

### Production Mode (PostgreSQL + Redis + NATS)
1. Start dependencies:
```bash
# PostgreSQL
docker run -d --name provider-registry-db \
  -e POSTGRES_DB=provider_registry \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15

# Redis
docker run -d --name provider-registry-redis \
  -p 6379:6379 \
  redis:7-alpine

# NATS
docker run -d --name provider-registry-nats \
  -p 4222:4222 \
  nats:latest
```

2. Run database migrations:
```bash
psql postgresql://postgres:postgres@localhost:5432/provider_registry -f migrations/001_initial_schema.sql
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the service:
```bash
USE_PRODUCTION_SERVICES=true npm run dev
```

## Environment Variables

See `.env.example` for all available variables:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NATS_URL` - NATS connection string
- `NATS_STREAM_NAME` - NATS stream name (default: provider_events)
- `NATS_SUBJECT_PREFIX` - NATS subject prefix (default: provider)
- `USE_PRODUCTION_SERVICES` - Enable production services (true/false)

## Running Tests

### Unit Tests (In-Memory)
```bash
npm test
# or
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### PostgreSQL Repository Tests
Requires a test database:
```bash
export TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/provider_registry_test"
npm test -- tests/unit/postgresRepository.test.ts
```

## Building for Production

```bash
npm run build
npm start
```

## Docker Deployment

### Build Image
```bash
docker build -t provider-registry:latest .
```

### Run with Docker Compose
Create a `docker-compose.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: provider_registry
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nats:
    image: nats:latest
    ports:
      - "4222:4222"

  provider-registry:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/provider_registry
      - REDIS_URL=redis://redis:6379
      - NATS_URL=nats://nats:4222
      - USE_PRODUCTION_SERVICES=true
    depends_on:
      - postgres
      - redis
      - nats

volumes:
  postgres_data:
```

Run migrations:
```bash
docker-compose up -d postgres redis nats
docker-compose exec postgres psql -U postgres -d provider_registry -f /docker-entrypoint-initdb.d/001_initial_schema.sql
```

Start the service:
```bash
docker-compose up provider-registry
```

## API Documentation

The API is documented in OpenAPI format. See `openapi.yaml` for the full specification.

## Events

The service publishes the following events to NATS:

### provider.config.updated (v1)
Published when provider configuration changes (create, update, delete, capability changes).

**Payload:**
```json
{
  "provider_id": "uuid",
  "slug": "provider-slug",
  "status": "active",
  "capabilities": ["text-to-image", "image-to-image"]
}
```

## Database Schema

See `migrations/001_initial_schema.sql` for the complete database schema including:
- `providers` - Provider metadata
- `capabilities` - Capability definitions
- `pricing_entries` - Pricing history
- `health_records` - Health check records
- `rate_limits` - Rate limit rules
- `credential_refs` - Credential reference paths (Vault/Secrets Manager)

## Caching Strategy

The service uses cache-aside pattern with Redis:
- Capability lookups are cached for 30 seconds
- Health records are cached for 60 seconds
- Rate limits are cached for 60 seconds
- Cache is invalidated on configuration changes

## Health Checks

The service exposes a health summary endpoint for monitoring:
- `GET /v1/providers/health-summary` - Returns health status for all providers

## Error Handling

All errors follow the standardized error schema as defined in `05_API_GUIDELINES.md`:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "request_id": "uuid"
  }
}
```

## Compliance with Engineering Rules

This service follows all engineering rules from `02_ENGINEERING_RULES.md`:
- ✅ No shared databases between services
- ✅ All provider configurations go through Provider Registry
- ✅ No circular dependencies
- ✅ No business logic in controllers
- ✅ All cross-service communication via events
- ✅ Public functions have documentation
- ✅ Uses interfaces at integration seams
- ✅ 80%+ test coverage on new code
- ✅ No hardcoded secrets
- ✅ All APIs versioned (`/v1/...`)
- ✅ OpenAPI documentation included
- ✅ Events documented in catalog
- ✅ Events are versioned and additive
- ✅ Standardized error codes
