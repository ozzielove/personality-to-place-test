import { describe, expect, it } from "vitest";
import fixtures from "./fixtures.json";
import { QUESTIONS, TOTAL } from "@/lib/data";
import type { Location } from "@/lib/data";
import { DB_RULES, affinity, band, halfUp, justify, pct, pyRound1, rank, score, type RankInput, type Ranked, type ScaleMap } from "@/lib/scoring";

const lines = (rs: Ranked[], U: ScaleMap) => rs.slice(0, 3).map((r) => justify(r, U).map((j) => `${j.label}: ${j.text}`));

// fixtures.json is written by build/export_web.py: answer sheets scored by the Python rules.
interface Expect {
  answered: number; narrative: [number, string][]; identityPct: number; bands: string[]; winPct: number[];
  car: Record<string, number>; tagPts: Record<string, number>; earned: Record<string, number>; max: Record<string, number>;
  type: string; identity: string; tallies: Record<string, number>; at: Record<string, number>;
  clar: Record<string, number>; score1: Record<string, number>; U: Record<string, number>;
  career1: string | null; career2: string | null; tags: string[]; dbs: string[];
  pri1: string | null; pri2: string | null; relaxed: string[]; survivors: number;
  weights: Record<string, number>;
  justify: string[][];
  ranking: { zip: string; base: number; car: number; tag: number; aff: number; why: string[]; total: number; viol: number }[];
}
const cases = fixtures.cases as unknown as { name: string; answers: Record<string, string>; expect: Expect }[];
const personas = fixtures.personas as unknown as {
  name: string; U: ScaleMap; type: string; clar: Record<string, number>; career1: string; career2: string;
  tags: string[]; dbs: string[]; pri1: string; pri2: string; survivors: number; relaxed: string[];
  top: { zip: string; total: number; base: number }[];
  justify: string[][];
}[];

describe("data", () => {
  it("has 563 questions numbered without gaps", () => {
    expect(TOTAL).toBe(563);
    QUESTIONS.forEach((q, i) => expect(q.n).toBe(i + 1));
  });
});

describe("scoring matches the Python reference", () => {
  it("has a useful number of fixture cases", () => {
    expect(cases.length).toBeGreaterThanOrEqual(60);
  });
  for (const c of cases) {
    it(c.name, () => {
      const r = score(c.answers as unknown as Record<number, string>);
      const e = c.expect;
      expect(r.answered).toBe(e.answered);
      expect(r.narrative.map((x) => [x.n, x.answer])).toEqual(e.narrative);
      expect(r.identityPct).toBe(e.identityPct);
      expect(r.dims.map((d) => d.band)).toEqual(e.bands);
      expect(r.dims.map((d) => d.winPct)).toEqual(e.winPct);
      expect(r.dims.map((d) => d.winner).join("")).toBe(e.type);
      expect(r.car).toEqual(e.car);
      expect(r.tagPts).toEqual(e.tagPts);
      expect(r.earned).toEqual(e.earned);
      expect(r.max).toEqual(e.max);
      expect(r.type).toBe(e.type);
      expect(r.identity).toBe(e.identity);
      expect(r.tallies).toEqual(e.tallies);
      expect(r.at).toEqual(e.at);
      expect(r.clar).toEqual(e.clar);
      expect(r.score1).toEqual(e.score1);
      expect(r.U).toEqual(e.U);
      expect(r.career1).toBe(e.career1);
      expect(r.career2).toBe(e.career2);
      expect(r.tags).toEqual(e.tags);
      expect(r.dbs).toEqual(e.dbs);
      expect(r.pri1).toBe(e.pri1);
      expect(r.pri2).toBe(e.pri2);
      expect(r.relaxed).toEqual(e.relaxed);
      expect(r.survivors).toBe(e.survivors);
      expect(r.weights).toEqual(e.weights);
      // every surviving location, in order, with identical numbers (no tolerance)
      expect(
        r.ranking.map((x) => ({ zip: x.loc.zip, base: x.base, car: x.car, tag: x.tag, aff: x.aff, why: x.why, total: x.total, viol: x.viol })),
      ).toEqual(e.ranking);
      // the written reasons for the top three, word for word
      expect(lines(r.ranking, r.U)).toEqual(e.justify);
    });
  }
});

describe("worked examples from the document", () => {
  for (const p of personas) {
    it(p.name, () => {
      const r = rank(p);
      expect(r.survivors).toBe(p.survivors);
      expect(r.relaxed).toEqual(p.relaxed);
      expect(r.ranking.slice(0, 5).map((x) => ({ zip: x.loc.zip, total: x.total, base: x.base }))).toEqual(p.top);
      expect(lines(r.ranking, p.U)).toEqual(p.justify);
    });
  }
  it("prints the published top three", () => {
    const top = (name: string) => {
      const p = personas.find((x) => x.name === name)!;
      return rank(p).ranking.slice(0, 3).map((x) => `${x.loc.zip} ${x.total.toFixed(1)}`);
    };
    // values from VERIFICATION.md
    expect(top("Maya")).toEqual(["97214 101.1", "28806 99.3", "98102 91.8"]);
    expect(top("Daniel").map((s) => s.split(" ")[0])).toEqual(["37064", "75034", "72712"]);
    expect(top("Jordan").map((s) => s.split(" ")[0])).toEqual(["80302", "97703", "59715"]);
  });
});

