export type MovieDTO = {
  id: string;
  name: string;
  meta: string;
  tagline: string;
  posterUrl: string;
  trailerUrl: string | null;
  tmdbId: number | null;
};

export const MAX_POSTER_BYTES = 3 * 1024 * 1024; // 3MB, base64-encoded posters live directly in Postgres
