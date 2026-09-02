const TMDB_ACCESS_TOKEN = process.env.TMDB_API_KEY;

export type TMDBMovie = {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
};

export type TMDBMovieDetails = TMDBMovie & {
  runtime: number | null;
  genres: { id: number; name: string }[];
  tagline: string | null;
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
    crew: { id: number; name: string; job: string; department: string }[];
  };
};

const BASE_URL = "https://api.themoviedb.org/3";

function getHeaders() {
  return {
    accept: "application/json",
    Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
  };
}

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  if (!TMDB_ACCESS_TOKEN) {
    console.warn("TMDB_API_KEY is not set.");
    return [];
  }
  if (!query) return [];
  
  const res = await fetch(`${BASE_URL}/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`, {
    headers: getHeaders(),
  });
  
  if (!res.ok) {
    console.error("Failed to fetch from TMDB:", await res.text());
    return [];
  }
  
  const data = await res.json();
  return data.results || [];
}

export async function getMovieDetails(id: number): Promise<TMDBMovieDetails | null> {
  if (!TMDB_ACCESS_TOKEN) return null;
  
  const res = await fetch(`${BASE_URL}/movie/${id}?append_to_response=credits&language=en-US`, {
    headers: getHeaders(),
  });
  
  if (!res.ok) return null;
  
  const data = await res.json();
  return data;
}

export function getTMDBImage(path: string | null, size: "w200" | "w500" | "original" = "w500"): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
