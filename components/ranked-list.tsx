import { formatTypeLabel, formatWatchLabel, type Entry } from "@/lib/ranking";

type RankedListProps = {
  entries: Entry[];
  onOpenLibrary: () => void;
};

export function RankedList({ entries, onOpenLibrary }: RankedListProps) {
  const previewEntries = entries.slice(0, 5);
  const hiddenCount = Math.max(entries.length - previewEntries.length, 0);

  return (
    <section>
      <div className="list-header">
        <h2>Your Rankings</h2>
        <span>{entries.length} titles</span>
      </div>

      {entries.length === 0 ? (
        <div className="empty">Start by adding your first movie.</div>
      ) : (
        <>
          <ol className="list">
            {previewEntries.map((entry) => (
              <li className={`row ${entry.rankPosition === 1 ? "row-top" : ""}`} key={entry.id}>
                <div className="row-main">
                  <span className="row-title">{entry.title}</span>
                  <span className="meta">{formatTypeLabel(entry.type)} • {formatWatchLabel(entry.rewatch)}</span>
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
