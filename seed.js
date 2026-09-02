const { createClient } = require('@libsql/client');

const client = createClient({ url: 'file:local.db' });

async function seed() {
  const movies = [
    {
      id: crypto.randomUUID(),
      name: "Dune: Part Two",
      meta: "2024 · Denis Villeneuve · 166 min",
      tagline: "Long live the fighters.",
      posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/1pdfLvkbY9ohJlCjQH2JGqqUTTN.jpg",
      trailerUrl: "https://www.youtube.com/watch?v=Way9Dexny3w",
      tmdbId: 693134,
      order: 1,
      createdAt: Date.now()
    },
    {
      id: crypto.randomUUID(),
      name: "Oppenheimer",
      meta: "2023 · Christopher Nolan · 180 min",
      tagline: "The world forever changes.",
      posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      trailerUrl: "https://www.youtube.com/watch?v=uYPbbksJxIg",
      tmdbId: 872585,
      order: 2,
      createdAt: Date.now()
    },
    {
      id: crypto.randomUUID(),
      name: "Spider-Man: Across the Spider-Verse",
      meta: "2023 · Joaquim Dos Santos · 140 min",
      tagline: "It's how you wear the mask that matters.",
      posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
      trailerUrl: "https://www.youtube.com/watch?v=cqGjhVJWtEg",
      tmdbId: 569094,
      order: 3,
      createdAt: Date.now()
    },
    {
      id: crypto.randomUUID(),
      name: "Interstellar",
      meta: "2014 · Christopher Nolan · 169 min",
      tagline: "Mankind was born on Earth. It was never meant to die here.",
      posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/gEU2QlsUUHXjNpeiyNjYcBAym5p.jpg",
      trailerUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
      tmdbId: 157336,
      order: 4,
      createdAt: Date.now()
    },
    {
      id: crypto.randomUUID(),
      name: "The Batman",
      meta: "2022 · Matt Reeves · 176 min",
      tagline: "Unmask the truth.",
      posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/74xTEgt7R36Fpooo50r9T25onhq.jpg",
      trailerUrl: "https://www.youtube.com/watch?v=mqqft2x_Aa4",
      tmdbId: 414906,
      order: 5,
      createdAt: Date.now()
    }
  ];

  for (const movie of movies) {
    await client.execute({
      sql: 'INSERT INTO Movie (id, name, meta, tagline, posterUrl, trailerUrl, tmdbId, "order", createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [movie.id, movie.name, movie.meta, movie.tagline, movie.posterUrl, movie.trailerUrl, movie.tmdbId, movie.order, movie.createdAt]
    });
  }
  
  await client.execute({
    sql: 'INSERT INTO PollSettings (id, isOpen) VALUES (?, ?)',
    args: ['singleton', 1]
  });

  console.log("Seeded database with dummy movies.");
}

seed().catch(console.error);
