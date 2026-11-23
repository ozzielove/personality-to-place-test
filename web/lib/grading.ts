// Reference-based grading: every score is graded against a stated reference, then explained.
//
// Two kinds of reference are used, and they are kept apart on purpose:
//   - From the test document itself: the clarity bands (Step 1), the strong-preference rule and
//     the low / middle / high wording (Steps 3 and 7), and the bonus rules (Step 8).
//   - A reading aid added by this app: the letter grade for a place. It is anchored on the
//     document's own statement that "each point of weighted average distance costs 10 points",
//     so a letter is just a plain-language name for an average gap. It is not part of the method
//     and never changes the ranking.
import { DATA } from "./data";
import { USCALES, pyRound1, type DimResult, type Ranked, type Result, type Scale } from "./scoring";

// ---------------------------------------------------------------- personality: clarity bands

export interface ClarityRef {
  band: string;
  from: number;
  to: number;
  meaning: string;
}

/** The clarity table from Step 1 of the Scoring Methodology, word for word. */
export const CLARITY_REFERENCE: ClarityRef[] = [
  { band: "Slight", from: 50, to: 55, meaning: "Flexible; you use both poles and context decides." },
  { band: "Moderate", from: 56, to: 65, meaning: "A real but adaptable preference." },
  { band: "Clear", from: 66, to: 80, meaning: "A consistent, recognizable preference." },
  { band: "Very Clear", from: 81, to: 100, meaning: "A defining trait; environments that ignore it will feel draining." },
];

const POLE_NAME: Record<string, string> = {
  E: "Extraversion", I: "Introversion", S: "Sensing", N: "Intuition",
  T: "Thinking", F: "Feeling", J: "Judging", P: "Perceiving",
};

export interface Graded {
  grade: string;
  reference: string;
  why: string;
}

export function gradeDimension(d: DimResult): Graded & { meaning: string } {
  const ref = CLARITY_REFERENCE.find((c) => d.winPct >= c.from && d.winPct <= c.to) ?? CLARITY_REFERENCE[0];
  const total = d.ptsA + d.ptsB;
  const winPts = d.winner === d.a ? d.ptsA : d.ptsB;
  const exact = d.winner === d.a ? d.pctA : 100 - d.pctA;
  const why =
    total === 0
      ? `No points were scored on this dimension, so it is treated as 50/50 and the tie goes to ${d.winner}.`
      : `${POLE_NAME[d.winner]} (${d.winner}) earned ${winPts} of the ${total} points scored on this dimension: 100 × ${winPts} ÷ ${total} = ${exact.toFixed(1)}%, which rounds to ${d.winPct}%.` +
        (d.ptsA === d.ptsB ? ` An exact tie goes to ${d.winner} by convention.` : "");
  return { grade: ref.band, reference: `${ref.band} is ${ref.from} to ${ref.to}%`, meaning: ref.meaning, why };
}

// ---------------------------------------------------------------- place profile: scale levels

export type Level = "Low" | "Middle" | "High";

/** Low, middle, high cut points: the same 0 to 3, 4 to 6, 7 to 10 split the document's write-ups use. */
export function levelOf(v: number): Level {
  return v <= 3 ? "Low" : v <= 6 ? "Middle" : "High";
}

/** Step 3: a score is strong when it is 2 or less, or 8 or more. Strong scales weigh 1.5 times. */
export function isStrong(v: number): boolean {
  return v <= 2 || v >= 8;
}

export function gradeScale(s: Scale, r: Result): Graded & { level: Level; strong: boolean } {
  const info = DATA.scales.find((x) => x.code === s)!;
  const u = r.U[s];
  const level = levelOf(u);
  const strong = isStrong(u);
  const reference = `0 = ${info.low}; 10 = ${info.high}. Low is 0 to 3, middle 4 to 6, high 7 to 10; 2 or less and 8 or more count as strong.`;
  const why =
    r.max[s] === 0
      ? "No answer of yours was scored on this scale, so it sits at the neutral 5.0."
      : `Your answers earned ${r.earned[s]} of ${r.max[s]} possible points: 10 × ${r.earned[s]} ÷ ${r.max[s]} = ${r.score1[s].toFixed(1)}, used as ${u} in matching.`;
  return { grade: strong ? `${level}, strong` : level, level, strong, reference, why };
}

// ---------------------------------------------------------------- places: fit grade

export interface FitGrade {
  grade: "A" | "B" | "C" | "D" | "F";
  label: string;
  /** lowest Base Fit (rounded to one decimal) that earns this grade */
  min: number;
  /** what the band means in the method's own unit: average weighted gap per scale, in points */
  meaning: string;
}

/**
 * Letter grades for Base Fit. Base Fit = 100 − 10 × (weighted average gap), so each 10 points
 * of Base Fit is exactly one point of average distance between you and the place on a 0 to 10 scale.
 */
export const FIT_GRADES: FitGrade[] = [
  { grade: "A", label: "Excellent fit", min: 90, meaning: "On average the place is within 1 point of you on every scale." },
  { grade: "B", label: "Strong fit", min: 80, meaning: "On average the place is 1 to 2 points from you per scale." },
  { grade: "C", label: "Fair fit", min: 70, meaning: "On average the place is 2 to 3 points from you per scale." },
  { grade: "D", label: "Weak fit", min: 60, meaning: "On average the place is 3 to 4 points from you per scale." },
  { grade: "F", label: "Poor fit", min: -Infinity, meaning: "On average the place is more than 4 points from you per scale." },
];

