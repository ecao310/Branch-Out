import { db, sightingsTable } from "../../lib/db/src/index.ts";

const data = [
  {
    id: 22,
    university: "UCSF",
    latitude: 37.76867,
    longitude: -122.42704,
    notes: "Saw at Whole Foods",
    createdAt: new Date("2026-04-21T02:01:30.257Z"),
    spotterName: "Aaron",
  },
  {
    id: 23,
    university: "Purdue",
    latitude: 37.76677,
    longitude: -122.42967,
    notes: null,
    createdAt: new Date("2026-04-21T20:01:24.078Z"),
    spotterName: "Jennifer Ju",
  },
  {
    id: 24,
    university: "Cornell",
    latitude: 37.76854,
    longitude: -122.427635,
    notes: "Sweat pants",
    createdAt: new Date("2026-04-22T01:05:02.537Z"),
    spotterName: "Aaron",
  },
  {
    id: 25,
    university: "Stanford",
    latitude: 37.775085,
    longitude: -122.42492,
    notes: "Akash",
    createdAt: new Date("2026-04-23T01:26:36.950Z"),
    spotterName: "Aaron",
  },
  {
    id: 26,
    university: "Stanford",
    latitude: 37.77508,
    longitude: -122.42494,
    notes: "Swimming sweater",
    createdAt: new Date("2026-04-23T02:29:11.933Z"),
    spotterName: "Akash",
  },
  {
    id: 27,
    university: "California (Berkeley)",
    latitude: 37.777096,
    longitude: -122.42318,
    notes: null,
    createdAt: new Date("2026-04-23T04:14:34.980Z"),
    spotterName: "Akash",
  },
  {
    id: 28,
    university: "Cornell",
    latitude: 37.78943,
    longitude: -122.40126,
    notes: null,
    createdAt: new Date("2026-04-23T14:58:35.196Z"),
    spotterName: "Aaron",
  },
  {
    id: 29,
    university: "UCLA",
    latitude: 37.778133,
    longitude: -122.43853,
    notes: null,
    createdAt: new Date("2026-04-24T22:43:35.254Z"),
    spotterName: "Emily",
  },
  {
    id: 30,
    university: "California (Berkeley)",
    latitude: 37.77216,
    longitude: -122.42537,
    notes: null,
    createdAt: new Date("2026-04-24T23:45:52.748Z"),
    spotterName: "Emily",
  },
  {
    id: 31,
    university: "Stanford",
    latitude: 37.761524,
    longitude: -122.43058,
    notes: null,
    createdAt: new Date("2026-04-25T17:15:55.762Z"),
    spotterName: "Jennifer Ju",
  },
];

async function seed() {
  try {
    await db.insert(sightingsTable).values(data);
    console.log("Seeded database with production data");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    process.exit(0);
  }
}

seed();