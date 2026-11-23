"use client";

import { ArrowLeft, Download, MapPin, Printer, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { DATA, TOTAL } from "@/lib/data";
import { CLARITY_REFERENCE, FIT_GRADES, WORKED_EXAMPLES, explainFit, gradeDimension, gradeScale } from "@/lib/grading";
import { USCALES, justify, score, type Ranked, type Result } from "@/lib/scoring";
import { downloadText, useHydrated, useTest } from "@/lib/store";
import { Button, ConfirmButton, Shell, buttonClass } from "./ui";

const f1 = (x: number) => x.toFixed(1);
const bonus = (x: number) => `+${Number(x.toFixed(1))}`;
const SCALE_NAME = Object.fromEntries(DATA.scales.map((s) => [s.code, s]));
const POLE: Record<string, string> = {
  E: "Extraversion", I: "Introversion", S: "Sensing", N: "Intuition",
  T: "Thinking", F: "Feeling", J: "Judging", P: "Perceiving",
};

function timedScore(answers: Record<number, string>) {
  const t0 = performance.now();
  const result = score(answers);
  return { result, ms: performance.now() - t0 };
}

function place(r: Ranked) {
  return `${r.loc.name}, ${r.loc.city}, ${r.loc.state} ${r.loc.zip}`;
}

function summaryText(r: Result): string {
  const lines = [
    "The Personality-to-Place Inventory: results",
    `Type: ${r.type}-${r.identity} (${r.dims.map((d) => `${d.winner} ${d.band} ${d.winPct}%`).join(", ")})`,
    ...r.dims.map((d) => {
      const g = gradeDimension(d);
      return `  ${d.a}/${d.b}: ${g.grade} (${g.reference}). ${g.why}`;
    }),
    `Answered: ${r.answered} of ${TOTAL}`,
    `Place Profile: ${USCALES.map((s) => `${s} ${f1(r.score1[s])}`).join(", ")}`,
    `Career: ${r.career1 ?? "none"} / ${r.career2 ?? "none"}`,
    `Active tags: ${r.tags.join(", ") || "none"}`,
    `Dealbreakers: ${r.dbs.join(", ") || "none"}${r.relaxed.length ? ` (relaxed: ${r.relaxed.join(", ")})` : ""}`,
    `Priorities: ${r.pri1 ?? "none"} / ${r.pri2 ?? "none"}`,
    "",
    ...r.ranking.slice(0, 10).map(
      (x, i) =>
        `${i + 1}. ${place(x)}: grade ${explainFit(x, r).grade.grade} (${explainFit(x, r).grade.label}), Final Fit ${f1(x.total)} (Base ${f1(x.base)} + Career ${x.car} + Tags ${x.tag} + Affinity ${x.aff})`,
    ),
  ];
  return lines.join("\n");
}

function MatchCard({ r, rank, result }: { r: Ranked; rank: number; result: Result }) {
  const top = rank === 0;
  const fit = explainFit(r, result);
  return (
    <article className={`rounded-2xl border bg-card p-6 sm:p-7 ${top ? "border-accent" : "border-line"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-xs font-semibold tracking-wide uppercase ${top ? "text-accent" : "text-muted"}`}>
            {top ? "Top match" : `Runner-up ${rank}`}
          </p>
          <h3 className={`mt-1 font-display font-semibold ${top ? "text-3xl" : "text-2xl"}`}>{r.loc.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-muted">
            <MapPin size={15} aria-hidden />
            {r.loc.city}, {r.loc.state} {r.loc.zip}
          </p>
          <p className="mt-1 text-sm text-muted">
            {r.loc.region} · {r.loc.type}
          </p>
        </div>
        <div className="text-right">
          <p className={`font-display font-semibold tabular-nums ${top ? "text-5xl text-accent" : "text-4xl"}`}>
            {f1(r.total)}
          </p>
          <p className="text-xs text-muted">Final Fit</p>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-3" data-testid="fit-grade">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-display text-xl font-semibold text-accent-ink"
          aria-hidden
        >
          {fit.grade.grade}
        </span>
        <span>
          <span className="block font-semibold">
            Grade {fit.grade.grade}: {fit.grade.label}
          </span>
          <span className="block text-sm text-muted">
            Base Fit {f1(r.base)} is an average gap of {fit.avgGap.toFixed(2)} points per scale. Ranked {fit.rank} of {fit.of}.
          </span>
        </span>
      </p>
      <p className="mt-4 flex flex-wrap gap-2 text-xs">
        {[
          `Base ${f1(r.base)}`,
          `Career ${bonus(r.car)}`,
          `Tags ${bonus(r.tag)}`,
          `Affinity ${bonus(r.aff)}${r.why.length ? ` (${r.why.join(" ")})` : ""}`,
        ].map((t) => (
          <span key={t} className="rounded-full border border-line px-2.5 py-1 tabular-nums">
            {t}
          </span>
        ))}
      </p>
      <details className="mt-4" open={top}>
        <summary className="cursor-pointer text-sm font-medium text-accent">Why this grade</summary>
        <div className="mt-3 space-y-3 text-sm leading-relaxed">
          <p>
            <span className="font-medium">Reference: </span>
            <span className="text-muted">{fit.reference}</span>
          </p>
          {fit.costs.length > 0 && (
            <div>
              <p className="font-medium">Where it loses points ({f1(100 - r.base)} of 100 in total)</p>
              <ul className="mt-1 space-y-1 text-muted">
                {fit.costs.slice(0, 6).map((c) => (
                  <li key={c.scale} className="tabular-nums">
                    <span className="text-ink">{c.name}:</span> you {c.you}, place {c.place}. Gap {c.gap}
                    {c.weight !== 1 ? ` × weight ${c.weight}` : ""} costs {c.cost.toFixed(1)}.
                  </li>
                ))}
                {fit.costs.length > 6 && (
                  <li>
                    {fit.costs.length - 6} smaller gaps cost {fit.costs.slice(6).reduce((a, c) => a + c.cost, 0).toFixed(1)} more.
                  </li>
                )}
              </ul>
            </div>
          )}
          {fit.matched.length > 0 && (
            <p>
              <span className="font-medium">Exact matches (no points lost): </span>
              <span className="text-muted">{fit.matched.join(", ")}.</span>
            </p>
          )}
          <div>
            <p className="font-medium">Bonuses added on top of Base Fit</p>
            <ul className="mt-1 space-y-1 text-muted">
              {fit.bonuses.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>
      <details className="mt-3" open={top}>
        <summary className="cursor-pointer text-sm font-medium text-accent">Why this place</summary>
        <dl className="mt-3 space-y-2.5 text-sm leading-relaxed">
          {justify(r, result.U).map((j) => (
            <div key={j.label}>
              <dt className="inline font-medium">{j.label}: </dt>
              <dd className="inline text-muted">{j.text}</dd>
            </div>
          ))}
        </dl>
      </details>
    </article>
  );
}

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="mt-12 break-inside-avoid">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ResultsView() {
  const hydrated = useHydrated();
  const answers = useTest((s) => s.answers);
  const { result: r, ms } = useMemo(() => timedScore(answers), [answers]);

  if (!hydrated) {
    return (
      <main className="flex-1 py-12">
        <Shell wide>
          <div className="h-10 w-64 animate-pulse rounded bg-line/60" />
          <div className="mt-8 h-56 animate-pulse rounded-2xl bg-line/40" />
        </Shell>
      </main>
    );
  }

  if (r.answered === 0) {
    return (
      <main className="flex-1 py-20">
        <Shell>
          <h1 className="font-display text-3xl font-semibold">Nothing to score yet</h1>
          <p className="mt-3 text-muted">Answer some questions first, then come back here for your results.</p>
          <Link href="/test" className={buttonClass("primary", "mt-6")}>
            Start the test
          </Link>
        </Shell>
      </main>
    );
  }

  const missing = TOTAL - r.answered;
  const top3 = r.ranking.slice(0, 3);
  const pri1Scales = r.pri1 ? (DATA.priGroups[r.pri1] ?? []) : [];
  const sanity = top3[0] && pri1Scales.some((s) => top3[0].D[s as keyof typeof top3[0]["D"]] >= 6);

  return (
    <main className="flex-1 py-10 sm:py-14">
      <Shell wide>
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <Link href="/test" className={buttonClass("ghost", "-ml-3 px-3")}>
            <ArrowLeft size={16} aria-hidden /> Back to the questions
          </Link>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted">
            <Zap size={13} className="text-accent" aria-hidden />
            Scored {r.answered} answers against {DATA.locations.length} places in {ms < 1 ? "under 1" : Math.round(ms)} ms
          </p>
        </div>

        {missing > 0 && (
          <p className="mt-6 rounded-xl border border-warm/40 bg-warm-soft px-4 py-3 text-sm leading-relaxed">
            <strong>Partial result.</strong> {missing} of {TOTAL} questions are unanswered and were not scored. A scale
            with no answers sits at a neutral 5.0.{" "}
            <Link href="/test" className="font-medium underline">
              Keep answering
            </Link>{" "}
            and this page updates on its own.
          </p>
        )}

        <header className="mt-8">
          <p className="text-sm font-medium text-accent">Your type</p>
          <h1 className="mt-1 font-display text-6xl font-semibold tracking-tight sm:text-7xl">
            {r.type}
            <span className="text-muted">-{r.identity}</span>
          </h1>
          <p className="mt-3 text-muted">
            {r.dims.map((d) => `${d.winner} ${d.band} ${d.winPct}%`).join(", ")}. Identity:{" "}
            {r.identity === "A" ? "Assertive" : "Turbulent"} {r.identityPct}%.
          </p>
        </header>

        <div className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {r.dims.map((d) => (
            <div key={d.a}>
              <div className="flex justify-between text-sm">
                <span className={d.winner === d.a ? "font-semibold" : "text-muted"}>
                  {POLE[d.a]} {f1(d.pctA)}%
                </span>
                <span className={d.winner === d.b ? "font-semibold" : "text-muted"}>
                  {f1(100 - d.pctA)}% {POLE[d.b]}
                </span>
              </div>
              <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-line">
                <div className={d.winner === d.a ? "bg-accent" : "bg-muted/40"} style={{ width: `${d.pctA}%` }} />
                <div className={d.winner === d.b ? "bg-accent" : "bg-muted/40"} style={{ width: `${100 - d.pctA}%` }} />
              </div>
              {(() => {
                const g = gradeDimension(d);
                return (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted" data-testid="dim-grade">
                    <span className="font-semibold text-ink">Grade: {g.grade}.</span> {g.reference}. {g.meaning} {g.why}
                  </p>
                );
              })()}
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm leading-relaxed text-muted">
          {r.identity === "T"
            ? "Turbulent identity: look for stress-buffering features in a place, such as quiet, nature, and close community."
            : "Assertive identity: you tend to tolerate faster, higher-stakes environments well."}{" "}
          Identity is not used in location matching.
        </p>

        <Section
          title="Where you fit"
          note={`${r.survivors} of ${DATA.locations.length} places passed your dealbreakers and were ranked.`}
        >
          {r.relaxed.length > 0 && (
            <p className="mb-4 rounded-xl border border-warm/40 bg-warm-soft px-4 py-3 text-sm leading-relaxed">
              Fewer than three places passed all of your dealbreakers, so {r.relaxed.length === 1 ? "this one was" : "these were"}{" "}
              relaxed, in the order the method sets: <strong>{r.relaxed.join(", ")}</strong>.
            </p>
          )}
          {sanity && (
            <p className="mb-4 rounded-xl border border-line bg-card px-4 py-3 text-sm leading-relaxed text-muted">
              Sanity check: your top match is 6 or more points away from you on one of your first-priority scales. Read
              the runners-up carefully; a large single gap can hide behind a high average.
            </p>
          )}
          <div className="space-y-5">
            {top3.map((x, i) => (
              <MatchCard key={x.loc.zip} r={x} rank={i} result={r} />
            ))}
          </div>
          {r.ranking.length > 3 && (
            <details className="mt-5 rounded-2xl border border-line bg-card p-5">
              <summary className="cursor-pointer font-medium">Full ranking ({r.ranking.length} places)</summary>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm tabular-nums">
                  <thead className="text-xs text-muted">
                    <tr>
                      {["#", "Place", "ZIP", "Base", "Career", "Tags", "Affinity", "Final"].map((h) => (
                        <th key={h} className="px-2 py-1.5 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {r.ranking.map((x, i) => (
                      <tr key={x.loc.zip} className="border-t border-line">
                        <td className="px-2 py-1.5 text-muted">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          {x.loc.name}, {x.loc.city}, {x.loc.state}
                        </td>
                        <td className="px-2 py-1.5">{x.loc.zip}</td>
                        <td className="px-2 py-1.5">{f1(x.base)}</td>
                        <td className="px-2 py-1.5">{bonus(x.car)}</td>
                        <td className="px-2 py-1.5">{bonus(x.tag)}</td>
                        <td className="px-2 py-1.5">{bonus(x.aff)}</td>
                        <td className="px-2 py-1.5 font-semibold">{f1(x.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </Section>

        <Section
          title="Your Place Profile"
          note="Each scale is the average position of your answers from 0 to 10. Strong preferences (2 or less, 8 or more) and your priorities carry extra weight."
        >
          <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {USCALES.map((s) => {
              const info = SCALE_NAME[s];
              const g = gradeScale(s, r);
              const strong = g.strong;
              return (
                <div key={s}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{info.name}</span>
                    <span className="tabular-nums">
                      {r.max[s] === 0 ? <span className="text-muted">no answers · </span> : null}
                      {f1(r.score1[s])}
                      {r.weights[s] !== 1 && <span className="ml-1.5 text-xs text-accent">×{r.weights[s]} weight</span>}
                    </span>
                  </div>
                  <div className="relative mt-1.5 h-2 rounded-full bg-line">
                    <div
                      className={`h-full rounded-full ${strong ? "bg-accent" : "bg-accent/55"}`}
                      style={{ width: `${r.score1[s] * 10}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between gap-4 text-xs text-muted">
                    <span>{info.low}</span>
                    <span className="text-right">{info.high}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted" data-testid="scale-grade">
                    <span className="font-semibold text-ink">Grade: {g.grade}.</span> {g.why}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="What shaped the ranking">
          <dl className="grid gap-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium">Career ecosystem</dt>
              <dd className="mt-1 text-muted">
                {r.career1 ? (
                  <>
                    Top: {r.career1} ({DATA.careers[r.career1]}).{" "}
                    {r.career2 ? `Second: ${r.career2} (${DATA.careers[r.career2]}).` : "No second sector."}
                  </>
                ) : (
                  "No career questions answered."
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Active subculture tags</dt>
              <dd className="mt-1 text-muted">
                {r.tags.length
                  ? r.tags.map((t) => `${t} (${r.tagPts[t]} pts)`).join(", ")
                  : "None reached the 3-point threshold."}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Dealbreakers applied</dt>
              <dd className="mt-1 text-muted">
                {r.dbs.length ? (
                  <ul className="list-disc space-y-1 pl-5">
                    {r.dbs.map((d) => (
                      <li key={d} className={r.relaxed.includes(d) ? "line-through" : ""}>
                        {DATA.dbRules[d]}
                      </li>
                    ))}
                  </ul>
                ) : (
                  "None."
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Priorities</dt>
              <dd className="mt-1 text-muted">
                {r.pri1 ? `First: ${r.pri1} (weight ×2).` : "No first priority chosen."}{" "}
                {r.pri2 ? (r.pri2 === r.pri1 ? "Second is the same group, so only ×2 applies." : `Second: ${r.pri2} (weight ×1.5).`) : ""}
              </dd>
            </div>
          </dl>
        </Section>

        <Section
          title="How your grades are decided"
          note="Every grade on this page is measured against a fixed reference, then explained with your own numbers. Nothing is graded on a curve against other people."
        >
          <div className="grid gap-8 text-sm sm:grid-cols-2" data-testid="grade-reference">
            <div>
              <h3 className="font-semibold">Personality: clarity of each letter</h3>
              <p className="mt-1 text-muted">Reference: the clarity table in Step 1 of the scoring method.</p>
              <table className="mt-2 w-full text-left">
                <tbody>
                  {CLARITY_REFERENCE.map((c) => (
                    <tr key={c.band} className="border-t border-line align-top">
                      <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{c.band}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">
                        {c.from} to {c.to}%
                      </td>
                      <td className="py-1.5 text-muted">{c.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="font-semibold">Places: letter grade for fit</h3>
              <p className="mt-1 text-muted">
                Reference: the method says each point of weighted average distance costs 10 points of Base Fit. The
                letters are this app&apos;s plain-language names for that distance; they never change the ranking.
              </p>
              <table className="mt-2 w-full text-left">
                <tbody>
                  {FIT_GRADES.map((g, i) => (
                    <tr key={g.grade} className="border-t border-line align-top">
                      <td className="py-1.5 pr-3 font-medium whitespace-nowrap">
                        {g.grade} · {g.label}
                      </td>
                      <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">
                        {i === FIT_GRADES.length - 1 ? "under 60" : i === 0 ? "90 and up" : `${g.min} to ${g.min + 9.9}`}
                      </td>
                      <td className="py-1.5 text-muted">{g.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="font-semibold">Place Profile: level of each scale</h3>
              <p className="mt-1 text-muted">
                Reference: each scale&apos;s own end points (shown under every bar). Low is 0 to 3, middle is 4 to 6,
                high is 7 to 10. A score of 2 or less, or 8 or more, is a strong preference and weighs 1.5 times in
                matching.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Outside reference points</h3>
              <p className="mt-1 text-muted">Top matches of the three worked examples printed in the test document:</p>
              <ul className="mt-2 space-y-1 text-muted">
                {WORKED_EXAMPLES.map((w) => (
                  <li key={w.name} className="tabular-nums">
                    <span className="text-ink">
                      {w.name} ({w.type}):
                    </span>{" "}
                    {w.place}. Base Fit {f1(w.base)}, Final Fit {f1(w.final)}.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {r.narrative.length > 0 && (
          <Section
            title="Personality snapshot"
            note="These answers add no points. They describe how you lead, handle conflict, react under stress, and take in information."
          >
            <ul className="space-y-3 text-sm leading-relaxed">
              {r.narrative.map((x) => (
                <li key={x.n} className="break-inside-avoid">
                  <span className="text-muted">
                    Q{x.n}. {x.text}
                  </span>
                  <br />
                  <span className="font-medium">{x.answer}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="no-print mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-8">
          <Button variant="primary" onClick={() => window.print()}>
            <Printer size={16} aria-hidden /> Print or save as PDF
          </Button>
          <Button onClick={() => downloadText("personality-to-place-results.txt", summaryText(r), "text/plain")}>
            <Download size={16} aria-hidden /> Download summary
          </Button>
          <ConfirmButton confirmLabel="Yes, erase my answers" onConfirm={() => useTest.getState().reset()}>
            Start over
          </ConfirmButton>
        </div>

        <p className="mt-10 text-xs leading-relaxed text-muted">
          For fun and self-reflection only. Not a clinical, diagnostic, or scientifically validated instrument, and not
          the official Myers-Briggs Type Indicator. Location ratings are approximate editorial judgments, and ZIP codes
          mark the core of each neighborhood. Visit, research current costs and conditions, and talk to locals before
          making any real-life decision.
        </p>
      </Shell>
    </main>
  );
}
