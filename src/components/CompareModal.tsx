"use client";

import { useEffect, useState } from "react";
import type { MovieDTO } from "@/lib/movies";
import { getTMDBDetails } from "@/app/actions";
import type { TMDBMovieDetails } from "@/lib/tmdb";
import "./compare.css";

export default function CompareModal({
  movies,
  onClose,
}: {
  movies: MovieDTO[];
  onClose: () => void;
}) {
  const [details, setDetails] = useState<Record<string, TMDBMovieDetails | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      const newDetails: Record<string, TMDBMovieDetails | null> = {};
      for (const m of movies) {
        if (m.tmdbId) {
          const res = await getTMDBDetails(m.tmdbId).catch(() => null);
          newDetails[m.id] = res;
        } else {
          newDetails[m.id] = null;
        }
      }
      setDetails(newDetails);
      setLoading(false);
    }
    fetchDetails();
  }, [movies]);

  return (
    <div className="compare-modal-backdrop" onClick={onClose}>
      <div className="compare-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="compare-modal-close" onClick={onClose}>✕</button>
        <h2 className="compare-title">Compare Movies</h2>
        
        <div className="compare-grid">
          {movies.map(m => {
            const tmdb = details[m.id];
            
            return (
              <div key={m.id} className="compare-column">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.posterUrl} alt={m.name} className="compare-poster" />
                <h3 className="compare-movie-title">{m.name}</h3>
                <p className="compare-meta">{m.meta}</p>
                <p className="compare-tagline">{m.tagline}</p>
                
                {loading ? (
                  <div className="compare-loading">Loading details...</div>
                ) : (
                  <div className="compare-rich-details">
                    {tmdb ? (
                      <>
                        <div className="compare-stat">
                          <span className="stat-label">Rating</span>
                          <span className="stat-value">★ {tmdb.vote_average.toFixed(1)}/10</span>
                        </div>
                        <div className="compare-stat">
                          <span className="stat-label">Runtime</span>
                          <span className="stat-value">{tmdb.runtime ? `${tmdb.runtime} min` : "N/A"}</span>
                        </div>
                        <div className="compare-stat">
                          <span className="stat-label">Genres</span>
                          <span className="stat-value">{tmdb.genres.map(g => g.name).join(", ")}</span>
                        </div>
                        {tmdb.credits?.crew.find(c => c.job === "Director") && (
                          <div className="compare-stat">
                            <span className="stat-label">Director</span>
                            <span className="stat-value">{tmdb.credits.crew.find(c => c.job === "Director")?.name}</span>
                          </div>
                        )}
                        <p className="compare-overview">{tmdb.overview}</p>
                      </>
                    ) : (
                      <p className="compare-no-details">No rich details available (Missing TMDB ID)</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
