"use client";

import { useState } from "react";
import type { Sentiment, TitleType } from "@/lib/ranking";

type TitleInputProps = {
  disabled: boolean;
  onSubmit: (payload: { title: string; sentiment: Sentiment; type: TitleType; rewatch: boolean }) => void;
};

export function TitleInput({ disabled, onSubmit }: TitleInputProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TitleType>("movie");
  const [rewatch, setRewatch] = useState(false);

  const handleSubmit = (sentiment: Sentiment) => {
    const normalized = title.trim();
    if (!normalized || disabled) return;
    onSubmit({ title: normalized, sentiment, type, rewatch });
    setTitle("");
    setType("movie");
    setRewatch(false);
  };

  return (
    <div className="input-block">
      <label className="sr-only" htmlFor="title-input">
        Enter movie or TV show
      </label>
      <input
        id="title-input"
        className="input"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Enter movie or TV show..."
        autoComplete="off"
        disabled={disabled}
      />
      <div className="selector-group">
        <div className="selector-row">
          <span className="selector-label">Type</span>
          <div className="segmented-control">
            <button
              className={`segment ${type === "movie" ? "is-active" : ""}`}
              type="button"
              disabled={disabled}
              onClick={() => setType("movie")}
            >
              Movie
            </button>
            <button
              className={`segment ${type === "tv" ? "is-active" : ""}`}
              type="button"
              disabled={disabled}
              onClick={() => setType("tv")}
            >
              TV Show
            </button>
          </div>
        </div>
        <div className="selector-row">
          <span className="selector-label">Watch</span>
          <div className="segmented-control">
            <button
              className={`segment ${!rewatch ? "is-active" : ""}`}
              type="button"
              disabled={disabled}
              onClick={() => setRewatch(false)}
            >
              First watch
            </button>
            <button
              className={`segment ${rewatch ? "is-active" : ""}`}
              type="button"
              disabled={disabled}
              onClick={() => setRewatch(true)}
            >
              Rewatch
            </button>
          </div>
        </div>
      </div>
      <div className="actions action-group">
        <button className="button like" type="button" disabled={disabled} onClick={() => handleSubmit("liked")}>
          I like it
        </button>
        <button className="button dislike" type="button" disabled={disabled} onClick={() => handleSubmit("disliked")}>
          I don&apos;t like it
        </button>
      </div>
    </div>
  );
}
