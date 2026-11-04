import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SignalBadgeProps {
  tone: 'danger' | 'warning' | 'supported';
  children: ReactNode;
  className?: string;
}

// Status color only ever comes with a text label (never color alone).
export function SignalBadge({ tone, children, className }: SignalBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-pill px-1.5 text-(length:--font-size-caption) leading-none font-semibold whitespace-nowrap',
        tone === 'danger' && 'bg-status-danger-soft text-status-danger',
        tone === 'warning' && 'bg-status-warning-soft text-status-warning',
        tone === 'supported' && 'bg-status-supported-soft text-status-supported',
        className,
      )}
    >
      {children}
    </span>
  );
}
