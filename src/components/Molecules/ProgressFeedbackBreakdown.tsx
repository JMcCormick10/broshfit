import { useState } from "react";

export function ProgressFeedbackBreakdown({ improved, declined, steady, insufficient, total }: {
  improved: number;
  declined: number;
  steady: number;
  insufficient: number;
  total: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return <div className="ml-0 sm:ml-20">
    <button type="button" aria-expanded={isOpen} aria-controls="progress-feedback-details" onClick={() => setIsOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-void/50 px-3 py-2 text-xs font-semibold text-secondary transition hover:border-secondary/60 hover:text-starlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <span>{isOpen ? "Hide feedback details" : "Why this feedback?"}</span><span aria-hidden="true" className="text-[10px]">{isOpen ? "▲" : "▼"}</span>
    </button>
    {isOpen && <div id="progress-feedback-details" className="mt-2 rounded-md border border-border/70 bg-void/50 p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-steel">Progress breakdown</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-steel">
        Across {total} exercises in this range: <span className="font-semibold text-success">{improved} improved</span>, <span className="font-semibold text-danger">{declined} declined</span>, <span className="font-semibold text-starlight">{steady} stayed steady</span>, and {insufficient} {insufficient === 1 ? "needs" : "need"} more comparable sessions. Overall feedback uses the average percentage change for exercises with enough data.
      </p>
    </div>}
  </div>;
}
