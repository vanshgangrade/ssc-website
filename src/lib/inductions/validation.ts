import { z } from "zod";
import { VERTICAL_IDS, YEARS, questionsFor, type Question } from "./questions";

// Indian mobile numbers: optional +91/91/0 prefix, then 10 digits starting 6-9.
// Accepts "+91 98765 43210", "09876543210", "9876543210" — stores the bare 10.
const INDIAN_PHONE_RE = /^(?:\+91|91|0)?[\s-]?([6-9]\d{9})$/;

// BITS Goa student email: f + 8 digits @goa.bits-pilani.ac.in. No longer asked
// for — it is taken from the signed-in Google account — but still checked on
// the server before an application is written.
export const BITS_EMAIL_RE = /^[fF][0-9]{8}@goa\.bits-pilani\.ac\.in$/;

// 12 alphanumeric characters then G, e.g. 2024A7PS0123G.
const BITS_ID_RE = /^[0-9A-Za-z]{12}[gG]$/;

export const basicsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "That name looks too long — check for a paste error."),
  phone: z
    .string()
    .trim()
    .regex(INDIAN_PHONE_RE, "Enter a valid 10-digit Indian mobile number.")
    .transform((val) => val.match(INDIAN_PHONE_RE)?.[1] ?? val),
  bitsId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(BITS_ID_RE, "BITS ID is 12 characters followed by G, e.g. 2024A7PS0123G"),
  yearOfStudy: z.enum(YEARS as [string, ...string[]], { message: "Select your year of study." }),
  verticals: z
    .array(z.enum(VERTICAL_IDS as [string, ...string[]]))
    .min(1, "Pick at least one vertical.")
    .max(3, "Pick at most three."),
});

export type Basics = z.infer<typeof basicsSchema>;

/** Raw answers as the form holds them: question id -> text or checked options. */
export const answerMapSchema = z.record(z.string(), z.union([z.string(), z.array(z.string())]));

export const submitSchema = z.object({
  basics: basicsSchema,
  answers: answerMapSchema,
});

export type SubmitPayload = z.infer<typeof submitSchema>;

/** One answered question, as stored on Application.answers. */
export type StoredAnswer = {
  id: string;
  prompt: string;
  type: Question["type"];
  answer: string | string[];
};

export function isBlank(value: string | string[] | undefined): boolean {
  if (value === undefined) return true;
  return Array.isArray(value) ? value.length === 0 : value.trim().length === 0;
}

/**
 * Checks the answer map against the cycle's question bank for the chosen
 * verticals and returns the answers to store, in the order they were asked.
 * Runs on the client for inline errors and again on the server, which is the
 * one that counts.
 */
export function validateAnswers(
  bank: Question[],
  verticals: string[],
  answers: Record<string, string | string[]>
): { ok: true; stored: StoredAnswer[] } | { ok: false; errors: Record<string, string> } {
  const questions = questionsFor(bank, verticals);
  const errors: Record<string, string> = {};
  const stored: StoredAnswer[] = [];

  for (const q of questions) {
    const raw = answers[q.id];

    if (isBlank(raw)) {
      if (q.required) errors[q.id] = "This one's required.";
      stored.push({ id: q.id, prompt: q.prompt, type: q.type, answer: q.type === "multi" ? [] : "" });
      continue;
    }

    if (q.type === "multi") {
      const picked = (Array.isArray(raw) ? raw : [raw]).filter((v) => q.options.includes(v));
      if (picked.length === 0 && q.required) {
        errors[q.id] = "Pick at least one option.";
      }
      stored.push({ id: q.id, prompt: q.prompt, type: q.type, answer: picked });
      continue;
    }

    const text = Array.isArray(raw) ? raw.join(", ") : raw.trim();

    if (q.type === "choice" && !q.options.includes(text)) {
      errors[q.id] = "Choose one of the options.";
    }
    if (q.maxLength && text.length > q.maxLength) {
      errors[q.id] = `Keep it under ${q.maxLength} characters (you're at ${text.length}).`;
    }

    stored.push({ id: q.id, prompt: q.prompt, type: q.type, answer: text });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, stored };
}

// What the admin question editor is allowed to save.
export const questionInputSchema = z.object({
  prompt: z.string().trim().min(3, "Write the question out.").max(1000),
  hint: z.string().trim().max(500).nullable().optional(),
  type: z.enum(["short", "long", "choice", "multi"]),
  options: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  required: z.boolean().default(true),
  maxLength: z.number().int().min(10).max(10000).nullable().optional(),
  onlyFor: z.array(z.enum(VERTICAL_IDS as [string, ...string[]])).max(10).default([]),
}).refine(
  (q) => (q.type === "choice" || q.type === "multi" ? q.options.length >= 2 : true),
  { message: "Give the applicant at least two options to pick from.", path: ["options"] }
);

export const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

export const reviewSchema = z.object({
  status: z.enum(["SUBMITTED", "SHORTLISTED", "WAITLISTED", "REJECTED", "ACCEPTED"]),
  reviewNote: z.string().trim().max(2000).optional(),
});
