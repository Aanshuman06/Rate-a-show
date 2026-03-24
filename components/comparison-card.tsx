"use client";

import { useEffect, useRef } from "react";
import { formatTypeLabel, type ComparisonDecision, type ComparisonPrompt, type TitleType } from "@/lib/ranking";

type ComparisonCardProps = {
  comparison: ComparisonPrompt | null;
  pendingTitle: string | null;
  pendingType: TitleType | null;
  comparisonStep: number;
  onDecision: (decision: ComparisonDecision) => void;
};

export function ComparisonCard({ comparison, pendingTitle, pendingType, comparisonStep, onDecision }: ComparisonCardProps) {
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    primaryButtonRef.current?.focus();
  }, [comparison?.target.id, pendingTitle, comparisonStep]);

  if (!comparison || !pendingTitle || !pendingType) {
    return null;
  }

  return (
    <div className="comparison-modal" role="dialog" aria-modal="true" aria-labelledby="comparison-title">
      <section className="comparison-dialog">
        <div className="comparison-header">
          <h2 id="comparison-title" className="comparison-prompt">Pick your favorite</h2>
        </div>
        <div className="comparison-actions comparison-actions-inline">
          <button ref={primaryButtonRef} className="secondary-button comparison-choice" type="button" onClick={() => onDecision("more")}>
            <span className="comparison-choice-title">{pendingTitle}</span>
            <span className="comparison-choice-meta">{formatTypeLabel(pendingType)}</span>
          </button>
          <button className="secondary-button comparison-choice" type="button" onClick={() => onDecision("less")}>
            <span className="comparison-choice-title">{comparison.target.title}</span>
            <span className="comparison-choice-meta">{formatTypeLabel(comparison.target.type)}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
