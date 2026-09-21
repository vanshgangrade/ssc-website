import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// One-time (or per-cycle) batch fill for Application.aiSummary, so a
// reviewer's first "Summarize with AI" click in /admin/inductions isn't the
// first time any applicant in the queue gets summarized — the whole queue
// reads from cache already warm. Safe to re-run: skips any application that
// already has a cached summary.
//
// Needs DATABASE_URL/DIRECT_URL and GEMINI_API_KEY set (same as the app).
// Run with: node prisma/backfill-ai-summaries.mjs [cycleId]
// Omit cycleId to backfill every cycle's un-summarized applications.

const DEFAULT_MODEL = "gemini-3.6-flash";

// Mirrors VERTICALS in src/lib/inductions/questions.ts — duplicated here
// rather than imported since this is a standalone script outside Next's
// module graph (same reason seed.mjs keeps its own movie list).
const VERTICAL_NAMES = {
  sponsorships: "Sponsorships & Partnerships",
  design: "Design & Publicity",
  tech: "Tech & Web Development",
};

function verticalName(id) {
  return VERTICAL_NAMES[id] ?? id;
}

function isBlank(answer) {
  return Array.isArray(answer) ? answer.length === 0 : answer.trim().length === 0;
}

// Mirrors src/lib/inductions/summarize.ts — keep these two in sync by hand
// if the prompt or model default changes there.
const SYSTEM_PROMPT = `You help a student film club's induction committee review crew applications quickly. Given one applicant's answers, write a short, neutral summary for a reviewer who hasn't read the raw responses yet.

Rules:
- Base the summary only on the answers given. Never invent facts, experience, or opinions the applicant didn't state.
- 4-6 short bullet points: overall fit and standout points first, then any gaps, vague answers, or concerns worth flagging.
- Judge fit against the vertical(s) they applied for, not against the club in general.
- Neutral, factual tone. No praise for its own sake, and no verdicts like "should be accepted" — that decision is the reviewer's, not yours.
- Plain text bullets, each on its own line starting with "- ". No markdown headers, no bold.`;

async function summarize(app) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const answered = app.answers.filter((a) => !isBlank(a.answer));
  if (answered.length === 0) {
    return "- Every question was left blank, there's nothing to summarize yet.";
  }

  const qa = answered
    .map((a) => `Q: ${a.prompt}\nA: ${Array.isArray(a.answer) ? a.answer.join(", ") : a.answer}`)
    .join("\n\n");

  const prompt = `Applicant: ${app.fullName} (${app.yearOfStudy})
Applying for: ${app.verticals.map(verticalName).join(", ") || "no vertical selected"}

${qa}`;

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 500, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini rejected the request (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!summary) throw new Error("Gemini returned an empty response");
  return summary;
}

async function main() {
  const cycleId = process.argv[2];
  const where = { aiSummary: null, ...(cycleId ? { cycleId } : {}) };

  const applications = await prisma.application.findMany({
    where,
    select: { id: true, fullName: true, yearOfStudy: true, verticals: true, answers: true },
  });

  if (applications.length === 0) {
    console.log("Nothing to backfill — every application already has a cached summary.");
    return;
  }

  console.log(`Backfilling ${applications.length} application(s)...`);

  let done = 0;
  let failed = 0;
  for (const app of applications) {
    try {
      const summary = await summarize({ ...app, answers: app.answers ?? [] });
      await prisma.application.update({ where: { id: app.id }, data: { aiSummary: summary } });
      done++;
      console.log(`  done: ${app.fullName}`);
    } catch (err) {
      failed++;
      console.error(`  failed: ${app.fullName}: ${err.message}`);
    }
    // Stay well clear of per-minute rate limits on a free-tier key.
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`Done — ${done} summarized, ${failed} failed.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
