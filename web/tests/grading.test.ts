import { describe, expect, it } from "vitest";
import fixtures from "./fixtures.json";
import { CLARITY_REFERENCE, FIT_GRADES, WORKED_EXAMPLES, explainFit, gradeDimension, gradeFit, gradeScale, isStrong, levelOf } from "@/lib/grading";
import { USCALES, band, rank, score, type RankInput, type Result, type ScaleMap } from "@/lib/scoring";

const cases = fixtures.cases as unknown as { name: string; answers: Record<number, string> }[];
const personas = fixtures.personas as unknown as (RankInput & { name: string; U: ScaleMap })[];
const sheet = (name: string) => score(cases.find((c) => c.name.startsWith(name))!.answers);

describe("clarity reference (personality grade)", () => {
  it("is the document's table, with no gaps or overlaps from 50 to 100", () => {
    expect(CLARITY_REFERENCE.map((c) => [c.band, c.from, c.to])).toEqual([
      ["Slight", 50, 55], ["Moderate", 56, 65], ["Clear", 66, 80], ["Very Clear", 81, 100],
    ]);
  });
  it("agrees with the scorer's band for every whole percentage", () => {
    for (let p = 50; p <= 100; p++) {
      const g = gradeDimension({ a: "E", b: "I", ptsA: p, ptsB: 100 - p, pctA: p, winner: "E", winPct: p, band: band(p) });
      expect(`${p} ${g.grade}`).toBe(`${p} ${band(p)}`);
    }
  });
  it("grades, cites the reference, then shows the arithmetic", () => {
    const g = gradeDimension({ a: "E", b: "I", ptsA: 22, ptsB: 58, pctA: 27.5, winner: "I", winPct: 73, band: "Clear" });
    expect(g.grade).toBe("Clear");
    expect(g.reference).toBe("Clear is 66 to 80%");
    expect(g.meaning).toBe("A consistent, recognizable preference.");
    expect(g.why).toBe("Introversion (I) earned 58 of the 80 points scored on this dimension: 100 × 58 ÷ 80 = 72.5%, which rounds to 73%.");
  });
  it("explains a first-pole win with that pole's points", () => {
    const g = gradeDimension({ a: "E", b: "I", ptsA: 55, ptsB: 24, pctA: (100 * 55) / 79, winner: "E", winPct: 70, band: "Clear" });
    expect(g.why).toBe("Extraversion (E) earned 55 of the 79 points scored on this dimension: 100 × 55 ÷ 79 = 69.6%, which rounds to 70%.");
  });
  it("explains an exact tie and an empty dimension", () => {
    const tie = gradeDimension({ a: "E", b: "I", ptsA: 10, ptsB: 10, pctA: 50, winner: "I", winPct: 50, band: "Slight" });
    expect(tie.grade).toBe("Slight");
    expect(tie.why).toBe("Introversion (I) earned 10 of the 20 points scored on this dimension: 100 × 10 ÷ 20 = 50.0%, which rounds to 50%. An exact tie goes to I by convention.");
    const none = gradeDimension({ a: "S", b: "N", ptsA: 0, ptsB: 0, pctA: 50, winner: "N", winPct: 50, band: "Slight" });
    expect(none.why).toBe("No points were scored on this dimension, so it is treated as 50/50 and the tie goes to N.");
  });
  it("falls back to the lowest band if handed a percentage below 50 (cannot happen from real answers)", () => {
    const g = gradeDimension({ a: "E", b: "I", ptsA: 1, ptsB: 1, pctA: 49, winner: "E", winPct: 49, band: "Slight" });
    expect([g.grade, g.reference]).toEqual(["Slight", "Slight is 50 to 55%"]);
  });
  it("matches real results end to end", () => {
    const r = sheet("random 7");
    for (const d of r.dims) expect(gradeDimension(d).grade).toBe(d.band);
  });
});

