import { CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';

import { VERDICT_LABELS } from '@/lib/insight-meta';
import { cn } from '@/lib/utils';
import type { Verdict } from '@/types/insights';

const VERDICT_CLASS: Record<Verdict, string> = {
  support: 'bg-success-soft text-success',
  partial: 'bg-primary-soft text-primary-strong',
  against: 'bg-muted text-muted-foreground line-through decoration-1',
  unknown: 'bg-muted text-muted-foreground',
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', VERDICT_CLASS[verdict])}
    >
      {VERDICT_LABELS[verdict]}
    </span>
  );
}

interface StepProps {
  step: number;
  title: string;
  description?: ReactNode;
  id?: string;
  children: ReactNode;
}

/** One numbered step of the page: observation → readings → evidence → explore → questions → fixes. */
export function InsightStep({ step, title, description, id, children }: StepProps) {
  return (
    <section id={id} className="flex scroll-mt-28 flex-col gap-4">
      <header className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
          {step}
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

export function OpenQuestions({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2 rounded-lg border bg-card p-5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm">
          <CircleHelp className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {item}
        </li>
      ))}
    </ul>
  );
}

interface StatProps {
  value: string;
  label: string;
  hint?: string;
}

export function Stat({ value, label, hint }: StatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-5">
      <span className="text-3xl font-black tracking-tight tabular-nums">{value}</span>
      <span className="text-sm">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
