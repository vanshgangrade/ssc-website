import { z } from "zod";
import { DEPARTMENT_IDS, YEARS, allQuestionsFor, type Question } from "./questions";

// Indian mobile numbers: optional +91/91/0 prefix, then 10 digits starting 6-9.
// Accepts "+91 98765 43210", "09876543210", "9876543210" — stores the bare 10.
const INDIAN_PHONE_RE = /^(?:\+91|91|0)?[\s-]?([6-9]\d{9})$/;

// BITS Goa student email: f + 8 digits @goa.bits-pilani.ac.in
const BITS_EMAIL_RE = /^[fF][0-9]{8}@goa\.bits-pilani\.ac\.in$/;

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
  bitsEmail: z
    .string()
    .trim()
    .toLowerCase()
    .regex(BITS_EMAIL_RE, "Use your BITS Goa email — e.g. f20241234@goa.bits-pilani.ac.in"),
  bitsId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(BITS_ID_RE, "BITS ID is 12 characters followed by G, e.g. 2024A7PS0123G"),
  yearOfStudy: z.enum(YEARS as [string, ...string[]], { message: "Select your year of study." }),
  hostel: z.string().trim().max(60).optional().or(z.literal("")),
  departments: z
    .array(z.enum(DEPARTMENT_IDS as [string, ...string[]]))
    .min(1, "Pick at least one department.")
    .max(3, "Pick at most three — tell us where you'd actually spend your time."),
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
 * Checks the answer map against the question bank for the chosen departments
 * and returns the answers to store, in the order they were asked. Runs on the
 * client for inline errors and again on the server, which is the one that counts.
 */
export function validateAnswers(
  departments: string[],
  answers: Record<string, string | string[]>
): { ok: true; stored: StoredAnswer[] } | { ok: false; errors: Record<string, string> } {
  const questions = allQuestionsFor(departments);
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
      const picked = (Array.isArray(raw) ? raw : [raw]).filter((v) => q.options?.includes(v));
      if (picked.length === 0 && q.required) {
        errors[q.id] = "Pick at least one option.";
      }
      stored.push({ id: q.id, prompt: q.prompt, type: q.type, answer: picked });
      continue;
    }

    const text = Array.isArray(raw) ? raw.join(", ") : raw.trim();

    if (q.type === "choice" && !q.options?.includes(text)) {
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

export const reviewSchema = z.object({
  status: z.enum(["SUBMITTED", "SHORTLISTED", "WAITLISTED", "REJECTED", "ACCEPTED"]),
  reviewNote: z.string().trim().max(2000).optional(),
});
