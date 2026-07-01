import { db, sightingsTable } from "../../lib/db/src/index";

const data = [
  {
    id: 22,
    species: "California Poppy",
    latitude: 42.3734,
    longitude: -71.1189,
    notes: "Bright orange patch along the sidewalk",
    photoUrl: null,
    createdAt: new Date("2026-04-21T02:01:30.257Z"),
    spotterName: "Aaron",
  },
  {
    id: 23,
    species: "Lupine",
    latitude: 42.377,
    longitude: -71.1216,
    notes: null,
    photoUrl: null,
    createdAt: new Date("2026-04-21T20:01:24.078Z"),
    spotterName: "Jennifer Ju",
  },
  {
    id: 24,
    species: "Poppy",
    latitude: 42.3884,
    longitude: -71.119,
    notes: "Growing through a crack in the wall",
    photoUrl: null,
    createdAt: new Date("2026-04-22T01:05:02.537Z"),
    spotterName: "Aaron",
  },
  {
    id: 25,
    species: "Sunflower",
    latitude: 42.3656,
    longitude: -71.1037,
    notes: "Tall one in a community garden",
    photoUrl: null,
    createdAt: new Date("2026-04-23T01:26:36.950Z"),
    spotterName: "Aaron",
  },
  {
    id: 26,
    species: "Cosmos",
    latitude: 42.3736,
    longitude: -71.1015,
    notes: "Pink and white cluster",
    photoUrl: null,
    createdAt: new Date("2026-04-23T02:29:11.933Z"),
    spotterName: "Akash",
  },
  {
    id: 27,
    species: "Forget-me-not",
    latitude: 42.3625,
    longitude: -71.0862,
    notes: null,
    photoUrl: null,
    createdAt: new Date("2026-04-23T04:14:34.980Z"),
    spotterName: "Akash",
  },
  {
    id: 28,
    species: "Wild Rose",
    latitude: 42.3601,
    longitude: -71.0942,
    notes: null,
    photoUrl: null,
    createdAt: new Date("2026-04-23T14:58:35.196Z"),
    spotterName: "Aaron",
  },
  {
    id: 29,
    species: "Black-eyed Susan",
    latitude: 42.3848,
    longitude: -71.149,
    notes: null,
    photoUrl: null,
    createdAt: new Date("2026-04-24T22:43:35.254Z"),
    spotterName: "Emily",
  },
  {
    id: 30,
    species: "Violet",
    latitude: 42.3879,
    longitude: -71.132,
    notes: "Tiny purple ones under a tree",
    photoUrl: null,
    createdAt: new Date("2026-04-24T23:45:52.748Z"),
    spotterName: "Emily",
  },
  {
    id: 31,
    species: "Marigold",
    latitude: 42.3612,
    longitude: -71.112,
    notes: null,
    photoUrl: null,
    createdAt: new Date("2026-04-25T17:15:55.762Z"),
    spotterName: "Jennifer Ju",
  },
];

async function seed() {
  try {
    await db.insert(sightingsTable).values(data);
    console.log("Seeded database with sample wildflower sightings");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    process.exit(0);
  }
}

seed();
