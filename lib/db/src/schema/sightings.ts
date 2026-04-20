import { pgTable, text, serial, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sightingsTable = pgTable("sightings", {
  id: serial("id").primaryKey(),
  university: text("university").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSightingSchema = createInsertSchema(sightingsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSighting = z.infer<typeof insertSightingSchema>;
export type Sighting = typeof sightingsTable.$inferSelect;
