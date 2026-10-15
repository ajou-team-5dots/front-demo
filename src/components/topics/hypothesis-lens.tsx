'use client';

import { X } from 'lucide-react';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

import { VerdictBadge } from '@/components/insights/insight-sections';
import { cn } from '@/lib/utils';
import type { Hypothesis } from '@/types/insights';
import type { TopicId } from '@/types/topics';

interface Selection {
  topicId: TopicId;
  id: string;
}

interface HypothesisLensState {
  selection: Selection | null;
  setSelection: (selection: Selection | null) => void;
}

const HypothesisLensContext = createContext<HypothesisLensState>({
  selection: null,
  setSelection: () => {},
});

/** Lives in the /topics layout so a chosen reading survives picking another entity. */
export function HypothesisLensProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const value = useMemo(() => ({ selection, setSelection }), [selection]);
  return <HypothesisLensContext.Provider value={value}>{children}</HypothesisLensContext.Provider>;
}

/** The reading chosen on this topic, or null (a choice made on another topic does not carry over). */
export function useSelectedHypothesis(topicId: TopicId) {
  const { selection } = useContext(HypothesisLensContext);
  return selection?.topicId === topicId ? selection.id : null;
}

function useToggle(topicId: TopicId) {
  const { selection, setSelection } = useContext(HypothesisLensContext);
  const selected = selection?.topicId === topicId ? selection.id : null;
  const toggle = (id: string) => setSelection(selected === id ? null : { topicId, id });
  return { selected, toggle, clear: () => setSelection(null) };
}

interface HypothesisCardsProps {
  topicId: TopicId;
  hypotheses: Hypothesis[];
}

/** Readings of the observed behavior. Clicking one lights up the evidence that tests it. */
export function HypothesisCards({ topicId, hypotheses }: HypothesisCardsProps) {
  const { selected, toggle } = useToggle(topicId);
  return (
    <ol className="grid gap-4 md:grid-cols-2">
      {hypotheses.map((item, index) => {
        const active = selected === item.id;
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => {
                toggle(item.id);
                if (!active) {
                  document.getElementById('evidence')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className={cn(
                'flex h-full w-full flex-col gap-3 rounded-lg border bg-card p-5 text-left transition duration-200 hover:border-primary',
                active && 'border-primary ring-2 ring-primary',
                selected !== null && !active && 'opacity-60',
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="font-extrabold">
                  <span className="text-muted-foreground">{`해석 ${index + 1} · `}</span>
                  {item.title}
                </span>
                <VerdictBadge verdict={item.verdict} />
              </span>
              <span className="grid gap-2 text-sm">
                <span className="grid gap-0.5">
                  <span className="text-xs font-bold text-muted-foreground">맞다면 로그에</span>
                  <span>{item.ifTrue}</span>
                </span>
                <span className="grid gap-0.5">
                  <span className="text-xs font-bold text-muted-foreground">실제 로그</span>
                  <span className="tabular-nums">{item.evidence}</span>
                </span>
              </span>
              <span className="mt-auto text-xs font-bold text-primary">
                {active ? '근거 강조 끄기' : '이 해석의 근거 보기 ↓'}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact sticky switcher above the evidence so the choice stays visible while scrolling. */
export function HypothesisChips({ topicId, hypotheses }: HypothesisCardsProps) {
  const { selected, toggle, clear } = useToggle(topicId);
  return (
    <div className="sticky top-24 z-10 flex flex-wrap items-center gap-1.5 rounded-full border bg-card/95 p-1.5 backdrop-blur">
      <span className="px-2 text-xs font-bold text-muted-foreground">해석별 근거</span>
      {hypotheses.map((item, index) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={selected === item.id}
          onClick={() => toggle(item.id)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors duration-200',
            selected === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
          )}
        >
          {`${index + 1}. ${item.title}`}
        </button>
      ))}
      {selected && (
        <button
          type="button"
          onClick={clear}
          aria-label="해석 강조 끄기"
          className="ml-auto rounded-full p-1 text-muted-foreground hover:bg-accent"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
