"use client";

import { useEffect, useMemo, useState } from "react";
import { ComparisonCard } from "@/components/comparison-card";
import { RankedList } from "@/components/ranked-list";
import { TitleInput } from "@/components/title-input";
import {
  createComparisonSession,
  finalizeInsertion,
  formatTypeLabel,
  formatWatchLabel,
  getNextComparison,
  seedEntries,
  type ComparisonDecision,
  type ComparisonSession,
  type Entry,
  type Sentiment,
  type TitleType,
} from "@/lib/ranking";
import { loadEntries, saveEntries } from "@/lib/storage";

export function RateMyMovieApp() {
  const [entries, setEntries] = useState<Entry[]>(seedEntries());
  const [comparisonSession, setComparisonSession] = useState<ComparisonSession | null>(null);
  const [feedback, setFeedback] = useState("");
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");

  useEffect(() => {
    const storedEntries = loadEntries();
    if (storedEntries.length > 0) {
      setEntries(storedEntries);
    }
    setHasLoadedStorage(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveEntries(entries);
  }, [entries, hasLoadedStorage]);

  const nextComparison = useMemo(() => {
    if (!comparisonSession) return null;
    return getNextComparison(entries, comparisonSession);
  }, [comparisonSession, entries]);
  const filteredLibraryEntries = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => entry.title.toLowerCase().includes(query));
  }, [entries, libraryQuery]);
  const isComparisonOpen = Boolean(comparisonSession && nextComparison);
  const pendingTitle = comparisonSession?.pending.title ?? null;
  const pendingType = comparisonSession?.pending.type ?? null;
  const comparisonStep = comparisonSession?.comparisonCount ?? 0;

  useEffect(() => {
    if (comparisonSession && !nextComparison) {
      const result = finalizeInsertion(entries, comparisonSession);
      setEntries(result.entries);
      setComparisonSession(null);
      setFeedback(
        `${result.inserted.title} placed at #${result.inserted.rankPosition} with a score of ${result.inserted.visibleScore.toFixed(1)}/10.`,
      );
    }
  }, [comparisonSession, entries, nextComparison]);

  const handleSubmit = ({ title, sentiment, type, rewatch }: { title: string; sentiment: Sentiment; type: TitleType; rewatch: boolean }) => {
    const session = createComparisonSession(entries, {
      title,
      sentiment,
      type,
      rewatch,
    });

    if (!session) {
      return;
    }

    setComparisonSession(session);
    setFeedback(entries.length === 0 ? `${title} added.` : "");
  };

  const handleDecision = (decision: ComparisonDecision) => {
    if (!comparisonSession || !nextComparison) {
      return;
    }

    const updatedSession: ComparisonSession = {
      ...comparisonSession,
      lowerBound: decision === "less" ? nextComparison.midpoint + 1 : comparisonSession.lowerBound,
      upperBound: decision === "more" ? nextComparison.midpoint : comparisonSession.upperBound,
      comparisonCount: comparisonSession.comparisonCount + 1,
      comparedIds: comparisonSession.comparedIds.includes(nextComparison.target.id)
        ? comparisonSession.comparedIds
        : [...comparisonSession.comparedIds, nextComparison.target.id],
    };

    setComparisonSession(updatedSession);
  };

  return (
    <main className="shell">
      <section className="split-layout">
        <div className="panel panel-primary">
          <div className="hero-copy">
            <h1 className="title">Train your movie taste</h1>
            <p className="intro">Pick between movies. We&apos;ll build your rankings.</p>
          </div>

          <div className="stack">
            <TitleInput disabled={Boolean(comparisonSession)} onSubmit={handleSubmit} />
            <p className="feedback">{feedback}</p>
          </div>
        </div>

        <div className="panel panel-secondary">
          <p className="eyebrow">Your Rankings</p>
          <h2 className="library-title">Top 5 at a glance.</h2>
          <div className="stack">
            <RankedList
              entries={entries}
              onOpenLibrary={() => setShowLibrary(true)}
            />
          </div>
        </div>
      </section>

      {isComparisonOpen && (
        <ComparisonCard
          comparison={nextComparison}
          pendingTitle={pendingTitle}
          pendingType={pendingType}
          comparisonStep={comparisonStep}
          onDecision={handleDecision}
        />
      )}

      {showLibrary && (
        <div className="library-drawer-overlay" role="dialog" aria-modal="true" aria-labelledby="library-title">
          <button className="library-drawer-backdrop" type="button" aria-label="Close library" onClick={() => setShowLibrary(false)} />
          <aside className="library-drawer">
            <div className="library-drawer-header">
              <div>
                <h2 id="library-title" className="library-title">
                  Your Library
                </h2>
                <p className="library-summary">{entries.length} ranked titles</p>
              </div>
              <button className="close-button" type="button" onClick={() => setShowLibrary(false)}>
                Close
              </button>
            </div>

            <div className="library-toolbar">
              <input
                className="library-search"
                type="text"
                placeholder="Search your library..."
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
              />
            </div>

            <div className="library-grid">
              {filteredLibraryEntries.map((entry) => (
                <article className="library-card" key={entry.id}>
                  <div className="library-card-rank">#{entry.rankPosition}</div>
                  <div className="library-card-body">
                    <strong className="library-card-title">{entry.title}</strong>
                    <p className="library-meta">{formatTypeLabel(entry.type)} • {formatWatchLabel(entry.rewatch)}</p>
                  </div>
                  <div className="library-card-score">
                    <strong>{entry.visibleScore.toFixed(1)}</strong>
                    <span>Score</span>
                  </div>
                </article>
              ))}

              {filteredLibraryEntries.length === 0 && (
                <div className="empty">No titles match your search.</div>
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
