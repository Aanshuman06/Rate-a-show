import { NextResponse } from "next/server";
import { searchTmdb } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const debug = searchParams.get("debug") === "1";

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  if (!process.env.TMDB_API_READ_ACCESS_TOKEN && !process.env.TMDB_API_KEY) {
    return NextResponse.json(
      debug
        ? {
            results: [],
            error: "Missing TMDb credentials",
            hasReadToken: Boolean(process.env.TMDB_API_READ_ACCESS_TOKEN),
            hasApiKey: Boolean(process.env.TMDB_API_KEY),
          }
        : { results: [] },
      { status: 200 },
    );
  }

  try {
    const results = await searchTmdb(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("TMDb search route error", error);
    return NextResponse.json(
      debug
        ? {
            results: [],
            error: error instanceof Error ? error.message : "Unknown TMDb error",
            hasReadToken: Boolean(process.env.TMDB_API_READ_ACCESS_TOKEN),
            hasApiKey: Boolean(process.env.TMDB_API_KEY),
          }
        : { results: [] },
      { status: 200 },
    );
  }
}
