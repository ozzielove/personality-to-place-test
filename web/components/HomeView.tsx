"use client";

import { ArrowRight, Clock, MapPin, Save, Zap } from "lucide-react";
import Link from "next/link";
import { PARTS, TOTAL, question } from "@/lib/data";
import { answeredCount, useHydrated, useTest } from "@/lib/store";
import { BackupControls } from "./BackupControls";
import { ConfirmButton, ProgressBar, Shell, StorageWarning, buttonClass } from "./ui";

function when(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function HomeView() {
  const hydrated = useHydrated();
  const answers = useTest((s) => s.answers);
  const current = useTest((s) => s.current);
  const updatedAt = useTest((s) => s.updatedAt);
  const finishedAt = useTest((s) => s.finishedAt);
  const done = answeredCount(answers);
  const inProgress = hydrated && done > 0;
  const part = PARTS[question(current).p];

  return (
    <main className="flex-1 py-12 sm:py-20">
      <Shell>
        <p className="flex items-center gap-2 text-sm font-medium text-accent">
          <MapPin size={16} aria-hidden /> {TOTAL} questions, 73 places, one best fit
        </p>
        <h1 className="mt-4 font-display text-4xl leading-tight font-semibold sm:text-5xl">
          The Personality-to-Place Inventory
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          A personality test that keeps going after the four letters. It ends with the U.S. city, ZIP code, and
          neighborhood where your personality has the best chance to thrive, plus two runners-up.
        </p>

        <StorageWarning className="mt-8" />

        <section className="mt-10 rounded-2xl border border-line bg-card p-6 sm:p-8" aria-live="polite">
          {!hydrated ? (
            <div className="h-28 animate-pulse rounded-xl bg-line/50" aria-label="Loading saved progress" />
          ) : inProgress ? (
            <>
              <h2 className="font-display text-2xl font-semibold">
                {finishedAt ? "Your test is scored" : "Welcome back"}
              </h2>
              <p className="mt-2 text-muted">
                {done} of {TOTAL} answered. You stopped at question {current} ({part.label}: {part.name}).
                {updatedAt ? ` Last saved ${when(updatedAt)}.` : ""}
              </p>
              <ProgressBar value={done} max={TOTAL} className="mt-4" />
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/test" className={buttonClass("primary")}>
                  {finishedAt ? "Review answers" : "Resume the test"} <ArrowRight size={16} aria-hidden />
                </Link>
                <Link href="/results" className={buttonClass("secondary")}>
                  {finishedAt ? "See my results" : "Score what I have so far"}
                </Link>
                <ConfirmButton confirmLabel="Yes, erase my answers" onConfirm={() => useTest.getState().reset()}>
                  Start over
                </ConfirmButton>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-semibold">Ready when you are</h2>
              <p className="mt-2 text-muted">
                Answer for the version of you that shows up on an ordinary week. You can skip any question, and
                skipped questions are not scored.
              </p>
              <div className="mt-6">
                <Link href="/test" className={buttonClass("primary", "px-7 py-3 text-base")}>
                  Start the test <ArrowRight size={18} aria-hidden />
                </Link>
              </div>
            </>
          )}
        </section>

        <ul className="mt-10 grid gap-5 sm:grid-cols-3">
          {[
            { icon: Clock, title: "90 to 150 minutes", text: "Fifteen parts. Take it in as many sittings as you like." },
            { icon: Save, title: "Saves as you go", text: "Every answer is saved in this browser the moment you pick it. Close the tab and come back." },
            { icon: Zap, title: "Scored instantly", text: "The full scoring method runs in your browser in a few milliseconds. Nothing is uploaded." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <Icon size={20} className="text-accent" aria-hidden />
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ul>

        <section className="mt-12 border-t border-line pt-8">
          <h2 className="font-semibold">Move your progress to another device</h2>
          <p className="mt-1 mb-4 text-sm leading-relaxed text-muted">
            Progress is stored in this browser only. To continue on another device, or to keep a copy, download a
            backup file here and restore it there.
          </p>
          <BackupControls />
        </section>

        <p className="mt-12 text-xs leading-relaxed text-muted">
          For fun and self-reflection only. This is not a clinical, diagnostic, or scientifically validated
          instrument. It is not the official Myers-Briggs Type Indicator and is not affiliated with The
          Myers-Briggs Company. Location ratings are approximate editorial judgments. Visit, research current costs
          and conditions, and talk to locals before making any real-life decision.
        </p>
      </Shell>
    </main>
  );
}
