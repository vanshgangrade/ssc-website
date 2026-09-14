// Crew departments, question types, and the starter question bank.
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
   * of these department ids see the question.
   */
  onlyFor: string[];
};

/** A question with no database identity yet — the shape of the seed bank. */
export type QuestionSeed = Omit<Question, "id">;

export type Department = {
  id: string;
  name: string;
  blurb: string;
};

// Crew departments an applicant can apply to. `id` values are stored on every
// application and referenced by each question's `onlyFor`, so renaming `name`
// is safe but changing `id` orphans existing data.
export const DEPARTMENTS: Department[] = [
  {
    id: "direction",
    name: "Direction & Writing",
    blurb: "Shape the story — scripts, shot lists, and calling the shots on set.",
  },
  {
    id: "cinematography",
    name: "Cinematography",
    blurb: "Camera, lighting, and framing. The people who decide how it looks.",
  },
  {
    id: "editing",
    name: "Editing & VFX",
    blurb: "Cut the footage into something worth sitting through. Colour, titles, effects.",
  },
  {
    id: "sound",
    name: "Sound & Music",
    blurb: "Production sound, mixing, scoring, and the foley nobody notices until it's wrong.",
  },
  {
    id: "production",
    name: "Production & Logistics",
    blurb: "Schedules, permissions, equipment, budgets — the reason a shoot actually happens.",
  },
  {
    id: "design",
    name: "Design & Publicity",
    blurb: "Posters, socials, screening nights, and making the campus show up.",
  },
];

export const DEPARTMENT_IDS = DEPARTMENTS.map((d) => d.id);

export function departmentName(id: string): string {
  return DEPARTMENTS.find((d) => d.id === id)?.name ?? id;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short: "Short answer",
  long: "Paragraph",
  choice: "Multiple choice (pick one)",
  multi: "Checkboxes (pick many)",
};

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

/** What a brand-new cycle starts with, in order. Edit these in the admin UI. */
export const DEFAULT_QUESTIONS: QuestionSeed[] = [
  {
    prompt: "Pick any everyday campus moment and describe how you'd shoot it as a one-minute scene.",
    type: "long",
    hint: "Mess queue, last bus, 2 a.m. wing corridor — whatever. Tell us the shots.",
    options: [],
    required: true,
    maxLength: 2000,
    onlyFor: ["direction"],
  },
  {
    prompt: "What camera or lighting gear have you used, and what would you want to learn here?",
    type: "long",
    hint: "Phone cameras absolutely count.",
    options: [],
    required: true,
    maxLength: 1500,
    onlyFor: ["cinematography"],
  },
  {
    prompt: "Which editing or VFX tools do you know?",
    type: "multi",
    hint: null,
    options: [
      "Premiere Pro",
      "DaVinci Resolve",
      "Final Cut Pro",
      "After Effects",
      "CapCut / mobile editors",
      "Blender",
      "None yet — happy to learn",
    ],
    required: true,
    maxLength: null,
    onlyFor: ["editing"],
  },
  {
    prompt: "Tell us about your experience with sound — recording, mixing, or playing music.",
    type: "long",
    hint: null,
    options: [],
    required: true,
    maxLength: 1500,
    onlyFor: ["sound"],
  },
  {
    prompt: "Your shoot is in two hours, the location permission just fell through. What do you do?",
    type: "long",
    hint: "We're looking at how you think, not for a textbook answer.",
    options: [],
    required: true,
    maxLength: 1500,
    onlyFor: ["production"],
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
      "Social media management",
      "None yet — happy to learn",
    ],
    required: true,
    maxLength: null,
    onlyFor: ["design"],
  },
  {
    prompt: "Why do you want to be on SSC crew?",
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
    prompt: "Any prior experience with film, video, theatre, design, or audio?",
    type: "long",
    hint: "Totally fine to write 'none' — we induct beginners every cycle.",
    options: [],
    required: false,
    maxLength: 1500,
    onlyFor: [],
  },
  {
    prompt: "Link to anything you've made (Drive, YouTube, Instagram, Behance…)",
    type: "short",
    hint: "Optional. Make sure the link is viewable by anyone.",
    options: [],
    required: false,
    maxLength: 500,
    onlyFor: [],
  },
  {
    prompt: "Roughly how many hours a week can you give to crew work?",
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

/** Questions tied to a department the applicant picked, in bank order. */
export function departmentQuestions(questions: Question[], departments: string[]): Question[] {
  return questions.filter((q) => q.onlyFor.length > 0 && q.onlyFor.some((d) => departments.includes(d)));
}

/** Questions everyone answers, in bank order. */
export function generalQuestions(questions: Question[]): Question[] {
  return questions.filter((q) => q.onlyFor.length === 0);
}

/** Everything this applicant should answer — department questions first. */
export function questionsFor(questions: Question[], departments: string[]): Question[] {
  return [...departmentQuestions(questions, departments), ...generalQuestions(questions)];
}
