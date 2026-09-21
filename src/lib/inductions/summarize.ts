import { verticalName } from "./questions";
import { isBlank, type StoredAnswer } from "./validation";

// Summarizes one applicant's answers for the admin review drawer. Raw fetch
// against Gemini's generateContent API, same pattern as the Brevo/ZeptoMail
// calls in lib/email.ts, rather than pulling in an SDK for one endpoint.
// Model is overridable because Google retires/renames hosted models faster
// than most providers (gemini-2.5-flash, the obvious pick when this was
// written, was already pulled for new API keys by the time this shipped).
const DEFAULT_MODEL = "gemini-3.6-flash";

const SYSTEM_PROMPT = `You help a student film club's induction committee review crew applications quickly. Given one applicant's answers, write a short, neutral summary for a reviewer who hasn't read the raw responses yet.

Rules:
- Base the summary only on the answers given. Never invent facts, experience, or opinions the applicant didn't state.
- 4-6 short bullet points: overall fit and standout points first, then any gaps, vague answers, or concerns worth flagging.
- Judge fit against the vertical(s) they applied for, not against the club in general.
- Neutral, factual tone. No praise for its own sake, and no verdicts like "should be accepted" — that decision is the reviewer's, not yours.
- Plain text bullets, each on its own line starting with "- ". No markdown headers, no bold.`;

type SummarizeInput = {
  fullName: string;
  yearOfStudy: string;
  verticals: string[];
  answers: StoredAnswer[];
};

type SummarizeResult = { ok: true; summary: string } | { ok: false; error: string };

export async function summarizeApplication(input: SummarizeInput): Promise<SummarizeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI summarization isn't configured (GEMINI_API_KEY is not set)." };
  }

  const answered = input.answers.filter((a) => !isBlank(a.answer));
  if (answered.length === 0) {
    return { ok: true, summary: "- Every question was left blank, there's nothing to summarize yet." };
  }

  const qa = answered
    .map((a) => `Q: ${a.prompt}\nA: ${Array.isArray(a.answer) ? a.answer.join(", ") : a.answer}`)
    .join("\n\n");

  const prompt = `Applicant: ${input.fullName} (${input.yearOfStudy})
Applying for: ${input.verticals.map(verticalName).join(", ") || "no vertical selected"}

${qa}`;

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        // Plain-text bullet summarization doesn't need extended thinking —
        // skipping it keeps this fast and avoids burning the output budget
        // on reasoning tokens instead of the summary itself.
        generationConfig: { maxOutputTokens: 500, thinkingConfig: { thinkingBudget: 0 } },
      }),
    });
  } catch (err) {
    console.error("Gemini summarize call failed to send:", err);
    return { ok: false, error: "Could not reach the AI provider, try again." };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Gemini summarize call rejected:", res.status, body);
    return { ok: false, error: "The AI provider rejected the request." };
  }

  const data = await res.json().catch(() => null);
  const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!summary) {
    return { ok: false, error: "The AI provider returned an empty response." };
  }

  return { ok: true, summary };
}
