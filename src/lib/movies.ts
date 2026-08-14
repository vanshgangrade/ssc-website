export type MovieDTO = {
  id: string;
  name: string;
  meta: string;
  tagline: string;
  posterUrl: string;
};

export const MAX_POSTER_BYTES = 3 * 1024 * 1024; // 3MB, base64-encoded posters live directly in Postgres
