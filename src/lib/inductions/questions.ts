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
    blurb: "Bring in the brands and budgets that keep screenings running, outreach, pitches, and follow-through.",
  },
  {
    id: "design",
    name: "Design & Publicity",
    blurb: "Posters, socials, screening nights, and making the campus actually show up.",
  },
  {
    id: "tech",
    name: "Tech & Web Development",
    blurb: "Build and run the things this club lives on, the website, the tooling, the screening-night setup.",
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
  // --- Sponsorships & Partnerships ---
  {
    prompt: "Pick a brand you would approach for our next screening, and write the opening message you would send them.",
    type: "long",
    hint: "Any brand: a local café, a startup, a campus favourite. We care about the approach, not the name.",
    options: [],
    required: true,
    maxLength: 2000,
    onlyFor: ["sponsorships"],
  },
  {
    prompt: "What is actually in it for a brand that sponsors a campus film screening?",
    type: "long",
    hint: "Pitch it the way you would to someone holding the budget.",
    options: [],
    required: true,
    maxLength: 1500,
    onlyFor: ["sponsorships"],
  },
  {
    prompt: "A sponsor agrees to fund a screening, then goes quiet two weeks before the date. What do you do?",
    type: "long",
    hint: "There is no single right answer. We want to see how you handle it.",
    options: [],
    required: true,
    maxLength: 1500,
    onlyFor: ["sponsorships"],
  },
  {
    prompt: "Have you done outreach, sponsorship, or partnership work before? Tell us what happened.",
    type: "long",
    hint: "Fests, clubs, school, a side project. 'Not yet' is a perfectly good answer.",
    options: [],
    required: false,
    maxLength: 1500,
    onlyFor: ["sponsorships"],
  },

  // --- Design & Publicity ---
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
      "Video editing (Premiere, CapCut, Resolve)",
      "Instagram content and reels",
      "None yet, happy to learn",
    ],
    required: true,
    maxLength: null,
    onlyFor: ["design"],
  },
  {
    prompt: "Link us to something you have made, or describe the poster you would design for our next screening.",
    type: "long",
    hint: "A link is ideal. Make sure it is viewable by anyone.",
    options: [],
    required: true,
    maxLength: 1500,
    onlyFor: ["design"],
  },
  {
    prompt: "We are screening a film almost nobody on campus has heard of. How do you get a full house?",
    type: "long",
    hint: "Think about what actually makes people turn up on a weeknight.",
    options: [],
    required: true,
    maxLength: 2000,
    onlyFor: ["design"],
  },
  {
    prompt: "Which campus club or brand gets their social media right, and what are they doing that works?",
    type: "long",
    hint: "Being specific about someone else's work tells us a lot about your eye.",
    options: [],
    required: false,
    maxLength: 1500,
    onlyFor: ["design"],
  },

  // --- Tech & Web Development ---
  {
    prompt: "Which of these have you worked with?",
    type: "multi",
    hint: null,
    options: [
      "HTML and CSS",
      "JavaScript or TypeScript",
      "React or Next.js",
      "Python",
      "Databases and SQL",
      "Git and GitHub",
      "Figma or design tools",
      "None yet, happy to learn",
    ],
    required: true,
    maxLength: null,
    onlyFor: ["tech"],
  },
  {
    prompt: "Tell us about something you have built. What was the hardest part?",
    type: "long",
    hint: "A repo link, a deployed project, a class assignment, anything you actually made.",
    options: [],
    required: true,
    maxLength: 2000,
    onlyFor: ["tech"],
  },
  {
    prompt: "Open this website and find one thing you would change. What is it, and how would you fix it?",
    type: "long",
    hint: "A clear opinion beats a long list. Design, speed, copy, anything counts.",
    options: [],
    required: true,
    maxLength: 1500,
    onlyFor: ["tech"],
  },
  {
    prompt: "How comfortable are you picking up a codebase somebody else wrote?",
    type: "choice",
    hint: null,
    options: [
      "Very, I have done it before",
      "Somewhat, give me a little time",
      "Not yet, but I want to learn",
    ],
    required: true,
    maxLength: null,
    onlyFor: ["tech"],
  },

  // --- Everyone ---
  {
    prompt: "Why do you want to join Silver Screen Club?",
    type: "long",
    hint: "Two or three honest sentences beat a paragraph of adjectives. Around 150 words.",
    options: [],
    required: true,
    maxLength: 1500,
    onlyFor: [],
  },
  {
    prompt: "Tell us about the last film that genuinely got to you, and why.",
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
    options: ["Under 3 hours", "3 to 6 hours", "6 to 10 hours", "More than 10 hours"],
    required: true,
    maxLength: null,
    onlyFor: [],
  },
  {
    prompt: "Which other clubs or societies are you part of, or applying to?",
    type: "short",
    hint: "No wrong answer. This just helps us plan around clashes.",
    options: [],
    required: false,
    maxLength: 300,
    onlyFor: [],
  },
  {
    prompt: "Anything else you want us to know?",
    type: "long",
    hint: "Optional. Leave it blank if you have nothing to add.",
    options: [],
    required: false,
    maxLength: 1000,
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
