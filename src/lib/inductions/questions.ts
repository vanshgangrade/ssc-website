// Club verticals, question types, and the starter question bank.
//
// The live questions are NOT here any more — they live in the
// InductionQuestion table and are edited from /admin/inductions. What's below
// is the set a brand-new cycle is seeded with when there's no previous cycle
// to copy from. See lib/inductions/questionStore.ts.

export type QuestionType = "short" | "long" | "choice" | "multi";

export type Question = {
  id: string;
  prompt: string;
  type: QuestionType;
  /** Shown under the prompt — word limits, examples, nudges. */
  hint: string | null;
  /** Meaningful for "choice" and "multi"; empty for the text types. */
  options: string[];
  required: boolean;
  maxLength: number | null;
  /**
   * Empty means everyone answers it. Otherwise only applicants who picked one
   * of these vertical ids see the question.
   */
  onlyFor: string[];
};

/** A question with no database identity yet — the shape of the seed bank. */
export type QuestionSeed = Omit<Question, "id">;

export type Vertical = {
  id: string;
  name: string;
  blurb: string;
};

// The verticals an applicant can apply to. `id` values are stored on every
// application and referenced by each question's `onlyFor`, so renaming `name`
// is safe but changing `id` orphans existing data.
export const VERTICALS: Vertical[] = [
  {
    id: "sponsorships",
    name: "Sponsorships & Partnerships",
    blurb: "Bring in the brands and budgets that keep screenings running — outreach, pitches, and follow-through.",
  },
  {
    id: "design",
    name: "Design & Publicity",
    blurb: "Posters, socials, screening nights, and making the campus actually show up.",
  },
  {
    id: "tech",
    name: "Tech & Web Development",
    blurb: "Build and run the things this club lives on — the website, the tooling, the screening-night setup.",
  },
];

export const VERTICAL_IDS = VERTICALS.map((v) => v.id);

export function verticalName(id: string): string {
  return VERTICALS.find((v) => v.id === id)?.name ?? id;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short: "Short answer",
  long: "Paragraph",
  choice: "Multiple choice (pick one)",
  multi: "Checkboxes (pick many)",
};

export const YEARS = ["1st Year", "2nd Year"];

/** What a brand-new cycle starts with, in order. Edit these in the admin UI. */
export const DEFAULT_QUESTIONS: QuestionSeed[] = [
  {
    prompt: "Pitch us on a brand you'd approach for a screening, and how you'd open that conversation.",
    type: "long",
    hint: "Any brand — local café, a startup, a campus favourite. We care about the approach, not the name.",
    options: [],
    required: true,
    maxLength: 2000,
    onlyFor: ["sponsorships"],
  },
  {
    prompt: "Have you done outreach, sponsorship or partnership work before? Tell us what happened.",
    type: "long",
    hint: "Fests, clubs, school, a side project — anything counts. 'Not yet' is a fine answer.",
    options: [],
    required: false,
    maxLength: 1500,
    onlyFor: ["sponsorships"],
  },
  {
    prompt: "Which design or publicity tools do you work with?",
    type: "multi",
    hint: null,
    options: [
      "Photoshop",
      "Illustrator",
      "Figma",
      "Canva",
      "InDesign",
      "Video editing",
      "Social media management",
      "None yet — happy to learn",
    ],
    required: true,
    maxLength: null,
    onlyFor: ["design"],
  },
  {
    prompt: "Link us to something you've designed, or describe a poster you'd make for our next screening.",
    type: "long",
    hint: "A link is ideal — make sure it's viewable by anyone. Words are fine too.",
    options: [],
    required: true,
    maxLength: 1500,
    onlyFor: ["design"],
  },
  {
    prompt: "Which of these have you worked with?",
    type: "multi",
    hint: null,
    options: [
      "HTML / CSS",
      "JavaScript or TypeScript",
      "React / Next.js",
      "Python",
      "Databases (SQL)",
      "Git / GitHub",
      "Design tools (Figma)",
      "None yet — happy to learn",
    ],
    required: true,
    maxLength: null,
    onlyFor: ["tech"],
  },
  {
    prompt: "Tell us about something you've built, or something on this site you'd change first.",
    type: "long",
    hint: "A repo link, a deployed thing, a class project — or just a clear opinion about this website.",
    options: [],
    required: true,
    maxLength: 2000,
    onlyFor: ["tech"],
  },
  {
    prompt: "Why do you want to join Silver Screen Club?",
    type: "long",
    hint: "Two or three honest sentences beat a paragraph of adjectives. ~150 words.",
    options: [],
    required: true,
    maxLength: 1500,
    onlyFor: [],
  },
  {
    prompt: "Tell us about the last film that genuinely got to you — and why.",
    type: "long",
    hint: "Any language, any era. We care about the 'why' far more than the pick.",
    options: [],
    required: true,
    maxLength: 1500,
    onlyFor: [],
  },
  {
    prompt: "Roughly how many hours a week can you give the club?",
    type: "choice",
    hint: null,
    options: ["Under 3 hours", "3–6 hours", "6–10 hours", "10+ hours"],
    required: true,
    maxLength: null,
    onlyFor: [],
  },
  {
    prompt: "Which other clubs or societies are you part of, or applying to?",
    type: "short",
    hint: "No wrong answer — this just helps us plan around clashes.",
    options: [],
    required: false,
    maxLength: 300,
    onlyFor: [],
  },
];

/** Questions tied to a vertical the applicant picked, in bank order. */
export function verticalQuestions(questions: Question[], verticals: string[]): Question[] {
  return questions.filter((q) => q.onlyFor.length > 0 && q.onlyFor.some((v) => verticals.includes(v)));
}

/** Questions everyone answers, in bank order. */
export function generalQuestions(questions: Question[]): Question[] {
  return questions.filter((q) => q.onlyFor.length === 0);
}

/** Everything this applicant should answer — vertical questions first. */
export function questionsFor(questions: Question[], verticals: string[]): Question[] {
  return [...verticalQuestions(questions, verticals), ...generalQuestions(questions)];
}
