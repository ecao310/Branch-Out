import { Router, type IRouter } from "express";
import { desc, eq, sql, ilike, asc } from "drizzle-orm";
import { db, sightingsTable } from "@workspace/db";
import {
  ListSightingsQueryParams,
  CreateSightingBody,
  GetSightingParams,
  ListSightingsResponse,
  GetSightingResponse,
  GetSightingStatsResponse,
  GetRecentSightingsResponse,
} from "@workspace/api-zod";

const STATIC_SPECIES = [
  "Black-eyed Susan", "Bluebell", "Bluebonnet", "Buttercup", "California Poppy",
  "Cardinal Flower", "Chicory", "Columbine", "Coneflower", "Cornflower",
  "Cosmos", "Dandelion", "Evening Primrose", "Fireweed", "Forget-me-not",
  "Foxglove", "Goldenrod", "Indian Paintbrush", "Iris", "Joe-Pye Weed",
  "Lupine", "Marigold", "Milkweed", "Morning Glory", "Phlox", "Poppy",
  "Primrose", "Queen Anne's Lace", "Sunflower", "Trillium", "Violet",
  "Wild Aster", "Wild Bergamot", "Wild Geranium", "Wild Rose", "Yarrow",
];

const router: IRouter = Router();

router.get("/species", async (_req, res): Promise<void> => {
  const rows = await db
    .selectDistinct({ species: sightingsTable.species })
    .from(sightingsTable)
    .orderBy(asc(sightingsTable.species));

  const fromDb = rows.map((r) => r.species);
  const merged = Array.from(new Set([...STATIC_SPECIES, ...fromDb])).sort((a, b) =>
    a.localeCompare(b)
  );
  res.json(merged);
});

router.get("/sightings", async (req, res): Promise<void> => {
  const parsed = ListSightingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { species } = parsed.data;

  const rows = species
    ? await db
        .select()
        .from(sightingsTable)
        .where(ilike(sightingsTable.species, `%${species}%`))
        .orderBy(desc(sightingsTable.createdAt))
    : await db
        .select()
        .from(sightingsTable)
        .orderBy(desc(sightingsTable.createdAt));

  res.json(ListSightingsResponse.parse(rows));
});

router.post("/sightings", async (req, res): Promise<void> => {
  const parsed = CreateSightingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [sighting] = await db
      .insert(sightingsTable)
      .values({
        species: parsed.data.species,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        notes: parsed.data.notes ?? null,
        photoUrl: parsed.data.photoUrl ?? null,
        spotterName: parsed.data.spotterName ?? null,
      })
      .returning();

    res.status(201).json(GetSightingResponse.parse(sighting));
  } catch (err) {
    console.error("INSERT ERROR:", err);
    res.status(500).json({ error: String(err) });
  }
});

router.get("/sightings/stats", async (_req, res): Promise<void> => {
  const stats = await db
    .select({
      species: sightingsTable.species,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(sightingsTable)
    .groupBy(sightingsTable.species)
    .orderBy(desc(sql`count(*)`));

  res.json(GetSightingStatsResponse.parse(stats));
});

router.get("/sightings/recent", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(sightingsTable)
    .orderBy(desc(sightingsTable.createdAt))
    .limit(10);

  res.json(GetRecentSightingsResponse.parse(rows));
});

router.get("/sightings/spotter-stats", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      spotterName: sightingsTable.spotterName,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(sightingsTable)
    .where(sql`${sightingsTable.spotterName} is not null and trim(${sightingsTable.spotterName}) != ''`)
    .groupBy(sightingsTable.spotterName)
    .orderBy(desc(sql`count(*)`));

  res.json(rows);
});

router.get("/sightings/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetSightingParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [sighting] = await db
    .select()
    .from(sightingsTable)
    .where(eq(sightingsTable.id, parsed.data.id));

  if (!sighting) {
    res.status(404).json({ error: "Sighting not found" });
    return;
  }

  res.json(GetSightingResponse.parse(sighting));
});

export default router;
