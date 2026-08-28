"use client";

import { useRef, useState } from "react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startEdit(movie: EditableMovie) {
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
        {movies.length === 0 && <p className="admin-empty">No movies yet — add one below.</p>}
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
        {form.posterUrl && <Image_ src={form.posterUrl} alt="Poster preview" large />}

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
