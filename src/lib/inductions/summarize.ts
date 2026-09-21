import { verticalName } from "./questions";
import { isBlank, type StoredAnswer } from "./validation";

// Summarizes one applicant's answers for the admin review drawer. Raw fetch
// against Groq's OpenAI-compatible chat completions API, same pattern as the
// Brevo/ZeptoMail calls in lib/email.ts, rather than pulling in an SDK for
// one endpoint. Model is overridable because Groq retires/renames hosted
// models faster than most providers.
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI summarization isn't configured (GROQ_API_KEY is not set)." };
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

  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        max_tokens: 500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch (err) {
    console.error("Groq summarize call failed to send:", err);
    return { ok: false, error: "Could not reach the AI provider, try again." };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Groq summarize call rejected:", res.status, body);
    return { ok: false, error: "The AI provider rejected the request." };
  }

  const data = await res.json().catch(() => null);
  const summary = data?.choices?.[0]?.message?.content?.trim();
  if (!summary) {
    return { ok: false, error: "The AI provider returned an empty response." };
  }

  return { ok: true, summary };
}