describe("scale levels (place profile grade)", () => {
  it("uses the document's cut points", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(levelOf)).toEqual(
      ["Low", "Low", "Low", "Low", "Middle", "Middle", "Middle", "High", "High", "High", "High"],
    );
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(isStrong)).toEqual(
      [true, true, true, false, false, false, false, false, true, true, true],
    );
  });
  it("grades every scale and shows the arithmetic that produced it", () => {
    const r = sheet("all A");
    for (const s of USCALES) {
      const g = gradeScale(s, r);
      expect(g.level).toBe(levelOf(r.U[s]));
      expect(g.strong).toBe(isStrong(r.U[s]));
      expect(g.grade).toBe(g.strong ? `${g.level}, strong` : g.level);
      expect(g.why).toBe(
        `Your answers earned ${r.earned[s]} of ${r.max[s]} possible points: 10 × ${r.earned[s]} ÷ ${r.max[s]} = ${r.score1[s].toFixed(1)}, used as ${r.U[s]} in matching.`,
      );
      expect(g.reference).toContain("Low is 0 to 3, middle 4 to 6, high 7 to 10; 2 or less and 8 or more count as strong.");
    }
    expect(gradeScale("URB", r).reference.startsWith("0 = Remote countryside; 10 = Dense big-city core.")).toBe(true);
  });
  it("says so when a scale has no answers", () => {
    const r = sheet("empty");
    const g = gradeScale("HEAT", r);
    expect(g.grade).toBe("Middle");
    expect(g.why).toBe("No answer of yours was scored on this scale, so it sits at the neutral 5.0.");
  });
});

describe("fit grade (place grade)", () => {
  it("has five bands, ten Base Fit points apart, each naming its average gap", () => {
    expect(FIT_GRADES.map((g) => [g.grade, g.label, g.min])).toEqual([
      ["A", "Excellent fit", 90], ["B", "Strong fit", 80], ["C", "Fair fit", 70], ["D", "Weak fit", 60], ["F", "Poor fit", -Infinity],
    ]);
  });
  it("grades on the one-decimal Base Fit shown on the page, at every boundary", () => {
    const g = (x: number) => gradeFit(x).grade;
    expect([100, 90, 89.96, 89.94, 80, 79.96, 79.94, 70, 69.94, 60, 59.94, 0, -5].map(g)).toEqual(
      ["A", "A", "A", "B", "B", "B", "C", "C", "D", "D", "F", "F", "F"],
    );
  });
  it("falls back to the lowest grade when Base Fit is not a number", () => {
    expect(gradeFit(Number.NaN)).toBe(FIT_GRADES[4]);
    expect(gradeFit(Number.NaN).grade).toBe("F");
  });
  it("the worked-example reference points are the document's real numbers", () => {
    for (const w of WORKED_EXAMPLES) {
      const p = personas.find((x) => x.name === w.name)!;
      const top = rank(p).ranking[0];
      expect([w.name, top.loc.zip, top.base.toFixed(1), top.total.toFixed(1)]).toEqual([w.name, w.zip, w.base.toFixed(1), w.final.toFixed(1)]);
      expect(w.place).toContain(top.loc.name.split(" / ")[0]);
      expect(w.type.slice(0, 4)).toBe(p.type);
    }
  });
});

