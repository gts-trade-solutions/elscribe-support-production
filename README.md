# FixMate - IT Support Platform

FixMate is a comprehensive IT support platform that provides instant help, ticketing, knowledge base, and fleet management capabilities. This is an MVP demonstrating the frontend with mock data, ready for backend integration.

## Features

- **Instant Help Chat** - AI-powered support with citations, confidence scores, and guided troubleshooting
- **Ticketing System** - Full ticket lifecycle management with timeline and status tracking
- **Knowledge Base** - Searchable articles with version control and confidence ratings
- **Screen Sharing** - Browser-based screen sharing with consent controls
- **Device Health** - One-click diagnostics and device fingerprinting
- **Fleet Management** - Enterprise dashboard for monitoring devices and analytics
- **Multi-Role Support** - User, Agent, and Admin interfaces with role-based navigation
- **Multilingual** - English and Hindi support with easy language switching
- **Dark Mode** - Full theme support with smooth transitions
- **Accessibility** - Skip links, semantic HTML, ARIA labels, and keyboard navigation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables (already configured in `.env`):

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Running with Mocks

The application runs entirely with mock data by default. No backend required.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm run start
```

## Architecture

### Frontend Stack

- **Next.js 13.5.1** - App Router with Server and Client Components
- **React 18** - Client-side state management
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible component library
- **Radix UI** - Unstyled, accessible primitives
- **Lucide React** - Icon library
- **Sonner** - Toast notifications
- **next-themes** - Dark mode support

### Project Structure

```
/app                    # Next.js app directory
  /help                 # Instant help chat interface
  /tickets              # Ticket management
  /knowledge            # Knowledge base
  /screen-share         # Screen sharing feature
  /device-health        # Device diagnostics
  /agent                # Agent portal (inbox, queue, console, analytics)
  /admin                # Admin dashboard (fleet, policies, organization)
/components             # Reusable UI components
  /ui                   # shadcn/ui components
/lib                    # Utilities and mock data
  /mock-data.ts         # All mock data definitions
  /i18n.ts              # Translation strings
```

## Backend Integration

### Current State

The application currently uses **mock data** defined in `/lib/mock-data.ts`. All data operations return static data and simulated delays.

### Integration Steps

To connect this frontend to a real backend:

1. **Set up Supabase database** (or your preferred database)
2. **Implement API routes** using the contracts documented below
3. **Replace mock data imports** with actual API calls
4. **Add authentication** using Supabase Auth or your auth provider
5. **Update environment variables** with production credentials

### Expected API Endpoints

All endpoints should be RESTful and return JSON. The host application should provide an `Authorization` header with a valid JWT token.

#### Tickets

**GET /api/tickets**
```json
{
  "tickets": [
    {
      "id": "TKT-1001",
      "title": "WiFi keeps disconnecting",
      "description": "My WiFi connection drops every few minutes",
      "status": "open|in_progress|waiting_customer|resolved|closed",
      "priority": "low|medium|high|critical",
      "category": "Network",
      "userId": "uuid",
      "userName": "John Smith",
      "userEmail": "john@example.com",
      "deviceId": "uuid",
      "agentId": "uuid",
      "agentName": "Sarah Johnson",
      "created": "2025-10-31T10:00:00Z",
      "lastUpdate": "2025-10-31T12:30:00Z",
      "slaDeadline": "2025-10-31T18:00:00Z",
      "slaStatus": "on-track|at-risk|breached",
      "tags": ["wifi", "network", "connectivity"]
    }
  ]
}
```

**GET /api/tickets/:id**
```json
{
  "ticket": {
    "...all ticket fields...":  "...",
    "timeline": [
      {
        "id": "uuid",
        "type": "created|status_change|step_completed|step_failed|escalation_requested|agent_note|agent_assigned|user_response|agent_response",
        "timestamp": "2025-10-31T10:00:00Z",
        "actor": "John Smith",
        "actorId": "uuid",
        "content": "Event description",
        "metadata": {}
      }
    ],
    "stepsAttempted": ["step description 1", "step description 2"],
    "artifacts": ["file1.png", "log.txt"]
  }
}
```

**POST /api/tickets**
```json
Request:
{
  "title": "Issue title",
  "description": "Detailed description",
  "category": "Network",
  "priority": "medium",
  "deviceId": "uuid"
}

Response:
{
  "ticket": { "...full ticket object..." }
}
```

**POST /api/tickets/:id/events**
```json
Request:
{
  "type": "agent_note|user_response|step_completed|status_change",
  "content": "Event content",
  "metadata": {}
}

