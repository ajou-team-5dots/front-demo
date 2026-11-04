'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useMemo,
  useOptimistic,
  useTransition,
  type ReactNode,
} from 'react';

interface NavigateOptions {
  /** Replace the history entry instead of adding one (opening, switching or closing a detail). */
  replace?: boolean;
}

interface BoardPending {
  pending: boolean;
  /** Href of the navigation in flight, null when none (e.g. to highlight a clicked row now). */
  pendingHref: string | null;
  /** router.push / replace inside a transition, so the board dims instead of blanking. */
  navigate: (href: string, options?: NavigateOptions) => void;
}

const Ctx = createContext<BoardPending | null>(null);

interface BoardPendingProviderProps {
  children: ReactNode;
}

// Shares one pending state between the filter bar, sankey, chips and the detail. While a
// navigation is in flight the content dims (.board-dim) and a thin bar runs across the top.
// Every navigation stays on '/', so the Suspense boundaries already on screen keep their content
// until the new data is ready (no skeleton, no blank frame).
export function BoardPendingProvider({ children }: BoardPendingProviderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useOptimistic<string | null>(null);
  const value = useMemo<BoardPending>(
    () => ({
      pending,
      pendingHref,
      navigate: (href, options) =>
        startTransition(() => {
          setPendingHref(href);
          if (options?.replace) router.replace(href, { scroll: false });
          else router.push(href, { scroll: false });
        }),
    }),
    [pending, pendingHref, router, setPendingHref],
  );
  return (
    <Ctx.Provider value={value}>
      <div data-pending={pending} aria-busy={pending}>
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
          style={{ opacity: pending ? 1 : 0, transition: 'opacity var(--duration-base)' }}
        >
          <div
            className="h-full w-2/5 bg-brand"
            style={{ animation: pending ? 'board-progress 1s var(--ease-board) infinite' : 'none' }}
          />
        </div>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useBoardPending(): BoardPending {
  const ctx = useContext(Ctx);
  const router = useRouter();
  if (ctx) return ctx;
  // Outside the provider (e.g. dev previews): plain navigation.
  return {
    pending: false,
    pendingHref: null,
    navigate: (href, options) =>
      options?.replace
        ? router.replace(href, { scroll: false })
        : router.push(href, { scroll: false }),
  };
}
