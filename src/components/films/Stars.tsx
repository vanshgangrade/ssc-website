"use client";

import { useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { RATING_MAX, RATING_MIN } from "@/lib/filmRules";

type Css = CSSProperties & Record<`--${string}`, string | number>;

// "3½" style label for a half-star value (1–10).
export function starLabel(value: number): string {
  const whole = Math.floor(value / 2);
  const half = value % 2 === 1;
  if (!whole) return "½";
  return `${whole}${half ? "½" : ""}`;
}

// Read-only stars. `value` is in half-stars (0–10); fractions are fine for averages.
export function Stars({ value, size = "1em", label }: { value: number; size?: string; label?: string }) {
  return (
    <span className="stars" style={{ "--v": value, fontSize: size } as Css} role="img" aria-label={label ?? `${starLabel(Math.round(value))} out of 5 stars`}>
      <span aria-hidden="true">★★★★★</span>
      <span className="stars-on" aria-hidden="true">
        ★★★★★
      </span>
    </span>
  );
}

// Interactive half-star picker: hover or drag to preview, click or tap to set, arrow keys to adjust.
export function StarInput({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value;

  function valueAt(e: PointerEvent<HTMLSpanElement>): number {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - r.left, 0), r.width);
    return Math.min(RATING_MAX, Math.max(RATING_MIN, Math.ceil((x / r.width) * RATING_MAX)));
  }

  function onKey(e: KeyboardEvent<HTMLSpanElement>) {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (step) {
      e.preventDefault();
      onChange(Math.min(RATING_MAX, Math.max(RATING_MIN, (value || 0) + step)));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(RATING_MIN);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(RATING_MAX);
    }
  }

  return (
    <span className="star-input-wrap">
      <span
        className={disabled ? "stars stars-input disabled" : "stars stars-input"}
        style={{ "--v": shown } as Css}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Your rating"
        aria-valuemin={RATING_MIN}
        aria-valuemax={RATING_MAX}
        aria-valuenow={value || undefined}
        aria-valuetext={value ? `${starLabel(value)} stars` : "Not rated"}
        aria-disabled={disabled}
        onPointerMove={(e) => !disabled && setPreview(valueAt(e))}
        onPointerLeave={() => setPreview(null)}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          onChange(valueAt(e));
        }}
        onPointerUp={() => setPreview(null)}
        onKeyDown={disabled ? undefined : onKey}
      >
        <span aria-hidden="true">★★★★★</span>
        <span className="stars-on" aria-hidden="true">
          ★★★★★
        </span>
      </span>
      <span className="star-input-label" aria-hidden="true">
        {shown ? `${starLabel(shown)} / 5` : "Tap to rate"}
      </span>
    </span>
  );
}
