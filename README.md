# Frentry

A simple, self-hosted error tracking application — like Sentry, but simplified for personal use.

## Stack

- **Next.js 16** (App Router)
- **Prisma 7** (ORM)
- **PostgreSQL** (Database)
- **NextAuth 4** (Authentication)
- **shadcn/ui** style components (Tailwind CSS)

## Architecture

### Overview

Frentry is designed for low-volume, single-user or small-team error tracking. Events are processed synchronously (no message queue needed), and the stack is kept minimal.

```
Client App → POST /api/ingest → Prisma → PostgreSQL
                                  ↓
                           Fingerprint → Issue (group)
                                  ↓
                           Notify (email/webhook)
```

### Database Schema

- **User** — Authenticated users (NextAuth + credentials)
- **Project** — Multiple projects per user, each with a unique DSN key
- **Release** — Versioned releases per project
- **SourceMap** — Source maps uploaded per release for stack trace resolution
- **Issue** — Errors grouped by fingerprint (type + location)
- **Event** — Individual error occurrences linked to issues
- **NotificationRule** — Email or webhook notifications per user/project

### Multi-Tenant Strategy

Simple user-based isolation: every Project belongs to a User, and all queries filter by `userId` from the session. No organization layer needed for personal use.

### Fingerprint Strategy

Errors are grouped into Issues using a SHA-256 fingerprint:

1. If a stack trace exists, extract the first meaningful frame (`function@file:line`)
2. Otherwise, normalize the error message (strip dynamic values like UUIDs and numbers)
3. Hash `{type}:{source}` → fingerprint

This ensures the same error from the same location is grouped, even if messages contain dynamic data.

### Event Processing

Events are processed synchronously in the `/api/ingest` route handler:

1. Validate payload (Zod schema)
2. Look up Project by DSN
3. Resolve stack trace using source maps (if release provided)
4. Generate fingerprint
5. Find or create Issue
6. Create Event record
7. Send notification if it's a new Issue (fire-and-forget)

No queue is needed for low-volume personal use.

## Folder Structure

```
src/
├── app/
│   ├── (auth)/           # Login & Register pages
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/      # Authenticated dashboard pages
│   │   ├── layout.tsx    # Dashboard shell with nav
│   │   └── projects/
│   │       ├── page.tsx              # Projects list
│   │       ├── new/page.tsx          # Create project
│   │       └── [projectId]/
│   │           ├── page.tsx          # Redirect to issues
│   │           ├── issues/
│   │           │   ├── page.tsx      # Issues list
│   │           │   └── [issueId]/
│   │           │       └── page.tsx  # Issue detail + events
│   │           └── settings/
│   │               └── page.tsx      # DSN, releases, danger zone
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts  # NextAuth handler
│   │   │   └── register/route.ts       # Registration endpoint
│   │   ├── ingest/route.ts             # Public event ingestion
│   │   └── projects/[projectId]/
│   │       └── releases/route.ts       # Source map upload
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Root redirect
│   └── globals.css
├── components/
│   └── ui/               # Reusable UI components
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
├── lib/
│   ├── actions.ts        # Server actions (create/delete project, update issue)
│   ├── auth.ts           # NextAuth configuration
│   ├── dsn.ts            # DSN generation
│   ├── fingerprint.ts    # Error fingerprinting logic
│   ├── notifications.ts  # Email & webhook notifications
│   ├── prisma.ts         # Prisma client singleton
│   ├── session.ts        # Auth helpers for server components
│   ├── sourcemap.ts      # Source map resolution
│   ├── utils.ts          # Utility functions (cn)
│   └── validators.ts     # Zod schemas
├── types/
│   └── next-auth.d.ts    # NextAuth type extensions
└── generated/
    └── prisma/           # Generated Prisma client (gitignored)
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Setup

1. Clone and install:
   ```bash
   git clone <repo-url> frentry
   cd frentry
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and secrets
   ```

3. Run migrations:
   ```bash
   npx prisma migrate dev
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) and register an account.

### Sending Test Events

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "dsn": "<your-project-dsn>",
    "type": "TypeError",
    "message": "Cannot read properties of undefined",
    "stacktrace": "TypeError: Cannot read properties of undefined\n    at handleClick (app.js:42:15)\n    at HTMLButtonElement.onclick (index.html:10:1)",
    "release": "1.0.0",
    "metadata": { "browser": "Chrome 120", "os": "macOS" }
  }'
```

### Uploading Source Maps

```bash
curl -X POST http://localhost:3000/api/projects/<projectId>/releases \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{
    "version": "1.0.0",
    "sourceMaps": [
      { "fileName": "app.js", "content": "<sourcemap-json-content>" }
    ]
  }'
```

## Implementation Roadmap

1. ✅ **Core schema & auth** — Prisma models, NextAuth, registration
2. ✅ **Event ingestion** — `/api/ingest` endpoint with fingerprinting
3. ✅ **Dashboard UI** — Projects, issues, events, settings
4. ✅ **Source map support** — Upload and resolve stack traces
5. ✅ **Notifications** — Email and webhook on new issues
6. 🔲 **Client SDK** — Lightweight JS SDK for automatic error capture
7. 🔲 **Event retention** — Auto-delete old events
8. 🔲 **Search & filters** — Filter issues by status, date range
9. 🔲 **Charts** — Error frequency over time

## License

MIT
