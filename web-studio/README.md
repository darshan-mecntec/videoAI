# AI Creative Studio - Web Studio

Web-based user interface for the AI Creative Studio Platform. This is the main frontend application that allows creators and businesses to manage AI providers, monitor system health, and interact with the backend services.

## Tech Stack

- **Framework**: Next.js 16.2.12 (App Router)
- **Language**: JavaScript
- **Styling**: Tailwind CSS 4
- **State Management**: React Hooks
- **API Integration**: Native Fetch API

## Features

### Implemented Pages

1. **Home Page** (`/`)
   - Landing page with navigation to main features
   - Quick access to Provider Management and Health Dashboard

2. **Providers Page** (`/providers`)
   - List all registered AI providers
   - Add new providers with metadata
   - Edit existing provider configurations
   - Delete providers (soft delete)
   - Status indicators (active, disabled, deprecated)
   - Region support display

3. **Capabilities Page** (`/capabilities`)
   - Search and filter capabilities by type
   - View providers that support specific capabilities
   - Filter by region
   - Quality score indicators
   - Model information display
   - Pricing model information

4. **Health Dashboard** (`/health`)
   - Real-time health monitoring for all providers
   - Status indicators (healthy, degraded, unavailable)
   - Latency measurements with color coding
   - 7-day availability scores
   - Auto-refresh functionality (30-second intervals)
   - Health summary statistics
   - Error message display

### Components

1. **Navigation** (`/app/components/navigation.js`)
   - Responsive navigation bar
   - Links to all main pages
   - Authentication state display
   - Sign in/Sign out functionality

2. **Auth Provider** (`/app/components/auth-provider.js`)
   - Authentication context for the application
   - Placeholder for login/logout functionality
   - User state management
   - Ready for integration with Identity Service

3. **API Client** (`/lib/api-client.js`)
   - Centralized API client for backend communication
   - All Provider Registry API endpoints
   - Error handling
   - Environment-based API URL configuration

## Getting Started

### Prerequisites

- Node.js 20+ 
- Provider Registry service running (default: http://localhost:3000)

### Installation

```bash
npm install
```

### Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Available environment variables:
- `NEXT_PUBLIC_API_URL`: URL of the Provider Registry service (default: http://localhost:3000)

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:3001`

### Build for Production

```bash
npm run build
npm start
```

## API Integration

The frontend connects to the Provider Registry service via the API client. Make sure the Provider Registry service is running before starting the web studio.

### API Endpoints Used

- `GET /v1/providers` - List providers
- `POST /v1/providers` - Create provider
- `PATCH /v1/providers/:id` - Update provider
- `DELETE /v1/providers/:id` - Delete provider
- `GET /v1/capabilities` - Search capabilities
- `GET /v1/providers/:id/capabilities` - Get provider capabilities
- `GET /v1/providers/health-summary` - Get health summary
- `GET /v1/providers/:id/health` - Get provider health
- `POST /v1/providers/:id/health-check` - Record health check

## Architecture

The web studio follows the architecture principles:

- **API-First**: All functionality is built on documented REST APIs
- **Event-Driven Ready**: Components designed to handle real-time updates via events
- **Provider Abstraction**: UI interacts with Provider Registry, not directly with AI providers
- **Multi-Tenant Ready**: Authentication system ready for org-based access control

## Future Enhancements

- **Authentication**: Integrate with Identity Service for SSO and RBAC
- **Real-time Updates**: WebSocket integration for live health updates
- **Workflow Builder**: Visual workflow creation interface
- **Asset Management**: UI for managing generated assets
- **Project Management**: Workspace and project organization
- **Cost Dashboard**: Real-time cost tracking and budgeting
- **Advanced Analytics**: Usage statistics and provider performance metrics

## Compliance with Engineering Rules

- ✅ API-first development
- ✅ Documented API integration
- ✅ Event-driven architecture ready
- ✅ No direct provider API calls
- ✅ Proper error handling
- ✅ Responsive design
- ✅ Authentication placeholders
- ✅ Environment-based configuration

## Folder Structure

```
web-studio/
├── app/
│   ├── components/
│   │   ├── navigation.js
│   │   └── auth-provider.js
│   ├── capabilities/
│   │   └── page.js
│   ├── health/
│   │   └── page.js
│   ├── providers/
│   │   └── page.js
│   ├── layout.js
│   ├── page.js
│   └── globals.css
├── lib/
│   └── api-client.js
├── public/
├── package.json
└── README.md
```

## Notes

- This is a JavaScript-based Next.js application following the breaking changes in Next.js 16
- The application uses the App Router pattern
- Tailwind CSS is used for styling via the new v4 architecture
- Authentication is currently placeholder and ready for integration with the Identity Service
- The application expects the Provider Registry service to be running on the configured API URL
