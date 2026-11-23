// TypeScript port of the Scoring Methodology (Steps 1 to 9).
// Steps 6 to 9 mirror build/scoring.py line for line; Steps 1 to 5 mirror build/score_answers.py.
// tests/scoring.test.ts checks this file against the Python output, so change both together.
import { DATA, LOCATIONS, QUESTIONS, isValidAnswer, type Location } from "./data";

export const USCALES = [
  "URB", "PACE", "HEAT", "SEAS", "DRY", "MTN", "WATER", "DESERT", "FOREST", "ARTS",
  "OUT", "NIGHT", "SOC", "CIV", "FAITH", "COST", "FAM", "WALK", "QUIET", "DIV",
] as const;
export type Scale = (typeof USCALES)[number];
export type ScaleMap = Record<Scale, number>;
export type Answers = Record<number, string>;

const PAIRS = [["E", "I"], ["S", "N"], ["T", "F"], ["J", "P"]] as const;
const ASYM_HALF = new Set<string>(["MTN", "WATER", "DESERT", "FOREST", "QUIET"]);

type Rule = (L: Location, U: ScaleMap) => boolean;
export const DB_RULES: Record<string, Rule> = {
  NOSNOW: (L) => L.snow !== "R",
  NOHEAT: (L) => L.s.HEAT <= 8,
  NOHUMID: (L) => !(L.s.DRY <= 2 && L.s.HEAT >= 6),
  COAST: (L) => L.coast === "Y",
  MOUNTAINS: (L) => L.s.MTN >= 7,
  AIRPORT: (L) => L.air === "Y",
  NOCAR: (L) => L.s.WALK >= 8,
  AFFORD: (L) => L.s.AFF >= 5,
  SCHOOLS: (L) => L.s.FAM >= 7,
  QUIET: (L) => L.s.QUIET >= 6,
  URBANONLY: (L) => L.s.URB >= 7,
  RURALONLY: (L) => L.s.URB <= 3,
  LGBTQ: (L) => L.s.DIV >= 7 || L.tags.includes("LGBTQ"),
  FAITH: (L) => L.s.FAITH >= 7,
  SECULAR: (L) => L.s.FAITH <= 4,
  CIVMATCH: (L, U) => Math.abs(L.s.CIV - U.CIV) <= 3,
  NO_NE: (L) => L.region !== "Northeast & Mid-Atlantic",
  NO_SE: (L) => L.region !== "Southeast",
  NO_MW: (L) => L.region !== "Midwest",
  NO_SC: (L) => L.region !== "South Central",
  NO_MS: (L) => L.region !== "Mountain & Southwest",
  NO_PAC: (L) => L.region !== "Pacific",
};

/** Whole-number percentage, halves rounded up. */
export function pct(x: number): number {
  return Math.floor(x + 0.5 + 1e-9);
}

export function halfUp(x: number, nd = 0): number {
  const f = 10 ** nd;
  return Math.floor(x * f + 0.5 + 1e-9) / f;
}

/** Python's round(x, 1): correctly rounded, exact ties go to the even digit. */
export function pyRound1(x: number): number {
  const q = x * 4; // exact; a one-decimal tie is only possible at x.25 or x.75
  if (Number.isInteger(q) && Math.abs(q % 2) === 1) {
    const lo = Math.floor(x * 10);
    return (lo % 2 === 0 ? lo : lo + 1) / 10;
  }
  return Number(x.toFixed(1));
}

export function band(x: number): "Slight" | "Moderate" | "Clear" | "Very Clear" {
  const p = pct(x);
  return p <= 55 ? "Slight" : p <= 65 ? "Moderate" : p <= 80 ? "Clear" : "Very Clear";
}

function locVal(L: Location, s: Scale): number {
  return s === "COST" ? L.s.AFF : L.s[s];
}

function distance(U: ScaleMap, L: Location, s: Scale): number {
  const u = U[s];
  const l = locVal(L, s);
  if (s === "COST") return Math.max(0, u - l);
  if (ASYM_HALF.has(s)) return Math.max(0, u - l) + 0.5 * Math.max(0, l - u);
  return Math.abs(u - l);
}

