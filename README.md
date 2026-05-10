# Campus Cartographer 

A crowd-sourced map for spotting college gear in the wild. Log sightings of university sweatshirts, hats, and gear you spot out in the real world, and see where other schools are repping themselves on the map.

**Live at:** [campus-cartographer.aaronmanprojects.com](https://campus-cartographer.aaronmanprojects.com)

---

## Features

- **Map view** — See all sightings plotted on an interactive map
- **Log a sighting** — Drop a pin where you spotted someone repping their school
- **Recent activity** — Live feed of the latest sightings from all spotters
- **Leaderboard** — See which universities have the most sightings and who's logged the most spots

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, Leaflet (maps) |
| Backend | Node.js, Express |
| Database | PostgreSQL via Supabase |
| ORM | Drizzle ORM |
| Package manager | pnpm (monorepo) |
| Tunnel | Cloudflare Tunnel |
| Process manager | pm2 |

---

## Project Structure

```
Campus-Cartographer/
├── artifacts/
│   ├── api-server/        # Express backend
│   └── campus-spotter/    # React frontend
├── lib/
│   ├── db/                # Drizzle schema and database client
│   └── api-zod/           # Shared API types and validation
└── scripts/               # Utility scripts
```

---

## Local Development

### Prerequisites

- Node.js 22+
- pnpm
- A PostgreSQL database (Supabase free tier works great)

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/manheima/Campus-Cartographer.git
   cd Campus-Cartographer
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create `.env` in the root:
   ```
   DATABASE_URL=your_postgres_connection_string
   PORT=3000
   ```

   Create `.env` in `artifacts/campus-spotter/`:
   ```
   VITE_API_BASE_URL=http://localhost:3000
   ```

4. **Push the database schema**
   ```bash
   DATABASE_URL=your_connection_string pnpm --filter @workspace/db run push
   ```

5. **Start the backend**
   ```bash
   cd artifacts/api-server
   node ./build.mjs && PORT=3000 node --enable-source-maps ./dist/index.mjs
   ```

6. **Start the frontend** (new terminal)
   ```bash
   cd artifacts/campus-spotter
   npx vite --config vite.config.ts --host 0.0.0.0
   ```

   Open [http://localhost:4173](http://localhost:4173)

---

## Self-Hosting on a Mac (with Cloudflare Tunnel)

This app runs on a Mac Mini with a permanent public URL via Cloudflare Tunnel. pm2 keeps everything running automatically.

**Start everything:**
```bash
pm2 start ecosystem.config.cjs
```

**Check status:**
```bash
pm2 status
```

**View logs:**
```bash
pm2 logs
```

**Restart after a code change:**
```bash
git pull
cd artifacts/api-server && node ./build.mjs
pm2 restart all
```

---

## Database

Hosted on [Supabase](https://supabase.com) (free tier). Schema is managed with Drizzle ORM.

### Sightings table

| Column | Type | Description |
|---|---|---|
| id | int | Auto-incrementing primary key |
| university | text | Name of the university spotted |
| latitude | float | Latitude of the sighting |
| longitude | float | Longitude of the sighting |
| notes | text | Optional notes about the sighting |
| spotter_name | text | Name of the person who logged it |
| created_at | timestamptz | When the sighting was logged |
