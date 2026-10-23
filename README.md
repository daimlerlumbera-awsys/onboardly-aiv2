# Onboardly

Monorepo for the Onboardly onboarding platform.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + TypeScript + Express |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 (Docker) |
| Auth | JWT + Google OAuth 2.0 |
| Shared types | `packages/shared` |

## Structure

```
/
├── apps/
│   ├── web/        ← React frontend (port 3000)
│   └── server/     ← Express API (port 4000)
├── packages/
│   └── shared/     ← Shared TypeScript types + enums
└── docker-compose.yml
```

## Prerequisites

- Node.js ≥ 18
- Docker Desktop (for PostgreSQL)

## Setup

### 1. Start the database

```bash
docker compose up -d
```

PostgreSQL will be available at `localhost:5432` (user: `postgres`, password: `postgres`, db: `onboardly`).

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Edit `apps/server/.env` and fill in your `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a strong `JWT_SECRET`.

### 4. Run database migrations

```bash
npm run db:migrate --workspace=apps/server
```

### 5. Seed the database

```bash
npm run db:seed --workspace=apps/server
```

Default seed credentials:
| Email | Password | Role |
|---|---|---|
| `hr@onboardly.dev` | `password123` | HR |
| `employee@onboardly.dev` | `password123` | Employee |

### 6. Start development servers

```bash
npm run dev
```

This starts both `apps/web` (http://localhost:3000) and `apps/server` (http://localhost:4000) concurrently.

## Individual workspace commands

```bash
# Frontend only
npm run dev --workspace=apps/web

# Backend only
npm run dev --workspace=apps/server

# Type-check shared package
npm run build --workspace=packages/shared
```

## Health check

```bash
curl http://localhost:4000/health
# → { "status": "ok", "timestamp": "..." }
```
