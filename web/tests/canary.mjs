// Canaries: quick checks that the guard rails themselves still work.
//
//   node tests/canary.mjs                      local canaries
//   node tests/canary.mjs https://your.site    local canaries + smoke test of a running site
//
//  1. Drift      the committed web data is exactly what the Python sources produce today
//  2. Known      the three published worked examples still come out as printed
//  3. Planted    deliberately corrupted data makes the test suite FAIL (if it passes, the tests are blind)
//  4. Live       (with a URL) every page answers, and the shipped bundle really contains the questions
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(WEB, "..");
const VITEST = path.join(WEB, "node_modules/vitest/vitest.mjs");
const base = process.argv[2]?.replace(/\/$/, "");
let failed = 0;
const report = (ok, name, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
};
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const tmp = (tag) => fs.mkdtempSync(path.join(os.tmpdir(), `p2p-canary-${tag}-`));

function vitest(cwd, extra = []) {
  const r = spawnSync(process.execPath, [VITEST, "run", "--reporter=dot", ...extra], { cwd, encoding: "utf8", timeout: 180000, env: { ...process.env, CI: "1" } });
  return { passed: r.status === 0, out: (r.stdout + r.stderr).slice(-600) };
}

// ---- 1. drift
{
  const out = tmp("drift");
  try {
    execFileSync("python3", [path.join(ROOT, "build/export_web.py")], { env: { ...process.env, P2P_WEB_OUT: out }, stdio: "pipe", timeout: 120000 });
    for (const f of ["data/test-data.json", "tests/fixtures.json"]) {
      const same = sha(path.join(out, f)) === sha(path.join(WEB, f));
      report(same, `drift: ${f} matches a fresh export from src/ and build/`, same ? sha(path.join(WEB, f)).slice(0, 12) : "stale: run `npm run data`");
    }
  } catch (e) {
    report(false, "drift: python3 build/export_web.py runs", String(e.message).slice(0, 200));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
}

// ---- 2. known answers
{
  const r = vitest(WEB, ["-t", "worked examples from the document"]);
  report(r.passed, "known answers: Maya, Daniel and Jordan score as published", r.passed ? "" : r.out);
}

// ---- 3. planted faults: each must make the suite fail
{
  const dir = tmp("planted");
  try {
    for (const d of ["lib", "tests", "data"]) fs.mkdirSync(path.join(dir, d));
    fs.symlinkSync(path.join(WEB, "node_modules"), path.join(dir, "node_modules"));
    for (const f of ["vitest.config.mts", "package.json", "lib/data.ts", "lib/scoring.ts", "tests/scoring.test.ts", "tests/fixtures.json"]) {
      fs.copyFileSync(path.join(WEB, f), path.join(dir, f));
    }
    const original = fs.readFileSync(path.join(WEB, "data/test-data.json"), "utf8");
    const dataFile = path.join(dir, "data/test-data.json");
    const plant = (name, edit) => {
      const d = JSON.parse(original);
      edit(d);
      fs.writeFileSync(dataFile, JSON.stringify(d));
      const r = vitest(dir);
      report(!r.passed, `planted fault is caught: ${name}`, r.passed ? "TESTS PASSED ON CORRUPT DATA" : "");
    };
    // control: untouched data must pass, or the three results below mean nothing
    fs.writeFileSync(dataFile, original);
    const control = vitest(dir);
    report(control.passed, "control: the copy with untouched data passes", control.passed ? "" : control.out);
    plant("one personality key flipped (Q1, option A, 2 points moved to the other pole)", (d) => {
      const cell = d.questions[0].m.A;
      cell[0] = cell[0] === "E" ? "I" : "E";
    });
    plant("one place rating changed by 1 (first location, WALK)", (d) => {
      d.locations[0].s.WALK += d.locations[0].s.WALK >= 10 ? -1 : 1;
    });
    plant("one place-fit key changed (first scored scale value in Part VI onward, +1)", (d) => {
      const q = d.questions.find((x) => x.s);
      const sc = Object.keys(q.s)[0];
      const L = Object.keys(q.s[sc]).find((k) => q.s[sc][k] !== null);
      q.s[sc][L] += 1;
    });
    plant("a question deleted (562 instead of 563)", (d) => {
      d.questions.pop();
    });
    plant("relax order changed (first two dealbreakers swapped)", (d) => {
      [d.relaxOrder[0], d.relaxOrder[1]] = [d.relaxOrder[1], d.relaxOrder[0]];
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---- 4. live site
if (base) {
  const get = async (p) => {
    const r = await fetch(base + p, { redirect: "follow" });
    return { status: r.status, text: await r.text() };
  };
  try {
    let home = "";
    for (const p of ["/", "/test", "/results"]) {
      const r = await get(p);
      if (p === "/") home = r.text;
      report(r.status === 200 && /Personality-to-Place/.test(r.text), `live: ${p} answers 200 with the app's title`, `status ${r.status}`);
    }
    report((await get("/definitely-not-a-page")).status === 404, "live: an unknown page answers 404");
    // the questions ship inside a script bundle; make sure the real data is in what was deployed
    const testHtml = (await get("/test")).text;
    const scripts = [...new Set([...(home + testHtml).matchAll(/["'(]((?:\/_next\/)[^"')]+\.js)/g)].map((m) => m[1]))];
    const data = JSON.parse(fs.readFileSync(path.join(WEB, "data/test-data.json"), "utf8"));
    const needles = [data.questions[0].t.slice(0, 40), data.questions[562].t.slice(0, 40), data.locations[72].desc.slice(0, 40)];
    const found = new Set();
    for (const s of scripts) {
      const r = await get(s);
      // inside a bundle the text sits in a JS string, so quotes are escaped
      const body = r.text.replace(/\\(["'])/g, "$1");
      needles.forEach((n, i) => body.includes(n) && found.add(i));
      if (found.size === needles.length) break;
    }
    report(found.size === needles.length, "live: the deployed bundle contains question 1, question 563, and the last location", `${found.size}/3 found in ${scripts.length} scripts`);
  } catch (e) {
    report(false, `live: ${base} is reachable`, String(e.message).slice(0, 200));
  }
} else {
  console.log("SKIP  live site checks (pass a URL to run them)");
}

console.log(failed ? `\nCANARIES: FAIL (${failed})` : "\nCANARIES: PASS");
process.exit(failed ? 1 : 0);
