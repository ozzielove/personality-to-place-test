"use client"; // error boundaries must be client components

import { useEffect } from "react";
import { BackupControls } from "@/components/BackupControls";
import { Button, Shell, buttonClass } from "@/components/ui";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex-1 py-20">
      <Shell>
        <h1 className="font-display text-3xl font-semibold">Something went wrong on this page</h1>
        <p className="mt-3 leading-relaxed text-muted">
          Your answers are saved in this browser and were not touched. Try again, or reload the page. If you want a
          copy of your answers first, download a backup.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => retry()}>
            Try again
          </Button>
          {/* a full page load on purpose: after a crash, start from a clean slate rather than a client transition */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className={buttonClass("secondary")}>
            Go to the start page
          </a>
        </div>
        <div className="mt-8">
          <BackupControls />
        </div>
      </Shell>
    </main>
  );
}
