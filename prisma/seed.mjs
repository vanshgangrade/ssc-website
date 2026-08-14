import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

function posterDataUri(filename) {
  const bytes = readFileSync(join(__dirname, "..", "public", "posters", filename));
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}

const seedMovies = [
  {
    name: "Mission: Impossible — Fallout",
    meta: "Action · Espionage · 2018",
    tagline:
      "A stolen payload, a broken clock, and a team that only trusts itself. Full-throttle, HALO-jump, edge-of-seat cinema.",
    posterUrl: posterDataUri("mi.jpg"),
    order: 0,
  },
  {
    name: "Catch Me If You Can",
    meta: "Crime · Comedy · 2002",
    tagline:
      "A teenage forger, a check for two million, and a fed one flight behind. Jet-age charm with a con at every altitude.",
    posterUrl: posterDataUri("catch.jpg"),
    order: 1,
  },
  {
    name: "21 Jump Street",
    meta: "Action · Comedy · 2012",
    tagline:
      "Two cops, one high school, zero cool. An undercover bust turns into detention all over again — loud, dumb, and very funny.",
    posterUrl: posterDataUri("jump.jpg"),
    order: 2,
  },
];

async function main() {
  const existing = await prisma.movie.count();
  if (existing > 0) {
    console.log(`Movie table already has ${existing} row(s) — skipping seed.`);
    return;
  }
  await prisma.movie.createMany({ data: seedMovies });
  console.log(`Seeded ${seedMovies.length} movies.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
