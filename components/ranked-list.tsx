import { formatTypeLabel, formatWatchLabel, type Entry } from "@/lib/ranking";

type RankedListProps = {
  entries: Entry[];
  onOpenLibrary: () => void;
};

export function RankedList({ entries, onOpenLibrary }: RankedListProps) {
  const previewEntries = entries.slice(0, 5);
  const hiddenCount = Math.max(entries.length - previewEntries.length, 0);

  return (
    <section className={`rankings-section ${entries.length === 0 ? "is-empty" : ""}`}>
      <div className="list-header">
        <h2>Your Rankings</h2>
        <span>{entries.length} titles</span>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state-wrap">
          <div className="empty">
            <div className="empty-icon" aria-hidden="true">🎬</div>
            <strong>Nothing ranked yet</strong>
            <span>Add your first movie to get started.</span>
          </div>
        </div>
      ) : (
        <>
          <ol className="list">
            {previewEntries.map((entry) => (
              <li className={`row ${entry.rankPosition === 1 ? "row-top" : ""}`} key={entry.id}>
                <div className="row-main">
                  <span className="row-title">{entry.title}</span>
                  <span className="meta">
                    {formatTypeLabel(entry.type)} • {formatWatchLabel(entry.rewatch)}
                    {entry.genres.length > 0 ? ` • ${entry.genres.slice(0, 2).join(", ")}` : ""}
                  </span>
                </div>
                <div className="row-score">
                  <strong className="score-value">{entry.visibleScore.toFixed(1)}</strong>
                  <span className="score-meta">/10 • #{entry.rankPosition}</span>
                </div>
              </li>
            ))}
          </ol>

          {entries.length > 0 && (
            <button className="library-button" type="button" onClick={onOpenLibrary}>
              {hiddenCount > 0 ? `View all rankings (${hiddenCount} more)` : "See full list"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
