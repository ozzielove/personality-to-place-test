import Link from "next/link";

// A server component: styles are written out here because components/ui.tsx is client-only.
export default function NotFound() {
  return (
    <main className="flex-1 py-20">
      <div className="mx-auto w-full max-w-2xl px-5">
        <h1 className="font-display text-3xl font-semibold">That page does not exist</h1>
        <p className="mt-3 text-muted">The test, your saved progress, and your results are all one click away.</p>
        <Link href="/" className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition hover:opacity-90">
          Go to the start page
        </Link>
      </div>
    </main>
  );
}
