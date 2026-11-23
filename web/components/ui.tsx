"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useStorageStatus } from "@/lib/store";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:opacity-90 border border-transparent",
  secondary: "bg-card text-ink border border-line hover:border-accent",
  ghost: "text-muted hover:text-ink border border-transparent",
  danger: "bg-warm text-white hover:opacity-90 border border-transparent",
};

export const buttonClass = (variant: Variant = "secondary", extra = "") =>
  `inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:opacity-40 ${VARIANTS[variant]} ${extra}`;

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" {...props} className={buttonClass(variant, className)} />;
}

export function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pct = max ? Math.min(100, (100 * value) / max) : 0;
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-line ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A destructive button that asks once more, in place, before it acts. */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  className = "",
}: {
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  return armed ? (
    <Button
      variant="danger"
      className={className}
      onClick={() => {
        setArmed(false);
        onConfirm();
      }}
    >
      {confirmLabel}
    </Button>
  ) : (
    <Button variant="ghost" className={className} onClick={() => setArmed(true)}>
      {children}
    </Button>
  );
}

export function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={`mx-auto w-full px-5 ${wide ? "max-w-4xl" : "max-w-2xl"}`}>{children}</div>;
}

/** Shown only when the browser refuses to store progress (privacy settings, a full disk, some embedded views). */
export function StorageWarning({ className = "" }: { className?: string }) {
  const ok = useStorageStatus((s) => s.ok);
  if (ok) return null;
  return (
    <p role="alert" className={`rounded-xl border border-warm/40 bg-warm-soft px-4 py-3 text-sm leading-relaxed ${className}`}>
      <strong>This browser is not saving your progress.</strong> Storage is blocked or full, so your answers will be
      lost when this tab closes. You can keep going, and use Download backup (under Parts, or on the start page) to
      keep a copy.
    </p>
  );
}