function weights(U: ScaleMap, pri1: string | null, pri2: string | null): ScaleMap {
  const w = {} as ScaleMap;
  for (const s of USCALES) {
    let x = 1.0;
    if (U[s] <= 2 || U[s] >= 8) x *= 1.5;
    if (pri1 && DATA.priGroups[pri1]?.includes(s)) x *= 2.0;
    if (pri2 && pri2 !== pri1 && DATA.priGroups[pri2]?.includes(s)) x *= 1.5;
    w[s] = x;
  }
  return w;
}

export function affinity(mbti: string, clar: Record<string, number>, L: Location): [number, string[]] {
  const s = L.s;
  let b = 0;
  const reasons: string[] = [];
  const has = (...secs: string[]) => secs.some((x) => L.careers.includes(x));
  const tag = (...tags: string[]) => tags.some((x) => L.tags.includes(x));
  const ok = (letter: string) => pct(clar[letter]) >= 56;
  const rules: [string, boolean][] = [
    ["E", s.NIGHT >= 7 || s.SOC >= 8],
    ["I", s.QUIET >= 7],
    ["S", s.OUT >= 8 || s.FAM >= 8 || tag("HISTORY")],
    ["N", s.ARTS >= 8 || tag("COLLEGE")],
    ["T", has("TECH", "FIN", "GOV")],
    ["F", s.SOC >= 8 || s.DIV >= 8 || s.FAITH >= 8],
    ["J", s.FAM >= 8 || tag("HISTORY") || tag("FAITH")],
    ["P", s.NIGHT >= 7 || s.ARTS >= 8 || tag("OUTDOOR")],
  ];
  for (const [letter, cond] of rules) {
    if (mbti.includes(letter) && ok(letter) && cond) {
      b += 0.5;
      reasons.push(letter);
    }
  }
  const t = mbti;
  let temp: [string, boolean] | null = null;
  if (t.includes("N") && t.includes("F")) temp = ["NF", s.ARTS >= 7 && s.SOC >= 7];
  else if (t.includes("N") && t.includes("T")) temp = ["NT", has("TECH", "EDU") && tag("COLLEGE", "STARTUP")];
  else if (t.includes("S") && t.includes("J")) temp = ["SJ", s.FAM >= 8 && (s.FAITH >= 6 || tag("HISTORY"))];
  else if (t.includes("S") && t.includes("P")) temp = ["SP", s.OUT >= 8 || s.NIGHT >= 8];
  if (temp && temp[1]) {
    b += 1.0;
    reasons.push(temp[0]);
  }
  return [Math.min(3.0, b), reasons];
}

export interface Ranked {
  loc: Location;
  base: number;
  car: number;
  tag: number;
  aff: number;
  why: string[];
  total: number;
  viol: number;
  D: ScaleMap;
  civ: number;
  costgap: number;
  sharedTags: string[];
}

export interface RankInput {
  U: ScaleMap;
  type: string;
  clar: Record<string, number>;
  career1: string | null;
  career2: string | null;
  tags: string[];
  dbs: string[];
  pri1: string | null;
  pri2: string | null;
}

/** Steps 6 to 9: filter, weigh, add bonuses, rank. */
export function rank(inp: RankInput) {
  const { U, type, clar, career1, career2, tags, dbs, pri1, pri2 } = inp;
  const active = [...dbs];
  const relaxed: string[] = [];
  const survivors = (act: string[]) => LOCATIONS.filter((L) => act.every((d) => DB_RULES[d](L, U)));
  let surv = survivors(active);
  for (const d of DATA.relaxOrder) {
    if (surv.length >= 3) break;
    const i = active.indexOf(d);
    if (i >= 0) {
      active.splice(i, 1);
      relaxed.push(d);
      surv = survivors(active);
    }
  }
  const w = weights(U, pri1, pri2);
  let W = 0;
  for (const s of USCALES) W += w[s];
  const ranking: Ranked[] = surv.map((L) => {
    const D = {} as ScaleMap;
    let wd = 0;
    for (const s of USCALES) {
      D[s] = distance(U, L, s);
      wd += w[s] * D[s];
    }
    const base = 100 * (1 - wd / (10 * W));
    let car = 0;
    if (career1 === "REMOTE") {
      car = 3.0 + (career2 && L.careers.includes(career2) ? 2.0 : 0.0);
    } else {
      if (career1 && L.careers.includes(career1)) car += 4.0;
      if (career2 && L.careers.includes(career2)) car += 2.0;
    }
    const sharedTags = [...new Set(tags)].filter((t) => L.tags.includes(t));
    const tag = Math.min(6.0, 1.5 * sharedTags.length);
    const [aff, why] = affinity(type, clar, L);
    let viol = 0;
    for (const s of USCALES) if (w[s] >= 1.5 && D[s] >= 4) viol++;
    return {
      loc: L, base, car, tag, aff, why, total: base + car + tag + aff, viol, D,
      civ: Math.abs(U.CIV - L.s.CIV), costgap: D.COST, sharedTags,
    };
  });
  // Tie-breakers, in the document's order. The last one (a region you have never lived in)
  // is not knowable here, so remaining ties keep database order (the sort is stable).
  ranking.sort(
    (a, b) =>
      pyRound1(b.total) - pyRound1(a.total) ||
      pyRound1(b.base) - pyRound1(a.base) ||
      a.viol - b.viol ||
      a.civ - b.civ ||
      a.costgap - b.costgap,
  );
  return { ranking, weights: w, relaxed, survivors: surv.length };
}

