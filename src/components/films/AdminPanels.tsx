"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminFilm, AdminModerator, AdminReport } from "@/lib/diaryAdmin";
import { dismissReport, removeReported, saveFilm, setModerator } from "@/app/diary/admin/actions";
import { MAX_POSTER_BYTES } from "@/lib/movies";
import { Stars } from "./Stars";
import { formatDate } from "./ReviewItem";

type Act = () => Promise<{ ok: true } | { error: string }>;

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (act: Act, after?: () => void) =>
    start(async () => {
      setError(null);
      const res = await act();
      if ("error" in res) {
        setError(res.error);
        return;
      }
      after?.();
      router.refresh();
    });
  return { pending, error, run };
}

// --- reports ---

export function AdminReports({ reports, base }: { reports: AdminReport[]; base: string }) {
  const { pending, error, run } = useAct();
  return (
    <section className="apanel">
      <h3>
        Reports <span className="acount">{reports.length}</span>
      </h3>
      {error && <p className="err">{error}</p>}
      {reports.length === 0 ? (
        <p className="empty">Nothing reported. All quiet.</p>
      ) : (
        <ol className="alist">
          {reports.map((r) => (
            <li key={r.id} className="card arow">
              <p className="ameta">
                {r.kind === "review" ? "Review" : "Reply"} by <b>{r.target.author.name}</b> on{" "}
                <Link href={`${base}/film/${r.target.film.slug}#review-${r.target.reviewId}`} target="_blank">
                  {r.target.film.title}
                </Link>
                {r.sameTarget > 1 && <span className="badge warn">{r.sameTarget} reports</span>}
              </p>
              {r.target.rating !== null && <Stars value={r.target.rating} size="1rem" />}
              <blockquote className="aquote">{r.target.text || <i>(rating only, no text)</i>}</blockquote>
              <p className="muted small">
                Reported by {r.reporter.name} · {formatDate(r.createdAt)}
                {r.reason && <> · “{r.reason}”</>}
              </p>
              <div className="yours-actions">
                <button
                  className="btn ghost danger"
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(`Delete this ${r.kind === "review" ? "review" : "reply"} for everyone?`)) run(() => removeReported(r.id));
                  }}
                >
                  Delete {r.kind === "review" ? "review" : "reply"}
                </button>
                <button className="btn ghost" type="button" disabled={pending} onClick={() => run(() => dismissReport(r.id))}>
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// --- films ---

const blank = { originalSlug: undefined as string | undefined, title: "", slug: "", year: "", meta: "", posterUrl: "", reviewsOpen: true, checkInCode: "" };
type FilmForm = typeof blank;

function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function AdminFilms({ films, base }: { films: AdminFilm[]; base: string }) {
  const [form, setForm] = useState<FilmForm | null>(null);
  const { pending, error, run } = useAct();

  return (
    <section className="apanel">
      <div className="ahead">
        <h3>
          Films <span className="acount">{films.length}</span>
        </h3>
        {!form && (
          <button className="btn solid" type="button" onClick={() => setForm({ ...blank })}>
            Add a film
          </button>
        )}
      </div>

      {form && <FilmEditor form={form} setForm={setForm} pending={pending} error={error} run={run} />}

      <ol className="alist">
        {films.map((f) => (
          <li key={f.slug} className="card arow afilm">
            {/* eslint-disable-next-line @next/next/no-img-element -- posters may be data: URIs */}
            <img src={f.posterUrl} alt="" className="athumb" />
            <div>
              <p className="ameta">
                <Link href={`${base}/film/${f.slug}`} target="_blank">
                  <b>{f.title}</b>
                </Link>
                {f.year ? ` · ${f.year}` : ""}
              </p>
              <p className="muted small">
                {f.reviews} {f.reviews === 1 ? "review" : "reviews"} · {f.checkins} checked in ·{" "}
                {f.reviewsOpen ? "Open for reviews" : "Reviews closed"} · {f.checkInCode ? `Check-in code: ${f.checkInCode}` : "No check-in code"}
              </p>
              <div className="yours-actions">
                <button
                  className="btn ghost"
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    setForm({
                      originalSlug: f.slug,
                      title: f.title,
                      slug: f.slug,
                      year: f.year ? String(f.year) : "",
                      meta: f.meta,
                      posterUrl: f.posterUrl,
                      reviewsOpen: f.reviewsOpen,
                      checkInCode: f.checkInCode,
                    })
                  }
                >
                  Edit
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      saveFilm({
                        originalSlug: f.slug,
                        title: f.title,
                        slug: f.slug,
                        year: f.year,
                        meta: f.meta,
                        posterUrl: f.posterUrl,
                        reviewsOpen: !f.reviewsOpen,
                        checkInCode: f.checkInCode,
                      }),
                    )
                  }
                >
                  {f.reviewsOpen ? "Close reviews" : "Open reviews"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FilmEditor({
  form,
  setForm,
  pending,
  error,
  run,
}: {
  form: FilmForm;
  setForm: (f: FilmForm | null) => void;
  pending: boolean;
  error: string | null;
  run: (act: Act, after?: () => void) => void;
}) {
  const [fileError, setFileError] = useState<string | null>(null);
  const editing = !!form.originalSlug;
  const set = (patch: Partial<FilmForm>) => setForm({ ...form, ...patch });

  return (
    <form
      className="card yours settings afilm-form"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            saveFilm({
              originalSlug: form.originalSlug,
              title: form.title,
              slug: form.slug,
              year: form.year ? Number(form.year) : null,
              meta: form.meta,
              posterUrl: form.posterUrl,
              reviewsOpen: form.reviewsOpen,
              checkInCode: form.checkInCode,
            }),
          () => setForm(null),
        );
      }}
    >
      <p className="yours-title">{editing ? `Edit ${form.title}` : "Add a film"}</p>
      <label className="sfield">
        <span>Title</span>
        <input
          value={form.title}
          onChange={(e) => set({ title: e.target.value, ...(editing ? {} : { slug: slugify(e.target.value) }) })}
          required
          maxLength={120}
          disabled={pending}
        />
      </label>
      <label className="sfield">
        <span>Link</span>
        <span className="prefix-input">
          <span aria-hidden="true">/film/</span>
          <input value={form.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} required maxLength={80} disabled={pending} />
        </span>
        {editing && <small>Changing this breaks links people have already shared.</small>}
      </label>
      <div className="arow2">
        <label className="sfield">
          <span>Year</span>
          <input value={form.year} onChange={(e) => set({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" disabled={pending} />
        </label>
        <label className="sfield">
          <span>Genre line</span>
          <input value={form.meta} onChange={(e) => set({ meta: e.target.value })} placeholder="Thriller · Drama" maxLength={120} disabled={pending} />
        </label>
      </div>
      <label className="sfield">
        <span>Poster</span>
        <input
          type="file"
          accept="image/*"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            setFileError(null);
            if (!file) return;
            if (file.size > MAX_POSTER_BYTES) {
              setFileError("That image is over 3MB. Use a smaller one.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => set({ posterUrl: String(reader.result) });
            reader.readAsDataURL(file);
          }}
        />
        <small>Or paste an image link:</small>
        <input
          value={form.posterUrl.startsWith("data:") ? "" : form.posterUrl}
          onChange={(e) => set({ posterUrl: e.target.value })}
          placeholder={form.posterUrl.startsWith("data:") ? "Uploaded image selected" : "https://…"}
          disabled={pending}
        />
        {fileError && <small className="err">{fileError}</small>}
        {form.posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- preview of an upload or URL
          <img src={form.posterUrl} alt="Poster preview" className="athumb big" />
        )}
      </label>
      <label className="sfield">
        <span>Screening check-in code</span>
        <input value={form.checkInCode} onChange={(e) => set({ checkInCode: e.target.value })} placeholder="e.g. BRIDGE" maxLength={40} disabled={pending} />
        <small>Announce this at the screening. Members who enter it get “Watched at the screening”. Leave empty to turn check-in off.</small>
      </label>
      <label className="check">
        <input type="checkbox" checked={form.reviewsOpen} onChange={(e) => set({ reviewsOpen: e.target.checked })} disabled={pending} />
        <span>Open for ratings and reviews</span>
      </label>
      {error && <p className="err">{error}</p>}
      <div className="yours-actions">
        <button className="btn solid" type="submit" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add film"}
        </button>
        <button className="btn ghost" type="button" disabled={pending} onClick={() => setForm(null)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// --- moderators ---

export function AdminModerators({ mods }: { mods: AdminModerator[] }) {
  const [who, setWho] = useState("");
  const { pending, error, run } = useAct();
  return (
    <section className="apanel">
      <h3>
        Moderators <span className="acount">{mods.length}</span>
      </h3>
      <p className="muted small">
        Moderators can delete any review or reply and handle reports. They see this panel (without films and moderators) and look like normal members
        everywhere else.
      </p>
      <form
        className="checkin-row amod-form"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => setModerator(who, true), () => setWho(""));
        }}
      >
        <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="@username or BITS email" aria-label="Username or email" disabled={pending} />
        <button className="btn solid" type="submit" disabled={pending || !who.trim()}>
          Make moderator
        </button>
      </form>
      {error && <p className="err">{error}</p>}
      {mods.length > 0 && (
        <ol className="alist">
          {mods.map((m) => (
            <li key={m.handle} className="card arow amod">
              <div>
                <p className="ameta">
                  <b>{m.name}</b> · @{m.handle}
                </p>
                <p className="muted small">{m.email}</p>
              </div>
              <button
                className="btn ghost danger"
                type="button"
                disabled={pending}
                onClick={() => {
                  if (window.confirm(`Remove ${m.name} as a moderator?`)) run(() => setModerator(m.handle, false));
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
