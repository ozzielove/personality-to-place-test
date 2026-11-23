"use client";

import { Check, ChevronLeft, ChevronRight, LayoutGrid, Pause } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LETTERS, PARTS, TOTAL, question, subTitle, type Letter } from "@/lib/data";
import { answeredCount, firstUnanswered, useHydrated, useStorageStatus, useTest } from "@/lib/store";
import { PartsPanel } from "./PartsPanel";
import { Button, ProgressBar, Shell, StorageWarning, buttonClass } from "./ui";

const SECONDS_PER_QUESTION = 13; // 563 questions in roughly two hours

function timeLeft(remaining: number): string {
  const min = Math.round((remaining * SECONDS_PER_QUESTION) / 60);
  if (remaining === 0) return "all answered";
  if (min < 1) return "under a minute left";
  if (min < 60) return `about ${min} min left`;
  const h = Math.floor(min / 60);
  const m = Math.round((min % 60) / 5) * 5;
  return `about ${h} h${m ? ` ${m} min` : ""} left`;
}

export default function TestRunner() {
  const hydrated = useHydrated();
  const router = useRouter();
  const answers = useTest((s) => s.answers);
  const current = useTest((s) => s.current);
  const updatedAt = useTest((s) => s.updatedAt);
  const storageOk = useStorageStatus((s) => s.ok);
  const [review, setReview] = useState(false);
  const [panel, setPanel] = useState(false);
  const [dir, setDir] = useState(1);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = question(current);
  const part = PARTS[q.p];
  const chosen = answers[current];
  const done = answeredCount(answers);

  const move = useCallback((n: number) => {
    if (advance.current) clearTimeout(advance.current);
    if (n < 1) return;
    if (n > TOTAL) {
      setReview(true);
      return;
    }
    setDir(n >= useTest.getState().current ? 1 : -1);
    setReview(false);
    useTest.getState().goTo(n);
  }, []);

  const choose = useCallback(
    (letter: Letter) => {
      const s = useTest.getState();
      const n = s.current;
      s.setAnswer(n, letter);
      if (advance.current) clearTimeout(advance.current);
      // short pause so the choice is visible before the next question slides in
      if (s.autoAdvance) advance.current = setTimeout(() => move(n + 1), 260);
    },
    [move],
  );

  useEffect(() => () => void (advance.current && clearTimeout(advance.current)), []);

  // Keyboard: A to E or 1 to 5 answers, arrows move, Enter goes forward.
  useEffect(() => {
    if (!hydrated || panel || review) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      const s = useTest.getState();
      const count = question(s.current).o.length;
      const k = e.key.toLowerCase();
      const idx = k >= "1" && k <= "5" ? Number(k) - 1 : k.length === 1 && k >= "a" && k <= "e" ? k.charCodeAt(0) - 97 : -1;
      if (idx >= 0 && idx < count) {
        e.preventDefault();
        choose(LETTERS[idx]);
      } else if (e.key === "ArrowLeft") {
        move(s.current - 1);
      } else if (e.key === "ArrowRight") {
        move(s.current + 1);
      } else if (e.key === "Enter" && el?.tagName !== "BUTTON" && el?.tagName !== "A") {
        move(s.current + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hydrated, panel, review, choose, move]);

  const header = (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <Shell>
        <div className="flex items-center gap-3 py-3">
          <Link href="/" className={buttonClass("ghost", "-ml-3 px-3")} title="Your answers are saved. Come back any time.">
            <Pause size={16} aria-hidden /> Pause
          </Link>
          <div className="min-w-0 flex-1 text-center text-sm text-muted" aria-live="polite">
            {hydrated && (
              <>
                <span className="font-medium text-ink tabular-nums">
                  {done} of {TOTAL}
                </span>{" "}
                answered
                <span className="hidden sm:inline"> · {timeLeft(TOTAL - done)}</span>
              </>
            )}
          </div>
          <Button variant="ghost" className="-mr-3 px-3" onClick={() => setPanel(true)}>
            <LayoutGrid size={16} aria-hidden /> Parts
          </Button>
        </div>
      </Shell>
      <ProgressBar value={hydrated ? done : 0} max={TOTAL} className="rounded-none" />
    </header>
  );

  if (!hydrated) {
    return (
      <>
        {header}
        <main className="flex-1 py-10">
          <Shell>
            <div className="h-6 w-40 animate-pulse rounded bg-line/60" />
            <div className="mt-6 h-20 animate-pulse rounded-xl bg-line/60" />
            <div className="mt-6 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-line/40" />
              ))}
            </div>
          </Shell>
        </main>
      </>
    );
  }

  const unanswered: number[] = [];
  if (review) for (let n = 1; n <= TOTAL; n++) if (!(n in answers)) unanswered.push(n);

  return (
    <>
      {header}
      <main className="flex-1 py-8 sm:py-12">
        <Shell>
          <StorageWarning className="mb-6" />
          {review ? (
            <section aria-labelledby="review-title">
              <h1 id="review-title" className="font-display text-3xl font-semibold">
                {unanswered.length === 0 ? "All 563 answered" : "Ready to score?"}
              </h1>
              <p className="mt-3 leading-relaxed text-muted">
                {unanswered.length === 0
                  ? "Every question has an answer. Scoring takes a few milliseconds."
                  : `You answered ${done} of ${TOTAL}. The ${unanswered.length} unanswered ${
                      unanswered.length === 1 ? "question is" : "questions are"
                    } simply not scored, so you can score now or go back and fill them in.`}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  className="px-7 py-3 text-base"
                  disabled={done === 0}
                  onClick={() => {
                    useTest.getState().finish();
                    router.push("/results");
                  }}
                >
                  Score my test <ChevronRight size={18} aria-hidden />
                </Button>
                {unanswered.length > 0 && (
                  <Button onClick={() => move(firstUnanswered(answers, 1) ?? TOTAL)}>Go to first unanswered</Button>
                )}
                <Button variant="ghost" onClick={() => move(current)}>
                  Back to question {current}
                </Button>
              </div>
              {unanswered.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-sm font-medium text-muted">Unanswered questions</h2>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {unanswered.map((n) => (
                      <button
                        key={n}
                        onClick={() => move(n)}
                        className="rounded-md border border-line bg-card px-2 py-1 text-xs tabular-nums hover:border-accent"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <>
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.section
                  key={current}
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -24 }}
                  transition={{ duration: 0.14 }}
                  aria-labelledby="question-text"
                >
                  <p className="text-xs font-medium tracking-wide text-accent uppercase">
                    {part.label} · {part.name}
                  </p>
                  <p className="mt-1 text-sm text-muted">{subTitle(q)}</p>

                  {q.n === part.start && part.intro && (
                    <p className="mt-5 rounded-xl border border-line bg-card p-4 text-sm leading-relaxed text-muted">
                      {part.intro}
                    </p>
                  )}

                  <h1 id="question-text" className="mt-6 font-display text-2xl leading-snug font-medium sm:text-[1.7rem]">
                    <span className="mr-2 align-middle font-sans text-sm font-semibold text-muted tabular-nums">
                      {q.n}.
                    </span>
                    {q.t}
                  </h1>

                  <div role="radiogroup" aria-labelledby="question-text" className="mt-6 space-y-3">
                    {q.o.map((text, i) => {
                      const letter = LETTERS[i];
                      const on = chosen === letter;
                      return (
                        <button
                          key={letter}
                          role="radio"
                          aria-checked={on}
                          onClick={() => choose(letter)}
                          className={`flex w-full items-start gap-4 rounded-xl border px-4 py-3.5 text-left leading-relaxed transition ${
                            on ? "border-accent bg-accent-soft" : "border-line bg-card hover:border-accent"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                              on ? "bg-accent text-accent-ink" : "border border-line text-muted"
                            }`}
                            aria-hidden
                          >
                            {on ? <Check size={15} /> : letter}
                          </span>
                          <span>
                            <span className="sr-only">{letter}. </span>
                            {text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.section>
              </AnimatePresence>

              <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Question navigation">
                <Button onClick={() => move(current - 1)} disabled={current === 1}>
                  <ChevronLeft size={16} aria-hidden /> Back
                </Button>
                {chosen && (
                  <Button variant="ghost" onClick={() => useTest.getState().clearAnswer(current)}>
                    Clear answer
                  </Button>
                )}
                <Button variant={chosen ? "primary" : "secondary"} onClick={() => move(current + 1)}>
                  {current === TOTAL ? "Finish" : chosen ? "Next" : "Skip"} <ChevronRight size={16} aria-hidden />
                </Button>
              </nav>

              <p className="mt-8 flex flex-wrap items-center justify-center gap-x-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <Check size={13} className="text-accent" aria-hidden />
                  {!storageOk
                    ? "Not saved: this browser is blocking storage"
                    : updatedAt
                    ? `Saved in this browser at ${new Date(updatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
                    : "Answers save automatically in this browser"}
                </span>
                <span className="hidden sm:inline">· Keys: A to E answer, arrows move</span>
              </p>
            </>
          )}
        </Shell>
      </main>

      <PartsPanel
        open={panel}
        onClose={() => setPanel(false)}
        onJump={(n) => {
          setPanel(false);
          move(n);
        }}
        onReview={() => {
          setPanel(false);
          setReview(true);
        }}
      />
    </>
  );
}
