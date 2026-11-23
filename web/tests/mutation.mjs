// Mutation test for lib/scoring.ts and lib/grading.ts: change the code one small step at a time and
// make sure the test suite notices every change. The live file is never touched: each mutant
// is written into a throwaway copy of the project under the system temp folder.
//
//   node tests/mutation.mjs            run everything
//   node tests/mutation.mjs --list     print the mutants without running them
//
// Exit code 0 only when: the unmutated code passes, both canaries behave, and every surviving
// mutant is on the reviewed EQUIVALENT list below (a change that cannot alter any result).
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = ["lib/scoring.ts", "lib/grading.ts"];
const SOURCES = Object.fromEntries(TARGETS.map((t) => [t, fs.readFileSync(path.join(WEB, t), "utf8")]));
const SRC = SOURCES["lib/scoring.ts"]; // the canaries below edit the scorer
const WORKERS = Math.max(2, Math.min(8, os.cpus().length - 1));

// ---- operators: [name, regex, replacement]
const OPS = [
  ["ge>gt", />=/g, ">"],
  ["le>lt", /<=/g, "<"],
  ["gt>ge", / > /g, " >= "],
  ["lt>le", / < /g, " <= "],
  ["eq>ne", /===/g, "!=="],
  ["ne>eq", /!==/g, "==="],
  ["and>or", /&&/g, "||"],
  ["or>and", /\|\|/g, "&&"],
  ["add>sub", / \+ /g, " - "],
  ["sub>add", / - /g, " + "],
  ["mul>div", / \* /g, " / "],
  ["div>mul", / \/ /g, " * "],
  ["addeq>subeq", /\+=/g, "-="],
  ["muleq>diveq", /\*=/g, "/="],
  ["inc>dec", /\+\+/g, "--"],
  ["max>min", /Math\.max/g, "Math.min"],
  ["min>max", /Math\.min/g, "Math.max"],
  ["floor>ceil", /Math\.floor/g, "Math.ceil"],
  ["abs>id", /Math\.abs/g, ""],
  ["every>some", /\.every\(/g, ".some("],
  ["some>every", /\.some\(/g, ".every("],
  ["not>id", /!\(/g, "("],
  ["nullish>or0", /\?\? 0/g, "?? 1"],
];
// number literals: each one is nudged up and down
const NUM = /(?<![\w.$"'`])(\d+(?:\.\d+)?)(?![\w"'`]|\.\d)/g;

function skippable(line) {
  const t = line.trim();
  return t === "" || t.startsWith("//") || t.startsWith("/**") || t.startsWith("*") || t.startsWith("import ") ||
    t.startsWith("export type ") || t.startsWith("type ");
}

// lines inside `interface { ... }` blocks carry no behavior
function interfaceLines(LINES) {
  const inInterface = new Set();
  let depth = 0;
  LINES.forEach((line, i) => {
    const starts = /^(export )?interface /.test(line.trim());
    if (depth === 0 && starts) depth = line.includes("{") ? 1 : 0;
    else if (depth > 0) {
      if (line.includes("{")) depth++;
      if (line.includes("}")) depth--;
    }
    if (depth > 0 || starts) inInterface.add(i);
  });
  return inInterface;
}

function stripStrings(line) {
  // blank out the inside of string and template literals so operators in text are not mutated,
  // keeping positions intact. `${...}` parts of templates stay visible.
  let out = "";
  let q = null;
  let brace = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q === null) {
      if (c === '"' || c === "'" || c === "`") q = c;
      out += c;
    } else if (q === "`" && c === "$" && line[i + 1] === "{") {
      brace = 1;
      out += "${";
      i += 2;
      while (i < line.length && brace > 0) {
        if (line[i] === "{") brace++;
        if (line[i] === "}") brace--;
        out += line[i];
        i++;
      }
      i--;
    } else if (c === "\\") {
      out += "  ";
      i++;
    } else if (c === q) {
      q = null;
      out += c;
    } else out += " ";
  }
  return out;
}

function buildMutants() {
  const mutants = [];
  for (const file of TARGETS) {
  const LINES = SOURCES[file].split("\n");
  const inInterface = interfaceLines(LINES);
  LINES.forEach((line, i) => {
    if (skippable(line) || inInterface.has(i)) return;
    const code = stripStrings(line).replace(/\/\/.*$/, (m) => " ".repeat(m.length));
    const add = (op, at, len, rep) => {
      const mutated = line.slice(0, at) + rep + line.slice(at + len);
      if (mutated !== line) mutants.push({ id: mutants.length + 1, file, line: i + 1, op, col: at, from: line.trim(), to: mutated.trim(), mutated });
    };
    for (const [name, re, rep] of OPS) {
      for (const m of code.matchAll(re)) add(name, m.index, m[0].length, rep);
    }
    for (const m of code.matchAll(NUM)) {
      const v = Number(m[1]);
      const isInt = Number.isInteger(v) && !m[1].includes(".");
      add("num+", m.index, m[1].length, String(isInt ? v + 1 : Number((v + 0.1).toFixed(4))));
      if (v !== 0) add("num-", m.index, m[1].length, String(isInt ? v - 1 : Number((v - 0.1).toFixed(4))));
    }
  });
  }
  return mutants;
}

// ---- reviewed equivalent mutants: a survivor is accepted only if its mutated line contains one
// of these exact texts. Each entry: [mutated code, why no input can ever show the difference].
// Reviewed 2026-11-23. An entry that stops matching a survivor fails the run, so this list cannot rot.
const EPS = "The 1e-9 only absorbs floating-point error just below a half. Inputs are ratios of small whole numbers (at most 96 points, 110 items), so the nearest non-half value is far more than 1e-8 away; any epsilon from 1e-10 to 1e-8 rounds every reachable value the same way.";
const EQUIVALENT = [
  ["Math.floor(x + 0.5 + 1e-10)", EPS],
  ["Math.floor(x + 0.5 + 1e-8)", EPS],
  ["Math.floor(x * f + 0.5 + 1e-10)", EPS],
  ["Math.floor(x * f + 0.5 + 1e-8)", EPS],
  ['else if (t.includes("S") || t.includes("P")) temp = ["SP"',
    "This branch is reached only after NF, NT and SJ were ruled out. Every type has S or N, T or F, J or P, so the only types left are SP types, for which S-and-P and S-or-P are both true."],
  ["Math.min(3.1, b)",
    "The cap never binds: a type has four letters (4 x 0.5) and one temperament (1.0), so the bonus cannot exceed 3.0."],
  ["w[s] >= 1.4 && D[s] >= 4",
    "Weights are products of 1, 1.5 and 2 only (1, 1.5, 2, 2.25, 3, 4.5). No weight lies between 1.4 and 1.5."],
];

function equivalentReason(m) {
  const hit = EQUIVALENT.find(([text]) => m.to.includes(text));
  return hit ? hit[1] : null;
}

// ---- canaries: prove the driver itself can tell good from bad
const CANARIES = [
  {
    name: "known bug must be caught: same priority twice multiplies by 3 instead of 2 (fix #5 in VERIFICATION.md)",
    from: "if (pri2 && pri2 !== pri1 && DATA.priGroups[pri2]?.includes(s)) x *= 1.5;",
    to: "if (pri2 && DATA.priGroups[pri2]?.includes(s)) x *= 1.5;",
    expect: "killed",
  },
  {
    name: "harmless edit must pass: a comment-only change",
    from: "// Step 2: identity (ties go to T)",
    to: "// Step 2: identity (ties go to T) [canary]",
    expect: "survived",
  },
];

function makeWorkdir(i) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `p2p-mut-${i}-`));
  for (const d of ["lib", "tests", "data"]) fs.mkdirSync(path.join(dir, d));
  fs.symlinkSync(path.join(WEB, "node_modules"), path.join(dir, "node_modules"));
  for (const f of ["vitest.config.mts", "package.json", "lib/data.ts", "tests/scoring.test.ts", "tests/grading.test.ts"]) {
    fs.copyFileSync(path.join(WEB, f), path.join(dir, f));
  }
  for (const f of ["data/test-data.json", "tests/fixtures.json"]) fs.symlinkSync(path.join(WEB, f), path.join(dir, f));
  return dir;
}

