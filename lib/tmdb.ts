export type TmdbSuggestion = {
  tmdbId: number;
  title: string;
  type: "movie" | "tv";
  year: number | null;
  genres: string[];
  posterPath: string | null;
};

type GenreResponse = {
  genres: Array<{
    id: number;
    name: string;
  }>;
};

type SearchResult = {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  poster_path?: string | null;
};

type SearchResponse = {
  results: SearchResult[];
};

type MediaSearchResult = SearchResult & {
  media_type: "movie" | "tv";
};

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w154";

let movieGenreMapPromise: Promise<Map<number, string>> | null = null;
let tvGenreMapPromise: Promise<Map<number, string>> | null = null;

function getAuthHeaders() {
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  const bearer = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  return headers;
}

function buildUrl(path: string, params: Record<string, string>) {
  const url = new URL(`${TMDB_API_BASE}${path}`);
  const apiKey = process.env.TMDB_API_KEY;

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  if (apiKey) {
    url.searchParams.set("api_key", apiKey);
  }

  return url.toString();
}

async function fetchGenreMap(type: "movie" | "tv") {
  const response = await fetch(
    buildUrl(`/genre/${type}/list`, {
      language: "en-US",
    }),
    {
      headers: getAuthHeaders(),
      next: { revalidate: 86400 },
    },
  );

  if (!response.ok) {
    throw new Error(`TMDb genre fetch failed for ${type}`);
  }

  const data = (await response.json()) as GenreResponse;
  return new Map(data.genres.map((genre) => [genre.id, genre.name]));
}

export function getGenreMap(type: "movie" | "tv") {
  if (type === "movie") {
    movieGenreMapPromise ??= fetchGenreMap("movie");
    return movieGenreMapPromise;
  }

  tvGenreMapPromise ??= fetchGenreMap("tv");
  return tvGenreMapPromise;
}

function getYear(result: SearchResult) {
  const raw = result.media_type === "movie" ? result.release_date : result.first_air_date;
  if (!raw) return null;
  const year = Number.parseInt(raw.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

export async function searchTmdb(query: string): Promise<TmdbSuggestion[]> {
  const response = await fetch(
    buildUrl("/search/multi", {
      query,
      include_adult: "false",
      language: "en-US",
      page: "1",
    }),
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("TMDb search failed");
  }

  const [movieGenres, tvGenres, data] = await Promise.all([
    getGenreMap("movie"),
    getGenreMap("tv"),
    response.json() as Promise<SearchResponse>,
  ]);

  return data.results
    .filter((result): result is MediaSearchResult => result.media_type === "movie" || result.media_type === "tv")
    .slice(0, 5)
    .map((result) => {
      const type = result.media_type;
      const genreMap = type === "movie" ? movieGenres : tvGenres;
      const title = type === "movie" ? result.title ?? "Untitled" : result.name ?? "Untitled";

      return {
        tmdbId: result.id,
        title,
        type,
        year: getYear(result),
        genres: (result.genre_ids ?? []).map((id) => genreMap.get(id)).filter((value): value is string => Boolean(value)),
        posterPath: result.poster_path ? `${TMDB_IMAGE_BASE}${result.poster_path}` : null,
      };
    });
}