export interface DimResult {
  a: string;
  b: string;
  ptsA: number;
  ptsB: number;
  pctA: number;
  winner: string;
  winPct: number;
  band: string;
}

/** Steps 1 to 5: turn an answer sheet into a type and a Place Profile. */
export function buildProfile(answers: Answers) {
  const tallies: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  const at: Record<string, number> = { A: 0, T: 0 };
  const earned = {} as ScaleMap;
  const max = {} as ScaleMap;
  for (const s of USCALES) {
    earned[s] = 0;
    max[s] = 0;
  }
  const car: Record<string, number> = {};
  const carLast: Record<string, number> = {};
  const tagPts: Record<string, number> = {};
  const tagLast: Record<string, number> = {};
  const dbs: string[] = [];
  let pri1: string | null = null;
  let pri2: string | null = null;
  const narrative: { n: number; text: string; answer: string }[] = [];
  let answered = 0;

  for (const q of QUESTIONS) {
    const L = answers[q.n];
    if (!isValidAnswer(q.n, L)) continue;
    answered++;
    if (q.m) {
      const cell = q.m[L]; // null when the answer earns no points
      if (cell) {
        if (q.d === "AT") at[cell[0]] += cell[1];
        else tallies[cell[0]] += cell[1];
      }
    }
    if (q.s) {
      for (const sc of Object.keys(q.s) as Scale[]) {
        const v = q.s[sc][L];
        if (v === null || v === undefined) continue;
        earned[sc] += v;
        max[sc] += q.l ? 4 : 10;
      }
    }
    if (q.c) {
      const c = q.c;
      const carCode = c.CAR?.[L];
      if (carCode) {
        car[carCode] = (car[carCode] ?? 0) + 1;
        carLast[carCode] = q.n;
      }
      const db = c.DB?.[L];
      if (db && !dbs.includes(db)) dbs.push(db);
      if (c.PRI1) pri1 = c.PRI1[L] || pri1;
      if (c.PRI2) pri2 = c.PRI2[L] || pri2;
    }
    if (q.g) {
      for (const [t, n] of q.g[L] ?? []) {
        tagPts[t] = (tagPts[t] ?? 0) + n;
        tagLast[t] = q.n;
      }
    }
    // narrative item: answered, but feeds no score of any kind
    if (!q.m && !q.s && !q.c && !q.g) {
      narrative.push({ n: q.n, text: q.t, answer: q.o[L.charCodeAt(0) - 65] });
    }
  }

  // Step 1: four letters and clarity
  let type = "";
  const clar: Record<string, number> = {};
  const dims: DimResult[] = [];
  for (const [a, b] of PAIRS) {
    const tot = tallies[a] + tallies[b];
    const pa = tot ? (100 * tallies[a]) / tot : 50.0;
    clar[a] = pa;
    clar[b] = 100 - pa;
    const winner = pa > 50 ? a : b; // exact ties go to I, N, F, P
    type += winner;
    dims.push({ a, b, ptsA: tallies[a], ptsB: tallies[b], pctA: pa, winner, winPct: pct(clar[winner]), band: band(clar[winner]) });
  }
  // Step 2: identity (ties go to T)
  const identity = at.A > at.T ? "A" : "T";
  const atTot = at.A + at.T;
  const identityPct = pct(atTot ? (100 * at[identity]) / atTot : 50);

  // Step 3: scale = average position of your answers, 0 to 10
  const score1 = {} as ScaleMap;
  const U = {} as ScaleMap;
  for (const s of USCALES) {
    score1[s] = max[s] ? halfUp((10 * earned[s]) / max[s], 1) : 5.0;
    U[s] = halfUp(score1[s]);
  }

  // Step 4: most points wins; ties go to the code chosen in the later question
  const carRanked = Object.keys(car).sort((x, y) => car[y] - car[x] || carLast[y] - carLast[x]);
  const career1 = carRanked[0] ?? null;
  const career2 = carRanked[1] ?? null;

  // Step 5: 3 or more points is active; keep five, highest first.
  // The document does not say how to break a tie for the fifth slot. This uses the same rule
  // as careers (the tag picked in the later question wins). Change the comparator here and in
  // build/score_answers.py if you want a different rule.
  const tags = Object.keys(tagPts)
    .filter((t) => tagPts[t] >= 3)
    .sort((x, y) => tagPts[y] - tagPts[x] || tagLast[y] - tagLast[x])
    .slice(0, 5);

  return {
    answered, tallies, at, type, clar, dims, identity, identityPct, earned, max, score1, U,
    car, career1, career2, tagPts, tags, dbs, pri1, pri2, narrative,
  };
}

