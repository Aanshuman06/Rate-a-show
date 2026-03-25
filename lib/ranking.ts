export type Sentiment = "liked" | "disliked";
export type TitleType = "movie" | "tv";
export type ComparisonDecision = "more" | "less";

export type Entry = {
  id: string;
  title: string;
  type: TitleType;
  tmdbId: number | null;
  genres: string[];
  year: number | null;
  posterPath: string | null;
  rewatch: boolean;
  sentiment: Sentiment;
  rankPosition: number;
  internalScore: number;
  visibleScore: number;
  comparisonCount: number;
  confidence: number;
  confidenceLabel: "low" | "medium" | "high";
};

export type PendingTitle = {
  title: string;
  type: TitleType;
  tmdbId: number | null;
  genres: string[];
  year: number | null;
  posterPath: string | null;
  rewatch: boolean;
  sentiment: Sentiment;
};

export type ComparisonSession = {
  pending: PendingTitle;
  bucket: Sentiment;
  lowerBound: number;
  upperBound: number;
  comparisonCount: number;
  comparedIds: string[];
};

export type ComparisonPrompt = {
  target: Entry;
  targetIndex: number;
};

type RankedResult = {
  entries: Entry[];
  inserted: Entry;
};

const SCORE_FLOOR = 1;
const SCORE_CEILING = 10;

