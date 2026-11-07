import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";

/** One decision per screen: title, progress, Back, then content. Layout never shifts. */
export function Screen({ step, total, title, onBack, children, hideData }: {
  step: number; total: number; title: string; onBack?: () => void; children: ReactNode; hideData?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 pb-10 pt-4">
      <header className="flex items-center justify-between gap-3">
        {onBack ? (
          <Button variant="bigOutline" size="tap" onClick={onBack} aria-label="Go back one step">
            <ArrowLeft aria-hidden /> Back
          </Button>
        ) : <span className="min-h-14" />}
        {!hideData && (
          <Button asChild variant="bigOutline" size="tap">
            <Link to="/my-data"><User aria-hidden /> My data</Link>
          </Button>
        )}
      </header>
      <div className="mt-5" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label={`Step ${step} of ${total}`}>
        <p className="text-base font-bold">Step {step} of {total}</p>
        <div className="mt-2 flex gap-2" aria-hidden>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`h-3 flex-1 rounded-full border-2 border-foreground ${i < step ? "bg-primary" : "bg-card"}`} />
          ))}
        </div>
      </div>
      <main className="mt-6 flex flex-1 flex-col">
        <h1 className="text-3xl font-bold leading-tight">{title}</h1>
        <div className="mt-6 flex flex-1 flex-col gap-4">{children}</div>
      </main>
    </div>
  );
}

export function MicButton({ listening, onClick, label }: { listening: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={listening}
      className="mx-auto flex size-36 flex-col items-center justify-center gap-1 rounded-full border-4 border-foreground bg-primary text-lg font-bold text-primary-foreground shadow-lg aria-pressed:bg-destructive"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-12" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/></svg>
      <span>{listening ? "Listening… tap to stop" : label}</span>
    </button>
  );
}

export function Heard({ text }: { text: string | null }) {
  return (
    <div aria-live="polite" className="min-h-16 rounded-xl border-2 border-dashed border-foreground bg-card p-3 text-lg">
      {text ? <><span className="font-bold">I heard:</span> “{text}”</> : <span className="text-muted-foreground">What you say will appear here.</span>}
    </div>
  );
}