Response:
{
  "event": { "...full event object..." }
}
```

#### Knowledge Base

**GET /api/kb**
```json
{
  "articles": [
    {
      "id": "kb-1",
      "title": "How to Fix WiFi Issues",
      "description": "Step-by-step troubleshooting guide",
      "category": "Network",
      "tags": ["wifi", "network", "troubleshooting"],
      "version": "2.1",
      "lastUpdated": "2025-10-15",
      "views": 1243,
      "confidence": 92
    }
  ]
}
```

**GET /api/kb/:slug**
```json
{
  "article": {
    "...all article fields...": "...",
    "body": "Full markdown content",
    "citations": [
      {
        "title": "Citation title",
        "source": "Microsoft Support",
        "url": "https://example.com"
      }
    ]
  }
}
```

#### Analytics

**GET /api/analytics/overview**
```json
{
  "metrics": {
    "totalTickets": 651,
    "activeIssues": 23,
    "resolvedToday": 47,
    "avgResolutionTime": 3.2
  },
  "ticketVolume": [
    { "date": "2025-10-24", "count": 45 }
  ],
  "categoryBreakdown": [
    { "category": "Network", "count": 124 }
  ]
}
```

#### Chat Sessions

**POST /api/chat/sessions**
```json
Request:
{
  "userId": "uuid",
  "deviceId": "uuid",
  "initialMessage": "I need help with..."
}

Response:
{
  "session": {
    "id": "uuid",
    "userId": "uuid",
    "created": "2025-10-31T10:00:00Z"
  }
}
```

**POST /api/chat/:id/messages**
```json
Request:
{
  "content": "User message",
  "role": "user|assistant"
}

Response:
{
  "message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Response content",
    "confidence": 85,
    "sources": [
      {
        "title": "Source title",
        "url": "https://example.com"
      }
    ],
    "suggestions": ["Try this", "Or this"]
  }
}
```

#### Device Information

**GET /api/devices/:id**
```json
{
  "device": {
    "id": "uuid",
    "type": "Desktop|Laptop|Smartphone|Tablet",
    "os": "Windows 11",
    "osVersion": "23H2",
    "owner": "John Smith",
    "ownerId": "uuid",
    "health": "healthy|warning|critical|offline",
    "lastSeen": "2025-10-31T14:30:00Z",
    "memory": "16GB",
    "cores": 8,
    "storage": {
      "total": "512GB",
      "used": "256GB",
      "percentage": 50
    },
    "battery": 85,
    "updatesPending": 2
  }
}
```

## Authentication

### Current Implementation

Authentication is **UI-only**. The signin page and role toggle are for demonstration purposes.

### Production Integration

In a production environment:

1. **Host Application Responsibility** - The parent application should handle authentication
2. **JWT Token** - Pass authentication token via `Authorization: Bearer <token>` header
3. **User Context** - Embed user info in the token (user ID, role, permissions)
4. **Session Management** - Handle token refresh and expiration
5. **Protected Routes** - Middleware should verify tokens on backend API routes

Example token payload:
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "user|agent|admin",
  "permissions": ["tickets:read", "tickets:write"],
  "iat": 1234567890,
  "exp": 1234571490
}
```

## Out of Scope Features

The following features are **not implemented** and require backend services:

### 1. Real Payments
- No Stripe integration
- Pricing page is UI-only
- Backend needs payment processing, subscription management, and webhooks

### 2. Email & WhatsApp Notifications
- Settings page shows notification preferences
- Backend needs email service (SendGrid, AWS SES) and WhatsApp API integration

### 3. Remote Desktop Control
- Escalation modal shows "Remote Session" option
- Actual remote control requires specialized software (TeamViewer API, AnyDesk, etc.)
- **iOS remote control is not possible** through web browsers
- Alternative: Screen share + guided instructions

### 4. MDM (Mobile Device Management) Actions
- No ability to remotely wipe, lock, or configure devices
- Enterprise MDM requires integration with Apple Business Manager, Android EMM, or Windows Intune

### 5. Destructive Commands
- The chat interface shows commands but never executes them
- All actions require explicit user consent
- Backend should never run system commands directly

### 6. Live Agent Chat
- Current chat is simulated
- Production needs WebSocket or Server-Sent Events for real-time messaging
- Requires presence system and agent availability tracking

### 7. Calendar Integration
- "Book a Slot" escalation option is UI-only
- Needs integration with Google Calendar, Outlook, or custom scheduling system

## Testing

### Manual Testing Checklist

- [ ] All routes render without errors
- [ ] Chat displays messages with citations and confidence
- [ ] "Fixed / Not Fixed" buttons work on help page
- [ ] Escalation modal shows options
- [ ] Screen share triggers browser permission dialog
- [ ] Tickets list shows all filters working
- [ ] Ticket detail page shows timeline
- [ ] Knowledge base articles render with citations
- [ ] Device health check completes and shows report
- [ ] Admin dashboard shows fleet metrics
- [ ] Role toggle switches navigation menus
- [ ] Locale switcher changes language
- [ ] Dark mode toggle works across all pages
- [ ] Toast notifications appear for key actions
- [ ] Skip link appears on tab/focus

### Running Tests

```bash
# Type checking
npm run typecheck

# Build test
npm run build
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support
- Focus indicators on all interactive elements

## Contributing

This is an MVP demonstrating the frontend architecture. For production deployment:

1. Set up backend infrastructure
2. Implement API endpoints per the contracts above
3. Add authentication and authorization
4. Deploy to production hosting
5. Configure monitoring and analytics

## License

Proprietary - All rights reserved

## Support

For backend integration questions or feature requests, contact the development team.
