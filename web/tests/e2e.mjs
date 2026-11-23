// End-to-end test with Playwright: a real browser, real clicks, real saved progress.
// It drives a running copy of the app (local or deployed) through the whole journey:
// start, answer, skip, pause, resume, jump, back up, restore, finish, score, and read the grades.
//
//   npm run e2e                          against http://localhost:3000 (run `npm run build && npm start` first)
//   npm run e2e -- https://your.site     against a deployed site
//
// Uses the Google Chrome already installed on this machine (set E2E_CHANNEL=chromium after
// `npx playwright install chromium` to use Playwright's own browser instead).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = (process.argv[2] || process.env.BASE || "http://localhost:3000").replace(/\/$/, "");
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), "p2p-e2e-"));
fs.mkdirSync(OUT, { recursive: true });
const fixtures = JSON.parse(fs.readFileSync(path.join(HERE, "fixtures.json"), "utf8"));
const FIT = [["A", 90], ["B", 80], ["C", 70], ["D", 60], ["F", -Infinity]];
const fitGrade = (base) => FIT.find(([, min]) => Number(base.toFixed(1)) >= min)[0];
const KEY = "personality-to-place:v1";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  [" + detail + "]" : ""}`);
};

(async () => {
  const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const problems = [];
  page.on("console", (m) => { if (m.type() === "error" || /hydrat/i.test(m.text())) problems.push(m.text().slice(0, 300)); });
  page.on("pageerror", (e) => problems.push("pageerror: " + String(e).slice(0, 300)));

  // 1. Home, fresh visitor
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  check("home shows the start button", await page.getByRole("link", { name: /Start the test/ }).isVisible());
  await page.screenshot({ path: OUT + "/01-home.png" });

  // 2. Start, answer by click, auto-advance
  await page.getByRole("link", { name: /Start the test/ }).click();
  await page.waitForURL("**/test");
  await page.getByRole("radiogroup").waitFor();
  const q1 = await page.locator("#question-text").innerText();
  check("question 1 is shown", /^1\./.test(q1.trim()), q1.slice(0, 50));
  check("part intro is shown on the first question of a part", await page.getByText(/where your attention naturally flows/).isVisible());
  await page.getByRole("radio").nth(1).click(); // Q1 = B
  await page.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("2."));
  check("auto-advances to question 2 after a click", true);

  // 3. Keyboard answers
  await page.keyboard.press("d"); // Q2 = D
  await page.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("3."));
  await page.keyboard.press("1"); // Q3 = A
  await page.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("4."));
  check("keyboard answers work (letter and number keys)", true);

  // 4. Skip and back
  await page.getByRole("button", { name: /Skip/ }).click(); // skip Q4
  await page.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("5."));
  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("4."));
  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("3."));
  check("going back shows the saved answer selected", (await page.getByRole("radio", { checked: true }).count()) === 1);
  await page.screenshot({ path: OUT + "/02-question.png" });

  let saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  check("answers are in localStorage", JSON.stringify(saved.state.answers) === JSON.stringify({ 1: "B", 2: "D", 3: "A" }), JSON.stringify(saved.state.answers));
  check("header counts 3 answered", await page.getByText("3 of 563").isVisible());

  // 5. Pause: hard reload, then a brand new tab in the same browser
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("3."));
  check("reload resumes on the same question with answers intact", await page.getByText("3 of 563").isVisible());
  await page.getByRole("link", { name: /Pause/ }).click();
  await page.waitForURL(BASE + "/");
  check("home offers to resume", await page.getByRole("link", { name: /Resume the test/ }).isVisible());
  check("home says where you stopped", await page.getByText(/You stopped at question 3/).isVisible());
  await page.screenshot({ path: OUT + "/03-home-resume.png" });
  const page2 = await ctx.newPage();
  await page2.goto(BASE + "/test", { waitUntil: "networkidle" });
  await page2.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("3."));
  check("a new tab resumes at question 3", true);
  await page2.close();

  // 6. Parts panel: jump
  await page.getByRole("link", { name: /Resume the test/ }).click();
  await page.waitForURL("**/test");
  await page.getByRole("button", { name: /Parts/ }).click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({ path: OUT + "/04-parts.png" });
  check("panel lists 15 parts", (await page.getByRole("dialog").locator("li").count()) === 15);
  await page.getByRole("button", { name: /Go to first unanswered \(Q4\)/ }).click();
  await page.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("4."));
  check("jump to first unanswered goes to the skipped question 4", true);
  await page.getByRole("button", { name: /Parts/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Part XV/ }).click();
  await page.getByRole("button", { name: "Question 563, not answered" }).click();
  await page.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("563."));
  check("jump to question 563 through the panel", true);

  // 7. Backup download, then start over, then restore
  await page.getByRole("button", { name: /Parts/ }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download backup/ }).click()]);
  const backupPath = OUT + "/backup.json";
  await dl.saveAs(backupPath);
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  check("backup file holds the answers", backup.app === "personality-to-place" && Object.keys(backup.answers).length === 3);
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: /Pause/ }).click();
  await page.waitForURL(BASE + "/");
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: /Yes, erase my answers/ }).click();
  await page.getByRole("link", { name: /Start the test/ }).waitFor();
  check("start over needs a second click and clears progress", true);
  await page.locator('input[type="file"]').setInputFiles(backupPath);
  await page.getByText("Restored 3 answers.").waitFor();
  check("restore from backup brings the answers back", await page.getByRole("link", { name: /Resume the test/ }).isVisible());
  fs.writeFileSync(OUT + "/bad.json", '{"hello":1}');
  await page.locator('input[type="file"]').setInputFiles(OUT + "/bad.json");
  check("a wrong file is refused with a message", await page.getByText(/not a Personality-to-Place progress backup/).isVisible());
  check("a wrong file does not wipe progress", await page.getByRole("link", { name: /Resume the test/ }).isVisible());

  // 8. Partial scoring
  await page.goto(BASE + "/results", { waitUntil: "networkidle" });
  check("partial results show a warning", await page.getByText(/Partial result/).isVisible());

  // 9. Full sheets: load each fixture's answers the way the app stores them, compare the page with Python
  for (const name of ["all A", "all last", "random 0", "random 7", "every dealbreaker"]) {
    const c = fixtures.cases.find((x) => x.name === name || x.name.startsWith(name + " "));
    await page.evaluate(([k, answers]) => {
      localStorage.setItem(k, JSON.stringify({ state: { answers, current: 563, startedAt: 1, updatedAt: 2, finishedAt: null, autoAdvance: true }, version: 1 }));
    }, [KEY, c.answers]);
    await page.goto(BASE + "/results", { waitUntil: "networkidle" });
    await page.locator("h1").waitFor();
    const h1 = (await page.locator("h1").innerText()).trim();
    const topZip = (await page.locator("article").first().innerText()).match(/\b\d{5}\b/)?.[0];
    const topScore = (await page.locator("article").first().locator("p.font-display").innerText()).trim();
    const e = c.expect;
    check(`results page matches Python for "${c.name}"`,
      h1 === `${e.type}-${e.identity}` && topZip === e.ranking[0].zip && topScore === e.ranking[0].total.toFixed(1),
      `${h1} ${topZip} ${topScore} vs ${e.type}-${e.identity} ${e.ranking[0].zip} ${e.ranking[0].total.toFixed(1)}`);
    if (name === "every dealbreaker") check("relaxed dealbreakers are disclosed", await page.getByText(/relaxed, in the order the method sets/).isVisible());
    // reference-based grading: grade first, then the reference, then the why
    const gradeText = (await page.getByTestId("fit-grade").first().innerText()).replace(/\s+/g, " ");
    const want = fitGrade(e.ranking[0].base);
    check(`top match is graded ${want} from its Base Fit for "${c.name}"`, gradeText.includes(`Grade ${want}:`) && gradeText.includes(`Base Fit ${e.ranking[0].base.toFixed(1)}`), gradeText.slice(0, 90));
    if (name === "all A") {
      const card = page.locator("article").first();
      const why = (await card.innerText()).replace(/\s+/g, " ");
      check("the grade cites its reference", new RegExp(`Reference: ${want} is a Base Fit of`).test(why));
      check("the grade explains where points were lost and which bonuses applied", /Where it loses points \(/.test(why) && /Bonuses added on top of Base Fit/.test(why) && /Career \+/.test(why) && /Tags \+/.test(why));
      const lost = [...why.matchAll(/costs (\d+\.\d)\./g)].map((m) => Number(m[1]));
      const more = why.match(/smaller gaps cost (\d+\.\d) more/);
      const sum = lost.reduce((a, b) => a + b, 0) + (more ? Number(more[1]) : 0);
      check("listed point losses add up to 100 minus Base Fit (within display rounding)", Math.abs(sum - (100 - e.ranking[0].base)) < 0.5, `${sum.toFixed(1)} vs ${(100 - e.ranking[0].base).toFixed(1)}`);
      check("all four letters carry a grade, a reference range, and the arithmetic", (await page.getByTestId("dim-grade").count()) === 4 && /Grade: (Slight|Moderate|Clear|Very Clear)\. .* is \d+ to \d+%\. .* 100 × \d+ ÷ \d+ = /.test((await page.getByTestId("dim-grade").first().innerText()).replace(/\s+/g, " ")));
      const dimWant = e.bands.join(",");
      const dimGot = (await page.getByTestId("dim-grade").allInnerTexts()).map((t) => t.match(/Grade: ([A-Za-z ]+)\./)[1]).join(",");
      check("letter grades match Python's clarity bands", dimGot === dimWant, `${dimGot} vs ${dimWant}`);
      check("all 20 scales carry a grade and the arithmetic", (await page.getByTestId("scale-grade").count()) === 20 && /Grade: (Low|Middle|High)(, strong)?\. Your answers earned \d+ of \d+ possible points/.test(await page.getByTestId("scale-grade").first().innerText()));
      const ref = (await page.getByTestId("grade-reference").innerText()).replace(/\s+/g, " ");
      check("the reference tables are on the page (clarity bands, fit letters, worked examples)", /Very Clear 81 to 100%/.test(ref) && /A · Excellent fit 90 and up/.test(ref) && /Maya \(INFP-T\)/.test(ref) && /Base Fit 90\.1, Final Fit 101\.1/.test(ref), ref.slice(0, 80));
    }
  }
  const speed = await page.getByText(/Scored \d+ answers against 73 places in/).innerText();
  check("scoring time is shown", true, speed.trim());
  await page.screenshot({ path: OUT + "/05-results.png", fullPage: true });

  // 10. Finish flow through the UI: last question -> review -> score
  await page.goto(BASE + "/test", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("563."));
  await page.getByRole("button", { name: /Finish/ }).click();
  await page.getByRole("button", { name: /Score my test/ }).waitFor();
  await page.screenshot({ path: OUT + "/06-review.png" });
  await page.getByRole("button", { name: /Score my test/ }).click();
  await page.waitForURL("**/results");
  await page.locator("article").first().waitFor();
  check("finish, review, score leads to results", true);
  saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  check("finishing is remembered", typeof saved.state.finishedAt === "number");

  // 10b. Things that go wrong in real browsers
  await page.evaluate((k) => localStorage.setItem(k, "{{{ this is not json"), KEY);
  await page.goto(BASE + "/test", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("1."), null, { timeout: 8000 }).catch(() => {});
  check("a damaged save does not hang the app: it starts clean at question 1", ((await page.locator("#question-text").innerText().catch(() => "")).trim()).startsWith("1."));
  check("the damaged save is kept aside for recovery", (await page.evaluate((k) => localStorage.getItem(k + ":damaged"), KEY)) === "{{{ this is not json");
  await page.evaluate((k) => {
    localStorage.setItem(k, JSON.stringify({ state: { answers: { 1: "Z", 2: "B", 3: "E", 9999: "A", "-4": "A", 5: 7 }, current: 99999, startedAt: "x", autoAdvance: true }, version: 1 }));
  }, KEY);
  await page.goto(BASE + "/test", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("563."), null, { timeout: 8000 }).catch(() => {});
  check("a hand-edited save is cleaned: impossible answers dropped, position clamped", (await page.getByText("1 of 563").isVisible()) && (await page.locator("#question-text").innerText()).trim().startsWith("563."));
  await page.goto(BASE + "/results", { waitUntil: "networkidle" });
  check("results still render from a cleaned save", await page.getByText(/Partial result/).isVisible());
  const seen = problems.length;
  const nf = await page.goto(BASE + "/no-such-page", { waitUntil: "networkidle" });
  check("an unknown address shows a friendly 404 with a way back", nf.status() === 404 && (await page.getByRole("link", { name: /Go to the start page/ }).isVisible()));
  // the browser logs the 404 response itself as a failed resource; that one line is expected, anything else is not
  const from404 = problems.splice(seen);
  check("the 404 page logs nothing beyond the 404 itself", from404.every((t) => /status of 404/.test(t)), from404.join(" | "));

  const blocked = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await blocked.addInitScript(() => {
    const deny = () => { throw new DOMException("denied", "SecurityError"); };
    Storage.prototype.getItem = deny;
    Storage.prototype.setItem = deny;
    Storage.prototype.removeItem = deny;
  });
  const bp = await blocked.newPage();
  const bErrors = [];
  bp.on("pageerror", (e) => bErrors.push(String(e).slice(0, 200)));
  await bp.goto(BASE + "/test", { waitUntil: "networkidle" });
  await bp.getByRole("radiogroup").waitFor({ timeout: 8000 }).catch(() => {});
  check("with storage blocked the test still loads", await bp.getByRole("radiogroup").isVisible());
  await bp.getByRole("radio").first().click();
  await bp.waitForFunction(() => document.querySelector("#question-text")?.textContent?.trim().startsWith("2."), null, { timeout: 8000 }).catch(() => {});
  check("with storage blocked you can still answer", (await bp.locator("#question-text").innerText()).trim().startsWith("2."));
  check("with storage blocked a clear warning says progress is not being saved", await bp.getByRole("alert").filter({ hasText: "not saving your progress" }).isVisible());
  check("with storage blocked nothing crashes", bErrors.length === 0, bErrors.join(" | "));
  await blocked.close();

  if (!/localhost|127\.0\.0\.1/.test(BASE)) {
    const h = (await page.request.get(BASE + "/")).headers();
    check("security headers are served (nosniff, frame deny, referrer policy, HSTS)",
      h["x-content-type-options"] === "nosniff" && h["x-frame-options"] === "DENY" && Boolean(h["referrer-policy"]) && Boolean(h["strict-transport-security"]),
      JSON.stringify({ n: h["x-content-type-options"], f: h["x-frame-options"], r: h["referrer-policy"] }));
    const icon = await page.request.get(BASE + "/icon.svg");
    check("the site icon is served", icon.status() === 200);
  }

  // 11. Phone size
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const m = await phone.newPage();
  await m.goto(BASE + "/test", { waitUntil: "networkidle" });
  await m.getByRole("radiogroup").waitFor();
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("no sideways scroll on a phone (test)", !overflow);
  await m.screenshot({ path: OUT + "/07-phone-question.png" });
  await m.evaluate(([k, answers]) => localStorage.setItem(k, JSON.stringify({ state: { answers, current: 1, startedAt: 1, updatedAt: 2, finishedAt: 3, autoAdvance: true }, version: 1 })), [KEY, fixtures.cases[8].answers]);
  await m.goto(BASE + "/results", { waitUntil: "networkidle" });
  await m.locator("article").first().waitFor();
  check("no sideways scroll on a phone (results)", !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await m.screenshot({ path: OUT + "/08-phone-results.png" });

  check("no console errors or hydration warnings", problems.length === 0, problems.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed  (screenshots in ${OUT})`);
  console.log(failed ? "E2E: FAIL" : "E2E: PASS");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH " + (e.stack || e).toString().slice(0, 1500)); process.exit(2); });
