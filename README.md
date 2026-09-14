# Silver Screen Club — Movie Poll

Google-authenticated movie poll: one vote per email, results hidden from everyone
until an admin reveals them. Built with Next.js (App Router), Prisma + Postgres
(Supabase/Neon), Auth.js (Google OAuth), and Resend for confirmation emails.
Deploys to Vercel.

## How it works

- **Sign-in**: Google OAuth only, via [Auth.js](https://authjs.dev). Optionally
  restrict sign-in to one email domain via `ALLOWED_EMAIL_DOMAIN`.
- **One vote per email**: enforced at the database level — `Vote.userId` is a
  unique foreign key to `User`, so a second vote from the same account updates
  the existing row instead of creating a new one (an upsert). Casting a vote
  requires a signed-in session; the API never accepts a raw email string.
- **Vote changes**: allowed any time while the poll is open (mirrors the "change
  vote" link in the UI). An admin can close voting from `/admin`, after which
  `/api/vote` rejects new votes with 403.
- **Results stay hidden**: the public site never fetches or renders vote counts —
  only the signed-in user's own pick. Aggregate counts and the full voter list
  are served exclusively from `/api/admin/*`, which checks `session.user.isAdmin`
  (derived from the `ADMIN_EMAILS` env var) on every request.
- **Confirmation email**: sent via [Resend](https://resend.com) after each
  successful vote (cast or change). Failure to send never blocks or fails the
  vote itself.

## Project layout

```
prisma/schema.prisma        User/Account/Session (Auth.js) + Vote + PollSettings
src/lib/auth.ts              Auth.js config (Google provider, Prisma adapter)
src/lib/admin.ts             ADMIN_EMAILS check
src/lib/poll.ts              poll open/closed state
src/lib/email.ts             Resend confirmation email
src/lib/movies.ts            the 3 films (id, name, tagline, poster)
src/app/page.tsx             public ballot page (server component)
src/components/Ballot.tsx    interactive ballot (client component)
src/app/signin/page.tsx      Google sign-in page
src/app/admin/page.tsx       admin dashboard (protected, server-rendered)
src/app/api/vote/route.ts    cast/read your own vote
src/app/api/admin/*          admin-only stats + poll open/close toggle
src/lib/inductions/*         crew inductions: question bank, validation, cycle gate
src/app/inductions/*         public induction landing page + multi-step form
src/app/admin/inductions/*   admin review panel (filters, detail drawer, CSV)
src/app/api/inductions/*     application submit endpoint
public/posters/*.jpg         poster images (extracted from the original design)
```

## Setup

### 1. Database (Supabase or Neon)

Either works unchanged — both are Postgres. You need **two** connection
strings: a pooled one for the running app, and a direct one for migrations
(the schema's `directUrl` — transaction poolers don't support the
session-level features Prisma Migrate needs).

- **Supabase**: Project Settings → Database → Connection string.
  - `DATABASE_URL` = the **Transaction** pooler URI (port 6543). Keep
    `?pgbouncer=true` in it.
  - `DIRECT_URL` = the **Direct connection** URI (port 5432, host starts
    with `db.`, not `pooler.supabase.com`).
- **Neon**: Dashboard → Connection Details.
  - `DATABASE_URL` = the **pooled** connection string.
  - `DIRECT_URL` = the **direct** connection string.

Put both in `.env`.

### 2. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
   Create Credentials → OAuth client ID → Application type: Web application.
2. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://<your-vercel-domain>/api/auth/callback/google` (production)
3. Copy the client ID/secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

### 3. Auth secret

```bash
npx auth secret
```

Copy the generated value into `AUTH_SECRET`.

### 4. Admin access

Set `ADMIN_EMAILS` to a comma-separated list of the Google account emails that
should see `/admin` (e.g. `you@gmail.com,co-organizer@gmail.com`).

### 5. Resend (confirmation emails)

1. Create an account at [resend.com](https://resend.com), verify a sending
   domain (or use their test domain while developing).
2. Copy the API key into `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to an address on your verified domain, e.g.
   `Silver Screen Club <polls@yourdomain.com>`.

### 6. Install, migrate, run

```bash
npm install
npx prisma migrate dev --name init   # creates the tables and seeds the 3 starter movies
npm run dev
```

The seed (`prisma/seed.mjs`) only runs if the `Movie` table is empty, and runs
automatically after `migrate dev`. Movies are fully editable afterwards from
`/admin` — add, edit, or delete them there, poster included.

> If you already ran a migration before movies became admin-editable, run
> `npx prisma migrate dev --name movies-table` to pick up the new schema. This
> changes how votes are stored, so any test votes cast before this migration
> won't carry over — fine for a poll that hasn't gone live yet.

Visit `http://localhost:3000`.

## Crew inductions (`/inductions`)

A Google-Form-shaped application flow that lives on the site instead of on
Google Forms, with an admin review panel behind it.

- **Applicant flow** — `/inductions` is a landing page (departments, process,
  FAQ) with the form inlined. Sign-in is Google OAuth, same as voting, so one
  person gets one application. The form runs in four steps (details →
  department questions → general questions → review) and saves a draft to
  `sessionStorage`, so a refresh or a stray back-button doesn't cost anything.
- **One application per person** — enforced by the database, not by trust:
  `Application` is unique on both `(cycleId, userId)` and `(cycleId, bitsId)`,
  so neither a second submit nor a second Google account gets through.
- **Open/closed** — the form only accepts submissions while the current cycle
  is open *and* its deadline hasn't passed. The page gates on this and
  `/api/inductions/apply` checks it again, so a tab left open past the
  deadline can't sneak a submission in.
- **Confirmation email** — sent through the same quota-aware failover chain as
  vote confirmations (Resend → Brevo → ZeptoMail), and logged to `EmailLog`. A
  failed email never fails the application.
- **Admin** — `/admin/inductions`: create cycles, open/close the form, set a
  deadline, filter by status and department, search, open any application,
  set a status with a note, and download a CSV (one column per question).

### Changing the questions

Everything asked is in `src/lib/inductions/questions.ts` — departments, the
general question bank, and per-department questions. Edit that one file and
both the form and the admin panel follow. Question types are `short`, `long`,
`choice`, and `multi`.

Two rules when editing between cycles:

- Keep a question's `id` stable if you want its answers to stay comparable
  across cycles — answers are stored keyed by `id`.
- Give a **new** question a **new** `id`. Reusing an old id on a reworded
  question makes past answers look like replies to the new wording.

### Starting a cycle

Applications are always scoped to an `InductionCycle`, so next semester's
drive starts clean without touching this one's data. In `/admin/inductions`,
create a cycle (it starts closed), set a deadline if you want one, then open
it. The newest cycle is the one `/inductions` shows.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add every variable from `.env.example` in Vercel's Project Settings →
   Environment Variables (use your production Google redirect URI and a
   production `DATABASE_URL`).
3. Before (or right after) the first deploy, apply the schema to your
   production database (needs both vars — migrations run over `DIRECT_URL`):
   ```bash
   DATABASE_URL="<production-pooled-url>" DIRECT_URL="<production-direct-url>" npx prisma migrate deploy
   ```
   Re-run this any time you change `prisma/schema.prisma`.
4. Deploy. `prisma generate` runs automatically via the `postinstall` script.

## Revealing results

Results are intentionally never exposed to voters — not even as a locked/blurred
UI, they simply aren't fetched. When you're ready to reveal:

- Check `/admin` for the live standings and full voter table, or
- Query `Vote` directly (`npm run db:studio` opens Prisma Studio), or
- Announce them yourselves outside the app.

Use the **"Close voting"** button on `/admin` to lock the poll first if you
don't want votes changing after reveal.