function runTests(dir, source, file = "lib/scoring.ts") {
  // every target starts from its original, then exactly one of them carries the mutant
  for (const t of TARGETS) fs.writeFileSync(path.join(dir, t), t === file ? source : SOURCES[t]);
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [path.join(WEB, "node_modules/vitest/vitest.mjs"), "run", "--reporter=dot", "--bail=1", "-t", "^(?!speed)"],
      { cwd: dir, timeout: 120000, env: { ...process.env, CI: "1" } },
      (err, stdout, stderr) => resolve({ passed: !err, timedOut: Boolean(err && err.killed), out: (stdout + stderr).slice(-400) }),
    );
  });
}

function withLine(file, lineNo, text) {
  const copy = SOURCES[file].split("\n");
  copy[lineNo - 1] = text;
  return copy.join("\n");
}

async function main() {
  const mutants = buildMutants();
  if (process.argv.includes("--list")) {
    for (const m of mutants) console.log(`${m.id}\t${m.file}:${m.line}\t${m.op}\t${m.to}`);
    console.log(`${mutants.length} mutants`);
    return;
  }
  const dirs = Array.from({ length: WORKERS }, (_, i) => makeWorkdir(i));
  let fail = false;
  try {
    // 0. baseline
    const base = await runTests(dirs[0], SRC);
    console.log(`baseline (unmutated): ${base.passed ? "PASS" : "FAIL"}`);
    if (!base.passed) {
      console.log(base.out);
      process.exitCode = 1;
      return;
    }
    // 1. canaries
    for (const c of CANARIES) {
      if (!SRC.includes(c.from)) {
        console.log(`CANARY BROKEN (text not found, update tests/mutation.mjs): ${c.name}`);
        fail = true;
        continue;
      }
      const r = await runTests(dirs[0], SRC.replace(c.from, c.to));
      const got = r.passed ? "survived" : "killed";
      const ok = got === c.expect;
      if (!ok) fail = true;
      console.log(`canary ${ok ? "OK  " : "FAIL"} (${got}, expected ${c.expect}): ${c.name}`);
    }
    // 2. mutants
    const t0 = Date.now();
    const survivors = [];
    let killed = 0;
    let timeouts = 0;
    let next = 0;
    await Promise.all(
      dirs.map(async (dir) => {
        while (next < mutants.length) {
          const m = mutants[next++];
          const r = await runTests(dir, withLine(m.file, m.line, m.mutated), m.file);
          if (r.passed) survivors.push(m);
          else {
            killed++;
            if (r.timedOut) timeouts++;
          }
        }
      }),
    );
    survivors.sort((a, b) => a.id - b.id);
    const unexplained = survivors.filter((m) => !equivalentReason(m));
    const explained = survivors.filter((m) => equivalentReason(m));
    console.log(`\n${mutants.length} mutants in ${Math.round((Date.now() - t0) / 1000)} s on ${WORKERS} workers`);
    console.log(`killed ${killed} (of which timed out: ${timeouts}), survived ${survivors.length}: ${explained.length} reviewed as equivalent, ${unexplained.length} unexplained`);
    console.log(`mutation score: ${((100 * killed) / (mutants.length - explained.length)).toFixed(1)}% of non-equivalent mutants killed`);
    if (explained.length) {
      console.log("\nReviewed equivalent survivors:");
      for (const m of explained) console.log(`  ${m.file}:${m.line} ${m.op}: ${m.to}\n      why: ${equivalentReason(m)}`);
    }
    if (unexplained.length) {
      fail = true;
      console.log("\nUNEXPLAINED SURVIVORS (the tests did not notice these changes):");
      for (const m of unexplained) console.log(`  #${m.id} ${m.file}:${m.line} ${m.op}\n      was: ${m.from}\n      now: ${m.to}`);
    }
    const unused = EQUIVALENT.filter(([text]) => !survivors.some((m) => m.to.includes(text)));
    if (unused.length) {
      fail = true;
      console.log("\nSTALE EQUIVALENT ENTRIES (no survivor matches, remove them):");
      for (const u of unused) console.log(`  ${u[0]}`);
    }
  } finally {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  }
  process.exitCode = fail ? 1 : 0;
  console.log(fail ? "\nMUTATION: FAIL" : "\nMUTATION: PASS");
}

main();
