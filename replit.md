# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Apps

### Campus Cartographer (`artifacts/campus-spotter`)

A crowd-sourced university apparel sighting tracker.

**Features:**
- Interactive Leaflet map showing all sightings as pins across the US
- Filter sidebar to show pins for a specific university
- "Log Sighting" button using HTML5 Geolocation API + university autocomplete
- Stats/leaderboard page with sighting counts per university and recent activity feed
- Dark/light mode toggle
- Mobile-first design

**Backend routes** (`artifacts/api-server/src/routes/sightings.ts`):
- `GET /api/sightings` — list all (optional `?university=` filter)
- `POST /api/sightings` — create a new sighting
- `GET /api/sightings/stats` — aggregated counts per university
- `GET /api/sightings/recent` — last 10 sightings
- `GET /api/sightings/:id` — get one sighting

**DB schema** (`lib/db/src/schema/sightings.ts`):
- `sightings` table: id, university, latitude, longitude, notes, created_at

**Important**: After any changes to `lib/api-spec/openapi.yaml`, run codegen and then manually fix `lib/api-zod/src/index.ts` to only export `./generated/api` (not `./generated/types` or `./generated/api.schemas` — those don't exist without the schemas config).
