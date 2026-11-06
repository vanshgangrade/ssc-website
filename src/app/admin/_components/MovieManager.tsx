"use client";

import { useEffect, useRef, useState } from "react";
import type { MovieDTO } from "@/lib/movies";

type EditableMovie = MovieDTO;

const emptyForm = { name: "", meta: "", tagline: "", posterUrl: "" };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function MovieManager({
  pollId,
  initialMovies,
}: {
  pollId: string;
  initialMovies: EditableMovie[];
}) {
  const [movies, setMovies] = useState(initialMovies);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setCropping(false);
    setForm(emptyForm);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startEdit(movie: EditableMovie) {
    setCropping(false);
    setEditingId(movie.id);
    setForm({ name: movie.name, meta: movie.meta, tagline: movie.tagline, posterUrl: movie.posterUrl });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Poster image is too large (max 3MB).");
      return;
    }
    setError(null);
    const dataUrl = await readFileAsDataUrl(file);
    setForm((f) => ({ ...f, posterUrl: dataUrl }));
    setCropping(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.meta.trim() || !form.tagline.trim() || !form.posterUrl) {
      setError("All fields, including a poster, are required.");
      return;
    }

    setBusy(true);
    try {
      const url = editingId ? `/api/admin/movies/${editingId}` : "/api/admin/movies";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? form : { ...form, pollId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      if (editingId) {
        setMovies((prev) => prev.map((m) => (m.id === editingId ? data.movie : m)));
      } else {
        setMovies((prev) => [...prev, data.movie]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this movie? Any votes for it will be deleted too.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/movies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setMovies((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) resetForm();
    } catch {
      setError("Could not delete movie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="movie-manager">
      <div className="movie-list">
        {movies.map((m) => (
          <div className="movie-row" key={m.id}>
            <Image_ src={m.posterUrl} alt={m.name} />
            <div className="movie-row-info">
              <p className="movie-row-name">{m.name}</p>
              <p className="movie-row-meta">{m.meta}</p>
            </div>
            <div className="movie-row-actions">
              <button className="admin-btn admin-btn-ghost" onClick={() => startEdit(m)}>
                Edit
              </button>
              <button className="admin-btn admin-btn-danger" onClick={() => remove(m.id)} disabled={busy}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {movies.length === 0 && <p className="admin-empty">No movies yet, add one below.</p>}
      </div>

      <form className="movie-form" onSubmit={submit}>
        <h3>{editingId ? "Edit movie" : "Add movie"}</h3>
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Mission: Impossible — Fallout"
          />
        </label>
        <label>
          Meta (genre · year)
          <input
            value={form.meta}
            onChange={(e) => setForm((f) => ({ ...f, meta: e.target.value }))}
            placeholder="Action · Espionage · 2018"
          />
        </label>
        <label>
          Tagline
          <textarea
            value={form.tagline}
            onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
            rows={3}
          />
        </label>
        <label>
          Poster image
          <input type="file" accept="image/*" ref={fileInputRef} onChange={onFileChange} />
        </label>
        {form.posterUrl && !cropping && (
          <>
            <Image_ src={form.posterUrl} alt="Poster preview" large />
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setCropping(true)}>
              Crop poster
            </button>
          </>
        )}
        {form.posterUrl && cropping && (
          <PosterCropper
            src={form.posterUrl}
            onCancel={() => setCropping(false)}
            onApply={(dataUrl) => {
              setForm((f) => ({ ...f, posterUrl: dataUrl }));
              setCropping(false);
            }}
            onError={setError}
          />
        )}

        {error && <p className="admin-error">{error}</p>}

        <div className="movie-form-actions">
          <button className="admin-btn" type="submit" disabled={busy}>
            {busy ? "Saving…" : editingId ? "Save changes" : "Add movie"}
          </button>
          {editingId && (
            <button type="button" className="admin-btn admin-btn-ghost" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Image_({ src, alt, large }: { src: string; alt: string; large?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-uploaded data: URIs, not a static asset
  return <img src={src} alt={alt} className={large ? "movie-poster-preview-lg" : "movie-poster-preview"} />;
}

const FRAME_W = 240;
const FRAME_H = 360; // 2:3, matches the poster frame on the ballot
const OUT_W = 600;
const OUT_H = 900;

function PosterCropper({
  src,
  onApply,
  onCancel,
  onError,
}: {
  src: string;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = new window.Image();
    el.crossOrigin = "anonymous";
    el.onload = () => {
      const base = Math.max(FRAME_W / el.naturalWidth, FRAME_H / el.naturalHeight);
      setZoom(1);
      setPos({
        x: (FRAME_W - el.naturalWidth * base) / 2,
        y: (FRAME_H - el.naturalHeight * base) / 2,
      });
      setImg(el);
    };
    el.onerror = () => onError("Could not load this poster for cropping. Re-upload the image and try again.");
    el.src = src;
  }, [src, onError]);

  if (!img) return <p className="admin-empty">Loading poster…</p>;

  const base = Math.max(FRAME_W / img.naturalWidth, FRAME_H / img.naturalHeight);
  const scale = base * zoom;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const clamp = (x: number, y: number) => ({
    x: Math.min(0, Math.max(FRAME_W - w, x)),
    y: Math.min(0, Math.max(FRAME_H - h, y)),
  });
  const shown = clamp(pos.x, pos.y);

  function changeZoom(next: number) {
    // keep the frame centre fixed while zooming
    const nextScale = base * next;
    const cx = (FRAME_W / 2 - shown.x) / scale;
    const cy = (FRAME_H / 2 - shown.y) / scale;
    const nw = img!.naturalWidth * nextScale;
    const nh = img!.naturalHeight * nextScale;
    setZoom(next);
    setPos({
      x: Math.min(0, Math.max(FRAME_W - nw, FRAME_W / 2 - cx * nextScale)),
      y: Math.min(0, Math.max(FRAME_H - nh, FRAME_H / 2 - cy * nextScale)),
    });
  }

  function apply() {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUT_W;
      canvas.height = OUT_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      const k = OUT_W / FRAME_W;
      ctx.drawImage(img!, shown.x * k, shown.y * k, w * k, h * k);
      onApply(canvas.toDataURL("image/jpeg", 0.9));
    } catch {
      onError("Could not crop this poster. Re-upload the image and try again.");
    }
  }

  return (
    <div className="poster-cropper">
      <div
        className="poster-crop-frame"
        style={{ width: FRAME_W, height: FRAME_H }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { px: e.clientX, py: e.clientY, x: shown.x, y: shown.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPos(clamp(drag.current.x + e.clientX - drag.current.px, drag.current.y + e.clientY - drag.current.py));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded data: URI being cropped */}
        <img
          src={src}
          alt="Poster being cropped"
          draggable={false}
          style={{ width: w, height: h, transform: `translate(${shown.x}px, ${shown.y}px)` }}
        />
      </div>
      <label className="poster-crop-zoom">
        Zoom
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => changeZoom(Number(e.target.value))}
        />
      </label>
      <p className="poster-crop-hint">Drag the image to choose what shows on the ballot.</p>
      <div className="movie-form-actions">
        <button type="button" className="admin-btn" onClick={apply}>
          Apply crop
        </button>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
