// The question bank for crew inductions. This file is the single source of
// truth for what applicants are asked — edit it (add, remove, reword,
// reorder) and both the form and the admin review panel follow along. No
// component changes needed.
//
// Two rules when editing between cycles:
//   * Keep a question's `id` stable if you want its answers to stay
//     comparable across cycles — answers are stored keyed by id.
//   * Give a NEW question a NEW id. Reusing an old id on a reworded
//     question makes past answers look like replies to the new wording.

export type QuestionType = "short" | "long" | "choice" | "multi";

export type Question = {
  id: string;
  prompt: string;
  type: QuestionType;
  /** Shown under the prompt — use it for word limits, examples, nudges. */
  hint?: string;
  /** Required for "choice" and "multi"; ignored otherwise. */
  options?: string[];
  required?: boolean;
  maxLength?: number;
  /**
   * When set, the question only appears if the applicant picked one of these
   * departments. Leave unset for questions everyone answers.
   */
  onlyFor?: string[];
};

export type Department = {
  id: string;
  name: string;
  blurb: string;
};

// Crew departments an applicant can apply to. `id` values are what get stored
// on the application, so renaming `name` is safe but changing `id` is not.
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

// Asked of every applicant.
export const GENERAL_QUESTIONS: Question[] = [
  {
    id: "why-ssc",
    prompt: "Why do you want to be on SSC crew?",
    type: "long",
    hint: "Two or three honest sentences beat a paragraph of adjectives. ~150 words.",
    required: true,
    maxLength: 1500,
  },
  {
    id: "last-film",
    prompt: "Tell us about the last film that genuinely got to you — and why.",
    type: "long",
    hint: "Any language, any era. We care about the 'why' far more than the pick.",
    required: true,
    maxLength: 1500,
  },
  {
    id: "experience",
    prompt: "Any prior experience with film, video, theatre, design, or audio?",
    type: "long",
    hint: "Totally fine to write 'none' — we induct beginners every cycle.",
    required: false,
    maxLength: 1500,
  },
  {
    id: "portfolio",
    prompt: "Link to anything you've made (Drive, YouTube, Instagram, Behance…)",
    type: "short",
    hint: "Optional. Make sure the link is viewable by anyone.",
    required: false,
    maxLength: 500,
  },
  {
    id: "hours",
    prompt: "Roughly how many hours a week can you give to crew work?",
    type: "choice",
    options: ["Under 3 hours", "3–6 hours", "6–10 hours", "10+ hours"],
    required: true,
  },
  {
    id: "other-clubs",
    prompt: "Which other clubs or societies are you part of, or applying to?",
    type: "short",
    hint: "No wrong answer — this just helps us plan around clashes.",
    required: false,
    maxLength: 300,
  },
];

// Shown only when the applicant picks the matching department.
export const DEPARTMENT_QUESTIONS: Question[] = [
  {
    id: "direction-scene",
    prompt: "Pick any everyday campus moment and describe how you'd shoot it as a one-minute scene.",
    type: "long",
    hint: "Mess queue, last bus, 2 a.m. wing corridor — whatever. Tell us the shots.",
    required: true,
    maxLength: 2000,
    onlyFor: ["direction"],
  },
  {
    id: "cinematography-kit",
    prompt: "What camera or lighting gear have you used, and what would you want to learn here?",
    type: "long",
    hint: "Phone cameras absolutely count.",
    required: true,
    maxLength: 1500,
    onlyFor: ["cinematography"],
  },
  {
    id: "editing-tools",
    prompt: "Which editing or VFX tools do you know?",
    type: "multi",
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
    onlyFor: ["editing"],
  },
  {
    id: "sound-experience",
    prompt: "Tell us about your experience with sound — recording, mixing, or playing music.",
    type: "long",
    required: true,
    maxLength: 1500,
    onlyFor: ["sound"],
  },
  {
    id: "production-problem",
    prompt: "Your shoot is in two hours, the location permission just fell through. What do you do?",
    type: "long",
    hint: "We're looking at how you think, not for a textbook answer.",
    required: true,
    maxLength: 1500,
    onlyFor: ["production"],
  },
  {
    id: "design-tools",
    prompt: "Which design or publicity tools do you work with?",
    type: "multi",
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
    onlyFor: ["design"],
  },
];

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

/** The department questions triggered by a given set of picks, in bank order. */
export function questionsForDepartments(departments: string[]): Question[] {
  return DEPARTMENT_QUESTIONS.filter((q) => q.onlyFor?.some((d) => departments.includes(d)));
}

export function allQuestionsFor(departments: string[]): Question[] {
  return [...questionsForDepartments(departments), ...GENERAL_QUESTIONS];
}
