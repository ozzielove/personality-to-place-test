"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { answeredCount, downloadText, makeBackup, parseBackup, useTest } from "@/lib/store";
import { Button } from "./ui";

/** Save progress to a file, or load it back. This is how progress moves between devices. */
export function BackupControls({ onRestored }: { onRestored?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const hasAnswers = useTest((s) => answeredCount(s.answers) > 0);

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("That file is too large to be a progress backup.");
      const snap = parseBackup(await file.text());
      useTest.getState().restore(snap);
      setNote({ ok: true, text: `Restored ${answeredCount(snap.answers)} answers.` });
      onRestored?.();
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "Could not read that file." });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!hasAnswers}
          onClick={() => {
            downloadText(`personality-to-place-progress-${new Date().toISOString().slice(0, 10)}.json`, makeBackup());
            setNote({ ok: true, text: "Backup file downloaded." });
          }}
        >
          <Download size={16} aria-hidden /> Download backup
        </Button>
        <Button onClick={() => input.current?.click()}>
          <Upload size={16} aria-hidden /> Restore from backup
        </Button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Progress backup file"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>
      {note && (
        <p role="status" className={`mt-2 text-sm ${note.ok ? "text-accent" : "text-warm"}`}>
          {note.text}
        </p>
      )}
    </div>
  );
}
