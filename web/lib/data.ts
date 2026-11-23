// Generated data: run `python3 build/export_web.py` from the repo root to refresh it.
// Question numbering and option order come from build/parse.py, so they match the PDF exactly.
import raw from "@/data/test-data.json";

export type Letter = "A" | "B" | "C" | "D" | "E";
export const LETTERS: Letter[] = ["A", "B", "C", "D", "E"];

export interface Question {
  /** question number, 1 to 563 */
  n: number;
  /** index into PARTS */
  p: number;
  /** question text */
  t: string;
  /** option texts, in letter order */
  o: string[];
  /** 1 when this is an agreement (Likert) item */
  l?: 1;
  /** personality dimension this item feeds */
  d?: "EI" | "SN" | "TF" | "JP" | "AT";
  /** personality key: letter to [pole, points], or null for no points */
  m?: Record<string, [string, number] | null>;
  /** place-fit key: scale to letter to position (null = not scored) */
  s?: Record<string, Record<string, number | null>>;
  /** categorical keys: CAR, DB, PRI1, PRI2 */
  c?: Record<string, Record<string, string | null>>;
  /** subculture tag key: letter to [tag, points][] */
  g?: Record<string, [string, number][]>;
}

export interface Part {
  label: string;
  name: string;
  intro: string;
  start: number;
  end: number;
  subs: { title: string; start: number; end: number }[];
}

export interface Location {
  name: string;
  city: string;
  state: string;
  zip: string;
  region: string;
  type: string;
  snow: "R" | "O" | "N";
  coast: "Y" | "N";
  air: "Y" | "N";
  s: Record<string, number>;
  careers: string[];
  tags: string[];
  desc: string;
}

export interface TestData {
  parts: Part[];
  questions: Question[];
  locations: Location[];
  scales: { code: string; name: string; low: string; high: string }[];
  careers: Record<string, string>;
  tags: Record<string, string>;
  dbRules: Record<string, string>;
  relaxOrder: string[];
  priGroups: Record<string, string[]>;
}

export const DATA = raw as unknown as TestData;
export const QUESTIONS = DATA.questions;
export const PARTS = DATA.parts;
export const LOCATIONS = DATA.locations;
export const TOTAL = QUESTIONS.length;

/** Question by number (1-based). */
export function question(n: number): Question {
  return QUESTIONS[n - 1];
}

export function subTitle(q: Question): string {
  const sub = PARTS[q.p].subs.find((s) => q.n >= s.start && q.n <= s.end);
  return sub ? sub.title : "";
}

export function isValidAnswer(n: number, letter: unknown): letter is Letter {
  const q = QUESTIONS[n - 1];
  if (!q || typeof letter !== "string") return false;
  const i = LETTERS.indexOf(letter as Letter);
  return i >= 0 && i < q.o.length;
}
