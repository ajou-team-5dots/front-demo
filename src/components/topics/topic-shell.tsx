import { ChartColumn, Crosshair, GitBranch, LayoutDashboard, Wrench } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { TOPIC_META } from '@/lib/topic-meta';
import { cn } from '@/lib/utils';
import type { TopicId } from '@/types/topics';

import { RoleSwitcher } from './role-lens';

type NavId = 'overview' | TopicId;

const NAV: { id: NavId; href: string; label: string; icon: typeof ChartColumn }[] = [
  { id: 'overview', href: '/topics', label: '개요', icon: LayoutDashboard },
  { id: 'postrun', href: '/topics/postrun', label: `T1 ${TOPIC_META.postrun.ask}`, icon: Wrench },
  {
    id: 'friction',
    href: '/topics/friction',
    label: `T2 ${TOPIC_META.friction.ask}`,
    icon: Crosshair,
  },
  { id: 'loop', href: '/topics/loop', label: `T3 ${TOPIC_META.loop.ask}`, icon: GitBranch },
];

interface TopicShellProps {
  current: NavId;
  /** Enables topic-specific dimming in the role switcher. */
  topicId?: TopicId;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Right side of the page header. */
  actions?: ReactNode;
  /** Pages outside /topics have no role lens provider. */
  showRoleSwitcher?: boolean;
  children: ReactNode;
}

function SidebarNav({ current }: { current: NavId }) {
  return (
    <nav aria-label="주제" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.id === current;
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-r-md border-l-4 px-4 py-3 text-[15px] transition-colors duration-200',
              active
                ? 'border-primary bg-primary-soft font-bold text-primary-strong'
                : 'border-transparent text-foreground/80 hover:bg-accent',
            )}
          >
            <Icon className="size-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TopicShell({
  current,
  topicId,
  eyebrow,
  title,
  subtitle,
  actions,
  showRoleSwitcher = true,
  children,
}: TopicShellProps) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col gap-8 border-r bg-card px-5 py-7 lg:flex">
        <Link href="/topics" className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ChartColumn className="size-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-lg leading-tight font-black text-primary-strong">
              5dots 행동 분석
            </span>
            <span className="text-[11px] font-bold tracking-widest text-muted-foreground">
              AKKADIA BEHAVIOR DEMO
            </span>
          </span>
        </Link>
        <SidebarNav current={current} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20 flex flex-col gap-2 border-b bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <nav aria-label="주제" className="flex gap-1 overflow-x-auto lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs whitespace-nowrap',
                  item.id === current ? 'bg-primary font-bold text-primary-foreground' : 'bg-card',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-end">
            {showRoleSwitcher && <RoleSwitcher topicId={topicId} />}
          </div>
        </div>

        <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-8 px-4 py-10 md:px-8">
          <header className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex max-w-3xl flex-col gap-2">
              {eyebrow && <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>}
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
              {subtitle && <p className="text-base text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
          </header>
          {children}
        </main>

        <footer className="border-t px-4 py-5 text-xs text-muted-foreground md:px-8">
          <div className="mx-auto max-w-page">5dots 정보디자인 프로젝트 · 디자인 시안</div>
        </footer>
      </div>
    </div>
  );
}
