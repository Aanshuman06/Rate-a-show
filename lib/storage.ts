import { normalizeEntry, type Entry } from "@/lib/ranking";

const STORAGE_KEY = "ratemymovie.entries";
const LEGACY_STORAGE_KEY = "reelrank.entries";

function isDemoEntry(entry: Entry) {
  return entry.id.startsWith("seed-");
}

export function loadEntries(): Entry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Entry[];
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed.map((entry) => normalizeEntry(entry)).filter((entry) => !isDemoEntry(entry));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return [];
  }
}

export function saveEntries(entries: Entry[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage errors in the MVP and keep the UI responsive.
  }
}
