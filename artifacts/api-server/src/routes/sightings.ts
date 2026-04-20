import { Router, type IRouter } from "express";
import { desc, eq, sql, ilike } from "drizzle-orm";
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

const router: IRouter = Router();

router.get("/sightings", async (req, res): Promise<void> => {
  const parsed = ListSightingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { university } = parsed.data;

  const rows = university
    ? await db
        .select()
        .from(sightingsTable)
        .where(ilike(sightingsTable.university, `%${university}%`))
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

  const [sighting] = await db
    .insert(sightingsTable)
    .values({
      university: parsed.data.university,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  res.status(201).json(GetSightingResponse.parse(sighting));
});

router.get("/sightings/stats", async (_req, res): Promise<void> => {
  const stats = await db
    .select({
      university: sightingsTable.university,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(sightingsTable)
    .groupBy(sightingsTable.university)
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