export type Profile = ReturnType<typeof buildProfile>;
export type Result = Profile & ReturnType<typeof rank>;

/** The whole test: answers in, ranked places out. Pure and synchronous, runs in about a millisecond. */
export function score(answers: Answers): Result {
  const p = buildProfile(answers);
  return { ...p, ...rank(p) };
}

function lvl(v: number, words: [string, string, string]): string {
  return v <= 3 ? words[0] : v <= 6 ? words[1] : words[2];
}

/** One line per fit factor, worded exactly as build.py's justify() prints them in the document. */
export function justify(r: Ranked, U: ScaleMap): { label: string; text: string }[] {
  const s = r.loc.s;
  const civ = s.CIV;
  const civw = civ <= 3 ? "traditional-leaning" : civ <= 6 ? "mixed / center" : "progressive-leaning";
  const snow = { R: "regular", O: "occasional", N: "rare" }[r.loc.snow];
  const cost = r.D.COST === 0 ? "within your comfort zone" : `a stretch of ${r.D.COST} points; budget accordingly`;
  const tags = [...r.sharedTags].sort();
  return [
    { label: "Community culture", text: r.loc.desc },
    { label: "Walkability", text: `${lvl(s.WALK, ["car-dependent", "partly walkable", "very walkable"])} (WALK ${s.WALK} vs. your ${U.WALK}).` },
    { label: "Arts scene", text: `${lvl(s.ARTS, ["modest", "solid", "outstanding"])} (ARTS ${s.ARTS} vs. your ${U.ARTS}).` },
    { label: "Outdoor access", text: `${lvl(s.OUT, ["limited", "good", "exceptional"])}. Mountains ${s.MTN}, water ${s.WATER}, forest ${s.FOREST}, desert ${s.DESERT}.` },
    { label: "Weather", text: `warmth ${s.HEAT}, seasons ${s.SEAS}, dryness ${s.DRY}, snow ${snow} (your HEAT ${U.HEAT}, SEAS ${U.SEAS}, DRY ${U.DRY}).` },
    { label: "Civic climate", text: `${civw} (CIV ${civ} vs. your ${U.CIV}); faith community ${lvl(s.FAITH, ["low-key", "present", "central"])} (FAITH ${s.FAITH} vs. your ${U.FAITH}).` },
    { label: "Cost vs. financial mindset", text: `affordability ${s.AFF} against your cost sensitivity ${U.COST}: ${cost}.` },
    { label: "Social density and pace", text: `density ${s.URB} (yours ${U.URB}), pace ${s.PACE} (yours ${U.PACE}), sociability ${s.SOC} (yours ${U.SOC}), quietness ${s.QUIET} (yours ${U.QUIET}).` },
    { label: "Niche subcultures", text: `${tags.length ? tags.join(", ") : "none of your active tags, though see the character notes"}. Career fit: ${r.loc.careers.join(", ")}.` },
  ];
}