describe("the why behind a place grade", () => {
  const results: Result[] = ["all A", "all last", "random 0", "random 7", "random 12", "every dealbreaker", "place only"].map(sheet);
  it("per-scale costs add up to exactly the Base Fit points lost, for every ranked place", () => {
    let checked = 0;
    for (const res of results) {
      for (const r of res.ranking) {
        const e = explainFit(r, res);
        const lost = e.costs.reduce((a, c) => a + c.cost, 0);
        expect(Math.abs(lost - (100 - r.base))).toBeLessThan(1e-9);
        expect(Math.abs(e.avgGap * 10 - (100 - r.base))).toBeLessThan(1e-9);
        expect(e.costs.length + e.matched.length).toBe(20);
        expect(e.costs.every((c) => c.cost > 0 && c.gap > 0)).toBe(true);
        for (let i = 1; i < e.costs.length; i++) expect(e.costs[i - 1].cost).toBeGreaterThanOrEqual(e.costs[i].cost);
        expect(e.grade).toBe(gradeFit(r.base));
        expect([e.rank, e.of]).toEqual([res.ranking.indexOf(r) + 1, res.ranking.length]);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
  it("shows each cost with the numbers that produced it (Maya and Portland, from the document)", () => {
    const p = personas.find((x) => x.name === "Maya")!;
    const ranked = rank(p);
    const res = { ...ranked, ...p } as unknown as Result;
    const e = explainFit(ranked.ranking[0], res);
    expect(e.grade.grade).toBe("A");
    expect(e.reference).toBe("A is a Base Fit of 90 or more. On average the place is within 1 point of you on every scale.");
    expect(e.avgGap.toFixed(2)).toBe("0.99");
    expect([e.rank, e.of]).toEqual([1, ranked.ranking.length]);
    const cost = e.costs.find((c) => c.scale === "COST")!;
    // Maya's cost sensitivity is 6, Portland's affordability is 4: a 2-point shortfall at weight 1
    expect([cost.name, cost.you, cost.place, cost.gap, cost.weight]).toEqual(["Cost Sensitivity", 6, 4, 2, 1]);
    const W = USCALES.reduce((a, s) => a + ranked.weights[s], 0);
    expect(cost.cost).toBe((10 * 1 * 2) / W);
    // a weighted scale: place value comes from the scale itself, not affordability
    const civ = e.costs.find((c) => c.scale === "CIV")!;
    expect([civ.you, civ.place, civ.gap, civ.weight]).toEqual([9, 10, 1, 3]);
    expect(civ.cost).toBe((10 * 3 * 1) / W);
    expect(e.matched).toContain("Green & Forest");
    expect(e.bonuses).toEqual([
      "Career +4: your top sector, CREA (Arts, media, design, entertainment), is a career strength here.",
      "Tags +6: the place carries 4 of your active tags (ARTSY, MAKER, OUTDOOR, WELLNESS), at +1.5 each, capped at +6.",
      "Affinity +0.5 for N: the place has ARTS of 8 or more, or the COLLEGE tag (ideas and novelty).",
      "Affinity +0.5 for P: the place has NIGHT of 7 or more, ARTS of 8 or more, or the OUTDOOR tag (spontaneity and play).",
    ]);
  });
  it("explains the remote-work rule, second-sector bonus, and temperament bonus (Jordan and Boulder)", () => {
    const p = personas.find((x) => x.name === "Jordan")!;
    const ranked = rank(p);
    const e = explainFit(ranked.ranking[0], { ...ranked, ...p } as unknown as Result);
    expect(e.bonuses.slice(0, 2)).toEqual([
      "Career +3: your top sector is REMOTE, so every place gets +3.",
      "Career +2: your second sector, TECH (Technology, software, engineering, data), is a career strength here.",
    ]);
    expect(e.bonuses.some((b) => b.startsWith("Affinity +1 for NT temperament:"))).toBe(true);
  });
  it("explains the second-sector bonus for a non-remote profile (Daniel)", () => {
    const p = personas.find((x) => x.name === "Daniel")!;
    const ranked = rank(p);
    const withSecond = ranked.ranking.find((r) => r.car === 6)!;
    const e = explainFit(withSecond, { ...ranked, ...p } as unknown as Result);
    expect(e.bonuses.slice(0, 2)).toEqual([
      "Career +4: your top sector, FIN (Finance, insurance, real estate, corporate HQs), is a career strength here.",
      "Career +2: your second sector, HLTH (Healthcare, life sciences, caregiving), is a career strength here.",
    ]);
  });
  it("says plainly when a bonus is zero", () => {
    const p = personas.find((x) => x.name === "Maya")!;
    const bare = { ...p, career1: null, career2: null, tags: [], clar: { E: 50, I: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 }, type: "ISTJ" };
    const ranked = rank(bare);
    const plain = ranked.ranking.find((r) => r.aff === 0)!;
    const e = explainFit(plain, { ...ranked, ...bare } as unknown as Result);
    expect(e.bonuses).toEqual([
      "Career +0: no career questions were answered.",
      "Tags +0: the place carries none of your active subculture tags.",
      "Affinity +0: no letter of your type (at 56% clarity or more) and no temperament rule matched this place.",
    ]);
    const noSector = { ...p, career1: "AGRI", career2: null };
    const r2 = rank(noSector);
    const miss = r2.ranking.find((r) => r.car === 0)!;
    expect(explainFit(miss, { ...r2, ...noSector } as unknown as Result).bonuses[0]).toBe(
      "Career +0: neither of your sectors is a listed career strength here.",
    );
    // remote with a second sector the place lacks: only the flat +3 line
    const remote = { ...p, career1: "REMOTE", career2: "AGRI" };
    const r3 = rank(remote);
    const three = r3.ranking.find((r) => r.car === 3)!;
    const b3 = explainFit(three, { ...r3, ...remote } as unknown as Result).bonuses;
    expect(b3[0]).toBe("Career +3: your top sector is REMOTE, so every place gets +3.");
    expect(b3[1].startsWith("Tags ")).toBe(true);
  });
});
