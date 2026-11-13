import { execSync } from "node:child_process";

// The main site (ssc-website) owns the database schema and applies migrations on deploy.
// A second deployment of this same codebase — e.g. the film-diary Vercel project, which
// shares the one database — sets SKIP_MIGRATIONS=1 so it doesn't also try to reach the
// direct database connection at build time (Vercel's build network can't reach Supabase's
// IPv6-only direct host). With it unset, behaviour is exactly as before: migrate, then build.
const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.SKIP_MIGRATIONS === "1") {
  console.log("SKIP_MIGRATIONS=1 — skipping `prisma migrate deploy` (schema is managed by the main deployment).");
} else {
  run("prisma migrate deploy");
}
run("next build");
