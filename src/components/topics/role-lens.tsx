'use client';

import { Lightbulb } from 'lucide-react';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import type { RoleAction } from '@/lib/insight-meta';
import { PANEL_LABELS, type PanelId, ROLES, type RoleId, TOPIC_META } from '@/lib/topic-meta';
import { cn } from '@/lib/utils';
import type { TopicId } from '@/types/topics';

import { useSelectedHypothesis } from './hypothesis-lens';

interface RoleLensState {
  role: RoleId | null;
  setRole: (role: RoleId | null) => void;
}

const RoleLensContext = createContext<RoleLensState>({ role: null, setRole: () => {} });

/** Lives in the /topics layout so the chosen role survives moving between topics. */
export function RoleLensProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<RoleId | null>(null);
  const value = useMemo(() => ({ role, setRole }), [role]);
  return <RoleLensContext.Provider value={value}>{children}</RoleLensContext.Provider>;
}

const chipClass = (active: boolean, muted: boolean) =>
  cn(
    'rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors duration-200',
    active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
    !active && muted && 'text-muted-foreground',
  );

/** Compact role picker for the top bar. */
export function RoleSwitcher({ topicId }: { topicId?: TopicId }) {
  const { role, setRole } = useContext(RoleLensContext);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="hidden text-xs font-bold text-muted-foreground sm:inline">역할 렌즈</span>
      <div
        role="group"
        aria-label="역할 렌즈"
        className="flex min-w-0 gap-1 overflow-x-auto rounded-full border bg-card p-1"
      >
        <button
          type="button"
          aria-pressed={role === null}
          onClick={() => setRole(null)}
          className={chipClass(role === null, false)}
        >
          전체
        </button>
        {ROLES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={role === item.id}
            onClick={() => setRole(item.id)}
            className={chipClass(
              role === item.id,
              topicId !== undefined && TOPIC_META[topicId].roles[item.id] === undefined,
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** One line under the page title saying what the chosen role should look at. */
export function RoleFocus({ topicId }: { topicId: TopicId }) {
  const { role } = useContext(RoleLensContext);
  if (role === null) {
    return null;
  }
  const lens = TOPIC_META[topicId].roles[role];
  const roleLabel = ROLES.find((item) => item.id === role)?.label;
  return (
    <p className="rounded-md bg-primary-soft px-4 py-3 text-sm text-primary-strong">
      <span className="font-bold">{roleLabel}</span>
      {lens
        ? ` · ${lens.focus} (${lens.panels.map((panel) => PANEL_LABELS[panel]).join(', ')})`
        : ' · 이 주제는 이 역할이 주로 볼 주제가 아닙니다. 다른 주제를 확인해 주세요.'}
    </p>
  );
}

interface LensPanelProps {
  topicId: TopicId;
  /** One panel id, or several when a card holds more than one kind of content. */
  panel: PanelId | PanelId[];
  id?: string;
  title?: string;
  description?: ReactNode;
  /** Right side of the panel header (tabs, links). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** 'bare' has no card around it. */
  variant?: 'card' | 'bare';
  /** Shadow only for the one panel a page is about. */
  elevated?: boolean;
  /** Readings (hypothesis ids) this panel helps tell apart; lit when one of them is chosen. */
  hypotheses?: string[];
}

/** A dashboard panel that lights up when the selected role should look at it. */
export function LensPanel({
  topicId,
  panel,
  id,
  title,
  description,
  action,
  children,
  className,
  variant = 'card',
  elevated = false,
  hypotheses = [],
}: LensPanelProps) {
  const { role } = useContext(RoleLensContext);
  const hypothesis = useSelectedHypothesis(topicId);
  const lens = role ? TOPIC_META[topicId].roles[role] : undefined;
  const panels = Array.isArray(panel) ? panel : [panel];
  const highlighted = panels.some((item) => lens?.panels.includes(item));
  const tested = hypothesis !== null && hypotheses.includes(hypothesis);
  const dimmed = (role !== null && !highlighted) || (hypothesis !== null && !tested);
  const roleLabel = ROLES.find((item) => item.id === role)?.label;

  return (
    <section
      id={id}
      className={cn(
        'relative flex min-w-0 scroll-mt-28 flex-col gap-4 transition-all duration-200',
        variant === 'card' && 'rounded-lg border bg-card p-6',
        elevated && 'shadow-card',
        variant === 'bare' && 'rounded-lg',
        (highlighted || tested) && 'ring-2 ring-primary ring-offset-4 ring-offset-background',
        dimmed && 'opacity-50',
        className,
      )}
    >
      {(title || action || highlighted || tested) && (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {title && <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>}
            {description && <p className={cn('text-sm', 'text-muted-foreground')}>{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {tested && <Badge variant="secondary">선택한 해석의 근거</Badge>}
            {highlighted && <Badge>{roleLabel}이 볼 곳</Badge>}
            {action}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}

/** Conditional fixes per role; the chosen role's cards stay lit, the rest fade. */
export function RoleActionCards({ actions }: { actions: RoleAction[] }) {
  const { role } = useContext(RoleLensContext);
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {actions.map((item) => {
        const label = ROLES.find((entry) => entry.id === item.role)?.label ?? item.role;
        const mine = role === item.role;
        return (
          <li
            key={`${item.role}-${item.action}`}
            className={cn(
              'flex gap-3 rounded-lg border bg-card p-5 transition-all duration-200',
              mine && 'ring-2 ring-primary',
              role !== null && !mine && 'opacity-50',
            )}
          >
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="flex flex-col gap-1 text-sm">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold">{label}</span>
                {item.when && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {item.when}
                  </span>
                )}
              </span>
              <span>{item.action}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
