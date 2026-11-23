"use client";

import { ChevronDown, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { PARTS, TOTAL, question } from "@/lib/data";
import { answeredCount, firstUnanswered, useTest } from "@/lib/store";
import { BackupControls } from "./BackupControls";
import { Button, ProgressBar } from "./ui";

export function PartsPanel({
  open,
  onClose,
  onJump,
  onReview,
}: {
  open: boolean;
  onClose: () => void;
  onJump: (n: number) => void;
  onReview: () => void;
}) {
  const answers = useTest((s) => s.answers);
  const current = useTest((s) => s.current);
  const autoAdvance = useTest((s) => s.autoAdvance);
  const [expanded, setExpanded] = useState<number | null>(null);
  const openPart = expanded ?? question(current).p;
  const next = firstUnanswered(answers, 1);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="All parts and settings"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-paper shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-xl font-semibold">All parts</h2>
                <p className="text-sm text-muted">
                  {answeredCount(answers)} of {TOTAL} answered
                </p>
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-muted hover:text-ink" aria-label="Close">
                <X size={20} aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {next !== null && (
                  <Button variant="primary" onClick={() => onJump(next)}>
                    Go to first unanswered (Q{next})
                  </Button>
                )}
                <Button onClick={onReview}>Finish and score</Button>
              </div>

              <ul className="mt-5 space-y-2">
                {PARTS.map((p, i) => {
                  const total = p.end - p.start + 1;
                  let done = 0;
                  for (let n = p.start; n <= p.end; n++) if (n in answers) done++;
                  const isOpen = openPart === i;
                  return (
                    <li key={p.label} className="rounded-xl border border-line bg-card">
                      <button
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                        aria-expanded={isOpen}
                        onClick={() => setExpanded(isOpen ? -1 : i)}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium tracking-wide text-muted uppercase">
                            {p.label} · Q{p.start} to {p.end}
                          </span>
                          <span className="block truncate font-medium">{p.name}</span>
                          <ProgressBar value={done} max={total} className="mt-2" />
                        </span>
                        <span className={`text-sm tabular-nums ${done === total ? "text-accent" : "text-muted"}`}>
                          {done}/{total}
                        </span>
                        <ChevronDown size={18} className={`text-muted transition ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                      </button>
                      {isOpen && (
                        <div className="grid grid-cols-8 gap-1.5 border-t border-line p-3">
                          {Array.from({ length: total }, (_, k) => p.start + k).map((n) => (
                            <button
                              key={n}
                              onClick={() => onJump(n)}
                              aria-label={`Question ${n}${n in answers ? `, answered ${answers[n]}` : ", not answered"}`}
                              aria-current={n === current ? "true" : undefined}
                              className={`rounded-md py-1.5 text-xs tabular-nums transition ${
                                n in answers ? "bg-accent-soft text-ink" : "border border-line text-muted"
                              } ${n === current ? "ring-2 ring-accent" : "hover:ring-1 hover:ring-accent"}`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 border-t border-line pt-5">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-(--accent)"
                    checked={autoAdvance}
                    onChange={(e) => useTest.getState().setAutoAdvance(e.target.checked)}
                  />
                  <span>
                    <span className="block font-medium">Move on automatically</span>
                    <span className="block text-sm text-muted">Go to the next question as soon as you pick an answer.</span>
                  </span>
                </label>
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <h3 className="font-medium">Backup</h3>
                <p className="mt-1 mb-3 text-sm text-muted">
                  Your answers are already saved in this browser. A backup file lets you continue on another device.
                </p>
                <BackupControls />
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