// ---- unit tables: thresholds the real database and the answer sheets may never land on
type RankRow = { zip: string; base: number; car: number; tag: number; aff: number; why: string[]; total: number; viol: number };
const unit = fixtures as unknown as {
  rounding: { x: number; round1: number; pct: number; half0: number; half1: number }[];
  bands: [number, string][];
  dbCases: { L: Location; U: ScaleMap; expect: Record<string, boolean> }[];
  affinityCases: { L: Location; type: string; clar: Record<string, number>; bonus: number; why: string[] }[];
  rankCases: (RankInput & { weights: Record<string, number>; relaxed: string[]; survivors: number; ranking: RankRow[] })[];
};

describe("rounding helpers match Python", () => {
  it("has ties, negatives, and ordinary values", () => {
    expect(unit.rounding.length).toBeGreaterThan(300);
  });
  it("round to one decimal, ties to even (ranking order)", () => {
    for (const r of unit.rounding) expect(`${r.x} -> ${pyRound1(r.x) + 0}`).toBe(`${r.x} -> ${r.round1 + 0}`);
  });
  it("whole-number percentage, halves up", () => {
    for (const r of unit.rounding) expect(`${r.x} -> ${pct(r.x) + 0}`).toBe(`${r.x} -> ${r.pct + 0}`);
  });
  it("half-up to 0 and 1 decimals (scale scores)", () => {
    for (const r of unit.rounding) {
      expect(`${r.x} -> ${halfUp(r.x) + 0}`).toBe(`${r.x} -> ${r.half0 + 0}`);
      expect(`${r.x} -> ${halfUp(r.x, 1) + 0}`).toBe(`${r.x} -> ${r.half1 + 0}`);
    }
  });
  it("the document's own examples", () => {
    expect(pct(72.5)).toBe(73);
    expect(pct(65.8)).toBe(66);
    expect(pct(55.5)).toBe(56);
    expect(halfUp(9.3)).toBe(9);
    expect(halfUp(7.9166, 1)).toBe(7.9);
  });
});

describe("clarity bands", () => {
  it("match Python for every half point from 50 to 100", () => {
    expect(unit.bands.length).toBe(101);
    for (const [x, name] of unit.bands) expect(`${x} ${band(x)}`).toBe(`${x} ${name}`);
  });
  it("match the table in the document", () => {
    expect([50, 55, 56, 65, 66, 80, 81, 100].map(band)).toEqual(
      ["Slight", "Slight", "Moderate", "Moderate", "Clear", "Clear", "Very Clear", "Very Clear"],
    );
  });
});

describe("dealbreaker rules on synthetic places", () => {
  it("covers every rule in the document", () => {
    expect(Object.keys(DB_RULES).sort()).toEqual(Object.keys(unit.dbCases[0].expect).sort());
    expect(Object.keys(DB_RULES).length).toBe(22);
  });
  it("every rule gives Python's answer on every synthetic place", () => {
    expect(unit.dbCases.length).toBeGreaterThan(400);
    for (const c of unit.dbCases) {
      const got = Object.fromEntries(Object.keys(c.expect).map((k) => [k, DB_RULES[k](c.L, c.U)]));
      expect(got, `place ${c.L.zip}`).toEqual(c.expect);
    }
  });
  it("each rule both keeps and removes at least one place (no dead rule)", () => {
    for (const k of Object.keys(DB_RULES)) {
      const seen = new Set(unit.dbCases.map((c) => c.expect[k]));
      expect([k, seen.size]).toEqual([k, 2]);
    }
  });
});

describe("affinity bonus on synthetic places", () => {
  it("matches Python", () => {
    expect(unit.affinityCases.length).toBeGreaterThan(1000);
    for (const c of unit.affinityCases) {
      expect(affinity(c.type, c.clar, c.L), `${c.type} at ${c.L.zip}`).toEqual([c.bonus, c.why]);
    }
  });
  it("exercises every letter, every temperament, and the full +3", () => {
    const why = new Set(unit.affinityCases.flatMap((c) => c.why));
    expect([...why].sort()).toEqual(["E", "F", "I", "J", "N", "NF", "NT", "P", "S", "SJ", "SP", "T"]);
    expect(Math.max(...unit.affinityCases.map((c) => c.bonus))).toBe(3);
    expect(Math.min(...unit.affinityCases.map((c) => c.bonus))).toBe(0);
  });
});

describe("ranking from random profiles on the real database", () => {
  it("has varied inputs", () => {
    expect(unit.rankCases.length).toBeGreaterThanOrEqual(250);
    expect(unit.rankCases.some((c) => c.relaxed.length > 0)).toBe(true);
    expect(unit.rankCases.some((c) => c.career1 === "REMOTE")).toBe(true);
    expect(unit.rankCases.some((c) => c.pri1 !== null && c.pri1 === c.pri2)).toBe(true);
    expect(unit.rankCases.some((c) => c.ranking.some((r) => r.tag === 6))).toBe(true);
  });
  it("matches Python exactly", () => {
    unit.rankCases.forEach((c, i) => {
      const r = rank(c);
      expect([i, r.relaxed, r.survivors]).toEqual([i, c.relaxed, c.survivors]);
      expect(r.weights, `case ${i}`).toEqual(c.weights);
      expect(
        r.ranking.map((x) => ({ zip: x.loc.zip, base: x.base, car: x.car, tag: x.tag, aff: x.aff, why: x.why, total: x.total, viol: x.viol })),
        `case ${i}`,
      ).toEqual(c.ranking);
    });
  });
});

describe("speed", () => {
  it("scores a full sheet in well under 50 ms", () => {
    const full = cases[0].answers as unknown as Record<number, string>;
    score(full); // warm up
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) score(full);
    const per = (performance.now() - t0) / 20;
    expect(per).toBeLessThan(50);
  });
});
