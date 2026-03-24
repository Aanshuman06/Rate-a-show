import { normalizeEntry, type Entry } from "@/lib/ranking";

const STORAGE_KEY = "reelrank.entries";

export function loadEntries(): Entry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Entry[];
    return Array.isArray(parsed) ? parsed.map((entry) => normalizeEntry(entry)) : [];
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