export function gradeFit(base: number): FitGrade {
  const b = pyRound1(base); // the same rounded number the ranking and the page use
  return FIT_GRADES.find((g) => b >= g.min) ?? FIT_GRADES[FIT_GRADES.length - 1];
}

/** Top-match Base Fit of the three worked examples printed in the document, as outside reference points. */
export const WORKED_EXAMPLES = [
  { name: "Maya", type: "INFP-T", zip: "97214", place: "Hawthorne / Southeast, Portland, OR", base: 90.1, final: 101.1 },
  { name: "Daniel", type: "ESTJ-A", zip: "37064", place: "Downtown Franklin, TN", base: 94.3, final: 106.3 },
  { name: "Jordan", type: "ENTP-A", zip: "80302", place: "Downtown / Mapleton Hill, Boulder, CO", base: 90.8, final: 104.3 },
]; // tests/grading.test.ts recomputes these from the document's profiles, so they cannot drift

const AFFINITY_RULE: Record<string, string> = {
  E: "E: the place has NIGHT of 7 or more, or SOC of 8 or more (buzzing or very sociable)",
  I: "I: the place has QUIET of 7 or more (room to recharge)",
  S: "S: the place has OUT of 8 or more, FAM of 8 or more, or the HISTORY tag (tangible, grounded pleasures)",
  N: "N: the place has ARTS of 8 or more, or the COLLEGE tag (ideas and novelty)",
  T: "T: its career strengths include TECH, FIN, or GOV (merit-driven systems)",
  F: "F: the place has SOC, DIV, or FAITH of 8 or more (warm, values-rich community)",
  J: "J: the place has FAM of 8 or more, or the HISTORY or FAITH tag (order and institutions)",
  P: "P: the place has NIGHT of 7 or more, ARTS of 8 or more, or the OUTDOOR tag (spontaneity and play)",
  NF: "NF temperament: ARTS and SOC are both 7 or more (arts plus community)",
  NT: "NT temperament: career strengths include TECH or EDU, and it has the COLLEGE or STARTUP tag",
  SJ: "SJ temperament: FAM is 8 or more, with FAITH of 6 or more or the HISTORY tag",
  SP: "SP temperament: OUT or NIGHT is 8 or more (action and adventure)",
};

export interface ScaleCost {
  scale: Scale;
  name: string;
  you: number;
  place: number;
  gap: number;
  weight: number;
  /** Base Fit points this one scale costs. All costs add up to 100 − Base Fit. */
  cost: number;
}

export interface FitExplanation {
  grade: FitGrade;
  reference: string;
  /** weighted average gap per scale, in 0 to 10 scale points */
  avgGap: number;
  /** scales that cost points, most expensive first */
  costs: ScaleCost[];
  /** scales where the place meets you exactly (no cost) */
  matched: string[];
  bonuses: string[];
  /** 1-based rank among the places that survived the dealbreakers, and how many there were */
  rank: number;
  of: number;
}

export function explainFit(r: Ranked, res: Result): FitExplanation {
  const grade = gradeFit(r.base);
  let W = 0;
  for (const s of USCALES) W += res.weights[s];
  const name = (s: Scale) => DATA.scales.find((x) => x.code === s)!.name;
  const costs: ScaleCost[] = [];
  const matched: string[] = [];
  for (const s of USCALES) {
    const gap = r.D[s];
    if (gap === 0) {
      matched.push(name(s));
      continue;
    }
    costs.push({
      scale: s, name: name(s), you: res.U[s], place: s === "COST" ? r.loc.s.AFF : r.loc.s[s],
      gap, weight: res.weights[s], cost: (10 * res.weights[s] * gap) / W,
    });
  }
  costs.sort((a, b) => b.cost - a.cost);

  const bonuses: string[] = [];
  const sector = (c: string) => `${c} (${DATA.careers[c]})`;
  if (res.career1 === "REMOTE") {
    bonuses.push("Career +3: your top sector is REMOTE, so every place gets +3.");
    if (r.car === 5 && res.career2) bonuses.push(`Career +2: your second sector, ${sector(res.career2)}, is a career strength here.`);
  } else {
    if (res.career1 && r.loc.careers.includes(res.career1)) bonuses.push(`Career +4: your top sector, ${sector(res.career1)}, is a career strength here.`);
    if (res.career2 && r.loc.careers.includes(res.career2)) bonuses.push(`Career +2: your second sector, ${sector(res.career2)}, is a career strength here.`);
  }
  if (r.car === 0) bonuses.push(res.career1 ? "Career +0: neither of your sectors is a listed career strength here." : "Career +0: no career questions were answered.");
  bonuses.push(
    r.sharedTags.length
      ? `Tags +${r.tag}: the place carries ${r.sharedTags.length} of your active tags (${[...r.sharedTags].sort().join(", ")}), at +1.5 each, capped at +6.`
      : "Tags +0: the place carries none of your active subculture tags.",
  );
  if (r.why.length) {
    for (const k of r.why) bonuses.push(`Affinity +${k.length === 2 ? "1" : "0.5"} for ${AFFINITY_RULE[k]}.`);
  } else {
    bonuses.push("Affinity +0: no letter of your type (at 56% clarity or more) and no temperament rule matched this place.");
  }

  return {
    grade,
    reference: `${grade.grade} is a Base Fit of ${grade.min === -Infinity ? "under 60" : `${grade.min} or more`}. ${grade.meaning}`,
    avgGap: (100 - r.base) / 10,
    costs, matched, bonuses,
    rank: res.ranking.indexOf(r) + 1,
    of: res.ranking.length,
  };
}
