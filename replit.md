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

### Branch Out (`artifacts/branch-out`)

A crowd-sourced wildflower sighting tracker.

**Features:**
- Interactive Leaflet map showing all flower sightings as pins
- Filter by flower species
- "Log a Flower" button using HTML5 Geolocation API + species autocomplete + optional photo URL
- Stats/leaderboard page with sighting counts per flower species and recent activity feed
- Dark/light mode toggle
- Mobile-first design

**Backend routes** (`artifacts/api-server/src/routes/sightings.ts`):
- `GET /api/sightings` — list all (optional `?species=` filter)
- `POST /api/sightings` — create a new sighting
- `GET /api/sightings/stats` — aggregated counts per flower species
- `GET /api/sightings/recent` — last 10 sightings
- `GET /api/sightings/:id` — get one sighting
- `GET /api/species` — list known flower species

**DB schema** (`lib/db/src/schema/sightings.ts`):
- `sightings` table: id, species, latitude, longitude, notes, photo_url, spotter_name, created_at

**Important**: After any changes to `lib/api-spec/openapi.yaml`, run codegen and then manually fix `lib/api-zod/src/index.ts` to only export `./generated/api` (not `./generated/types` or `./generated/api.schemas` — those don't exist without the schemas config).
