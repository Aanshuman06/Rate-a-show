"use client";

import { useEffect, useState } from "react";
import type { TmdbSuggestion } from "@/lib/tmdb";
import type { Sentiment, TitleType } from "@/lib/ranking";

type TitleInputProps = {
  disabled: boolean;
  onSubmit: (payload: {
    title: string;
    sentiment: Sentiment;
    type: TitleType;
    tmdbId: number | null;
    genres: string[];
    year: number | null;
    posterPath: string | null;
    rewatch: boolean;
  }) => void;
};

export function TitleInput({ disabled, onSubmit }: TitleInputProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TitleType>("movie");
  const [rewatch, setRewatch] = useState(false);
  const [suggestions, setSuggestions] = useState<TmdbSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<TmdbSuggestion | null>(null);
  const [debouncedTitle, setDebouncedTitle] = useState("");
  const [selectionMessage, setSelectionMessage] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedTitle(title.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [title]);

  useEffect(() => {
    if (disabled || debouncedTitle.length < 2 || selectedSuggestion?.title === title.trim()) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    setIsSearching(true);

    fetch(`/api/tmdb/search?query=${encodeURIComponent(debouncedTitle)}`)
      .then((response) => response.json() as Promise<{ results: TmdbSuggestion[] }>)
      .then((data) => {
        if (!isCancelled) {
          setSuggestions(data.results ?? []);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsSearching(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedTitle, disabled, selectedSuggestion, title]);

  const handleSubmit = (sentiment: Sentiment) => {
    const normalized = title.trim();
    if (!normalized || disabled) return;
    if (!selectedSuggestion) {
      setSelectionMessage("Select a title from the TMDb results to continue.");
      return;
    }

    onSubmit({
      title: normalized,
      sentiment,
      type: selectedSuggestion.type,
      tmdbId: selectedSuggestion.tmdbId,
      genres: selectedSuggestion.genres,
      year: selectedSuggestion.year,
      posterPath: selectedSuggestion.posterPath,
      rewatch,
    });
    setTitle("");
    setType("movie");
    setRewatch(false);
    setSelectedSuggestion(null);
    setSuggestions([]);
    setSelectionMessage("");
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSelectionMessage("");
    if (selectedSuggestion && value.trim() !== selectedSuggestion.title) {
      setSelectedSuggestion(null);
    }
  };

  const handleSelectSuggestion = (suggestion: TmdbSuggestion) => {
    setSelectedSuggestion(suggestion);
    setTitle(suggestion.title);
    setType(suggestion.type);
    setSuggestions([]);
    setSelectionMessage("");
  };

  const canSubmit = !disabled && Boolean(selectedSuggestion);

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
        onChange={(event) => handleTitleChange(event.target.value)}
        placeholder="Enter movie or TV show..."
        autoComplete="off"
        disabled={disabled}
      />
      {(isSearching || suggestions.length > 0) && (
        <div className="search-dropdown">
          {isSearching && suggestions.length === 0 ? (
            <div className="search-empty">Searching TMDb…</div>
          ) : !isSearching && suggestions.length === 0 && debouncedTitle.length >= 2 ? (
            <div className="search-empty">No TMDb matches found.</div>
          ) : (
            suggestions.map((suggestion) => (
              <button
                key={`${suggestion.type}-${suggestion.tmdbId}`}
                className="search-result"
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                {suggestion.posterPath ? (
                  <img className="search-poster" src={suggestion.posterPath} alt="" />
                ) : (
                  <div className="search-poster search-poster-fallback" aria-hidden="true">🎬</div>
                )}
                <span className="search-copy">
                  <strong>{suggestion.title}</strong>
                  <span>
                    {suggestion.year ?? "Unknown"} • {suggestion.type === "movie" ? "Movie" : "TV Show"}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
      {selectionMessage ? <p className="selection-message">{selectionMessage}</p> : null}
      <div className="selector-group">
        <div className="selector-row">
          <span className="selector-label">Type</span>
          <div className="segmented-control">
            <button
              className={`segment ${type === "movie" ? "is-active" : ""}`}
              type="button"
              disabled={disabled || Boolean(selectedSuggestion)}
              onClick={() => setType("movie")}
            >
              Movie
            </button>
            <button
              className={`segment ${type === "tv" ? "is-active" : ""}`}
              type="button"
              disabled={disabled || Boolean(selectedSuggestion)}
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
        <button className="button like" type="button" disabled={!canSubmit} onClick={() => handleSubmit("liked")}>
          I like it
        </button>
        <button className="button dislike" type="button" disabled={!canSubmit} onClick={() => handleSubmit("disliked")}>
          I don&apos;t like it
        </button>
      </div>
    </div>
  );
}
