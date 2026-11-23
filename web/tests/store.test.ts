import { describe, expect, it } from "vitest";
import { TOTAL } from "@/lib/data";
import { firstUnanswered, parseBackup, sanitize } from "@/lib/store";

describe("sanitize: nothing untrusted reaches the scorer", () => {
  it("keeps valid answers and drops everything else", () => {
    const s = sanitize({
      answers: { 1: "B", 2: "Z", 3: "E", 4: 7, 563: "A", 564: "A", 0: "A", "-1": "A", "1.5": "A", abc: "A", 5: "a", 6: null },
      current: 12, startedAt: 100, updatedAt: 200, finishedAt: 300,
    });
    // question 3 has four options, so "E" is not a possible answer there
    expect(s.answers).toEqual({ 1: "B", 563: "A" });
    expect([s.current, s.startedAt, s.updatedAt, s.finishedAt]).toEqual([12, 100, 200, 300]);
  });
  it("clamps the position into 1 to 563", () => {
    expect(sanitize({ current: 99999 }).current).toBe(TOTAL);
    expect(sanitize({ current: -3 }).current).toBe(1);
    expect(sanitize({ current: 0 }).current).toBe(1);
    expect(sanitize({ current: "17" }).current).toBe(17);
    expect(sanitize({ current: 2.6 }).current).toBe(3);
    expect(sanitize({ current: "nope" }).current).toBe(1);
    expect(sanitize({}).current).toBe(1);
  });
  it("turns bad timestamps into null", () => {
    const s = sanitize({ startedAt: "yesterday", updatedAt: -5, finishedAt: Number.POSITIVE_INFINITY });
    expect([s.startedAt, s.updatedAt, s.finishedAt]).toEqual([null, null, null]);
  });
  it("survives anything", () => {
    for (const junk of [null, undefined, 0, "", "text", [], [1, 2], true, { answers: null }, { answers: "A" }, { answers: [] }]) {
      expect(sanitize(junk)).toEqual({ answers: {}, current: 1, startedAt: null, updatedAt: null, finishedAt: null });
    }
  });
});

describe("backup files", () => {
  const good = JSON.stringify({ app: "personality-to-place", version: 1, answers: { 1: "A", 2: "D", 700: "A" }, current: 2, startedAt: 5, updatedAt: 6, finishedAt: null });
  it("restores a real backup, cleaned", () => {
    expect(parseBackup(good)).toEqual({ answers: { 1: "A", 2: "D" }, current: 2, startedAt: 5, updatedAt: 6, finishedAt: null });
  });
  it("refuses files that are not backups, with a message for the user", () => {
    expect(() => parseBackup("not json")).toThrow("not valid JSON");
    expect(() => parseBackup("null")).toThrow("not a Personality-to-Place progress backup");
    expect(() => parseBackup("[]")).toThrow("not a Personality-to-Place progress backup");
    expect(() => parseBackup('{"hello":1}')).toThrow("not a Personality-to-Place progress backup");
    expect(() => parseBackup('{"app":"personality-to-place"}')).toThrow("not a Personality-to-Place progress backup");
    expect(() => parseBackup('{"app":"personality-to-place","answers":null}')).toThrow("not a Personality-to-Place progress backup");
    expect(() => parseBackup('{"app":"other","answers":{}}')).toThrow("not a Personality-to-Place progress backup");
    expect(() => parseBackup(" ".repeat(1_000_001))).toThrow("too large");
  });
});

describe("first unanswered", () => {
  it("finds the next gap and wraps around", () => {
    expect(firstUnanswered({}, 1)).toBe(1);
    expect(firstUnanswered({ 1: "A", 2: "A" }, 1)).toBe(3);
    expect(firstUnanswered({ 1: "A", 3: "A" }, 3)).toBe(4);
    const allBut7 = Object.fromEntries(Array.from({ length: TOTAL }, (_, i) => [i + 1, "A"]).filter(([n]) => n !== 7));
    expect(firstUnanswered(allBut7 as never, 500)).toBe(7);
    const all = Object.fromEntries(Array.from({ length: TOTAL }, (_, i) => [i + 1, "A"]));
    expect(firstUnanswered(all as never, 1)).toBe(null);
  });
});