function createId() {
  return `title-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function computeConfidence(comparisonCount: number) {
  const normalized = clamp(comparisonCount / 8, 0.15, 1);
  if (normalized >= 0.75) return { value: normalized, label: "high" as const };
  if (normalized >= 0.45) return { value: normalized, label: "medium" as const };
  return { value: normalized, label: "low" as const };
}

function normalizeVisibleScore(index: number, total: number) {
  if (total <= 1) return SCORE_CEILING;
  return SCORE_CEILING - ((SCORE_CEILING - SCORE_FLOOR) * index) / (total - 1);
}

function withDerivedFields(entries: Entry[]) {
  return entries.map((entry, index, all) => {
    const confidence = computeConfidence(entry.comparisonCount);
    return {
      ...entry,
      rankPosition: index + 1,
      visibleScore: normalizeVisibleScore(index, all.length),
      confidence: confidence.value,
      confidenceLabel: confidence.label,
    };
  });
}

function scoreBetween(above?: Entry, below?: Entry) {
  if (!above && !below) return 1000;
  if (!above && below) return below.internalScore + 120;
  if (above && !below) return above.internalScore - 120;
  return (above!.internalScore + below!.internalScore) / 2;
}

function bucketEntries(entries: Entry[], sentiment: Sentiment) {
  return entries.filter((entry) => entry.sentiment === sentiment);
}

function absoluteInsertIndex(entries: Entry[], sentiment: Sentiment, bucketInsertIndex: number) {
  if (sentiment === "liked") {
    return bucketInsertIndex;
  }

  const likedCount = entries.filter((entry) => entry.sentiment === "liked").length;
  return likedCount + bucketInsertIndex;
}

function buildEntry(pending: PendingTitle, absoluteIndex: number, entries: Entry[], comparisonCount: number): Entry {
  const above = entries[absoluteIndex - 1];
  const below = entries[absoluteIndex];
  const confidence = computeConfidence(comparisonCount);

  return {
    id: createId(),
    title: pending.title,
    type: pending.type,
    tmdbId: pending.tmdbId,
    genres: pending.genres,
    year: pending.year,
    posterPath: pending.posterPath,
    rewatch: pending.rewatch,
    sentiment: pending.sentiment,
    rankPosition: absoluteIndex + 1,
    internalScore: scoreBetween(above, below),
    visibleScore: 0,
    comparisonCount,
    confidence: confidence.value,
    confidenceLabel: confidence.label,
  };
}

export function seedEntries() {
  return withDerivedFields([]);
}

export function createComparisonSession(entries: Entry[], pending: PendingTitle): ComparisonSession | null {
  const session: ComparisonSession = {
    pending,
    bucket: pending.sentiment,
    lowerBound: 0,
    upperBound: bucketEntries(entries, pending.sentiment).length,
    comparisonCount: 0,
    comparedIds: [],
  };

  return session;
}

export function normalizeEntry(entry: Partial<Entry> & Pick<Entry, "id" | "title" | "sentiment" | "rankPosition" | "internalScore" | "visibleScore" | "comparisonCount" | "confidence" | "confidenceLabel">): Entry {
  return {
    ...entry,
    type: entry.type === "tv" ? "tv" : "movie",
    tmdbId: typeof entry.tmdbId === "number" ? entry.tmdbId : null,
    genres: Array.isArray(entry.genres) ? entry.genres.filter((genre): genre is string => typeof genre === "string") : [],
    year: typeof entry.year === "number" ? entry.year : null,
    posterPath: typeof entry.posterPath === "string" ? entry.posterPath : null,
    rewatch: Boolean(entry.rewatch),
  };
}

export function formatTypeLabel(type: TitleType) {
  return type === "movie" ? "Movie" : "TV Show";
}

export function formatWatchLabel(rewatch: boolean) {
  return rewatch ? "Rewatch" : "First watch";
}

function genreOverlapScore(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return 0;
  const left = new Set(a);
  const matches = b.filter((genre) => left.has(genre)).length;
  return matches / Math.max(a.length, b.length);
}

function typeMatchScore(pending: PendingTitle, candidate: Entry) {
  return pending.type === candidate.type ? 1 : 0;
}

function rangeClosenessScore(index: number, lowerBound: number, upperBound: number) {
  const midpoint = (lowerBound + upperBound - 1) / 2;
  const maxDistance = Math.max((upperBound - lowerBound - 1) / 2, 1);
  return 1 - Math.min(Math.abs(index - midpoint) / maxDistance, 1);
}

function uncertaintyScore(candidate: Entry) {
  return 1 - candidate.confidence;
}

function candidateScore(
  pending: PendingTitle,
  candidate: Entry,
  index: number,
  lowerBound: number,
  upperBound: number,
  allowCrossGenreBias: boolean,
) {
  const sharedGenreScore = genreOverlapScore(pending.genres, candidate.genres);
  const score =
    0.4 * typeMatchScore(pending, candidate) +
    0.3 * sharedGenreScore +
    0.2 * rangeClosenessScore(index, lowerBound, upperBound) +
    0.1 * uncertaintyScore(candidate);

  if (allowCrossGenreBias && sharedGenreScore === 0) {
    return score + 0.2;
  }

  return score;
}

export function getNextComparison(entries: Entry[], session: ComparisonSession): ComparisonPrompt | null {
  const bucket = bucketEntries(entries, session.bucket);
  if (session.lowerBound >= session.upperBound || bucket.length === 0) {
    return null;
  }

  const candidateIndexes = bucket
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ index }) => index >= session.lowerBound && index < session.upperBound);

  if (candidateIndexes.length === 0) {
    return null;
  }

  const allowCrossGenreBias = Math.random() < 0.2;
  const best = candidateIndexes.reduce((bestCandidate, current) => {
    const currentScore = candidateScore(
      session.pending,
      current.candidate,
      current.index,
      session.lowerBound,
      session.upperBound,
      allowCrossGenreBias,
    );

    if (!bestCandidate || currentScore > bestCandidate.score) {
      return { ...current, score: currentScore };
    }

    return bestCandidate;
  }, null as { candidate: Entry; index: number; score: number } | null);

  return best
    ? {
        target: best.candidate,
        targetIndex: best.index,
      }
    : null;
}

/**
 * Inserts a new title after a binary-search-style comparison flow.
 *
 * The rough bucket comes from the user's initial like/dislike choice.
 * Inside that bucket we compare only against titles with the same sentiment,
 * which keeps the number of questions low. Existing items keep their internal
 * scores, so high-confidence titles move less; the new title receives a score
 * between its neighbors and the visible 1-10 ratings are recalculated for the
 * entire list after insertion.
 */
export function finalizeInsertion(entries: Entry[], session: ComparisonSession): RankedResult {
  const adjustedEntries = entries.map((entry) =>
    session.comparedIds.includes(entry.id)
      ? {
          ...entry,
          comparisonCount: entry.comparisonCount + 1,
        }
      : entry,
  );
  const absoluteIndex = absoluteInsertIndex(entries, session.bucket, session.lowerBound);
  const inserted = buildEntry(session.pending, absoluteIndex, adjustedEntries, session.comparisonCount);
  const nextEntries = [...adjustedEntries];

  nextEntries.splice(absoluteIndex, 0, inserted);
  const derived = withDerivedFields(nextEntries);

  return {
    entries: derived,
    inserted: derived[absoluteIndex],
  };
}
