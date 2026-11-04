'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useBoardPending } from '@/components/board/shell/board-pending';
import { FlowChips } from '@/components/board/shell/chip';
import { EmptyState } from '@/components/board/shell/empty-state';
import { Panel } from '@/components/board/shell/panel';
import { MainWidthProvider, useMeasuredWidth } from '@/components/board/shell/main-width';
import { boardHref, monsterOfHref, toggleHref } from '@/lib/board-filters';
import { pickChips } from '@/lib/board-rows';
import { SPACE } from '@/styles/tokens';
import type { BoardFilters, FlowData, FlowKey, FlowPick } from '@/types/board';
import type { MonsterMainRow } from '@/types/monsters';

import { FlowSummary } from './flow-summary';
import { byRiskThenName, RiskList, type HoverSource } from './risk-list';
import { FocusScatter } from './focus-scatter';
import { Sankey, SANKEY_H } from './sankey';

export interface MainBoardProps {
  /** Already filtered by stage, group and search on the server. */
  rows: MonsterMainRow[];
  flow: FlowData;
  filters: BoardFilters;
  pick: FlowPick;
  /** Open monster (?m=), null for the overview. */
  monster?: string | null;
  /** The detail slot (server-rendered, own Suspense), shown in the main area when open. */
  detail?: ReactNode;
  /** Dev previews serve the board on another path; the real board is '/'. */
  basePath?: string;
}

interface SharedHover {
  monster: string;
  from: HoverSource;
}

// Below the filter bar and the context line, as one board. Panel content starts at 52 (top 12 +
// the 30px shared header + 10).
//   left: the explorer list ("위험 높은 순"), a 320-wide sidebar running the full board height.
//   main: the rest of the frame (1066 at the 1440 frame, 1506 at 1920), measured. It holds the
//   overview (scatter 678, gap 14, flow 440) and, when a monster is open, its detail, side by
//   side on a track inside a clipped viewport; opening slides the track left by one slot + gap.
// A list row, a scatter mark or Enter opens a monster (?m=); the open one again, or Esc, closes.
const SIDEBAR_W = 320;
const GAP = SPACE.panelGap;
/** Scatter and flow panel heights (h-[678px] / h-[440px] below). */
const SCATTER_H = 678;
const FLOW_H = 440;
/** Board height: the overview's two panels. The sidebar and the main viewport match it. */
export const BOARD_H = SCATTER_H + GAP + FLOW_H;
const PANEL_X = SPACE.panelInset;
const SUMMARY_RIGHT = 12;
const SUMMARY_W = 144;
const SANKEY_SUMMARY_GAP = 16;
/** Flow panel width taken by everything but the sankey: left inset, summary box, its gap. */
const SANKEY_REST = PANEL_X + SUMMARY_RIGHT + SUMMARY_W + SANKEY_SUMMARY_GAP;
/**
 * The track is two main-area slots and a gap. Percentages of the track keep the slide exact at
 * any width, also before the width is measured and while the window resizes (no re-animation).
 */
const TRACK_W = `calc(200% + ${GAP}px)`;
const SLOT_W = `calc(50% - ${GAP / 2}px)`;
const TRACK_OPEN = `translateX(calc(-50% - ${GAP / 2}px))`;
const SLIDE = 'transform var(--duration-slow) var(--ease-board)';

/** Attribute-selector-safe monster id (ids look like elderroot_stage_1). */
const attr = (s: string) => s.replace(/["\\]/g, '\\$&');

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scroll a sidebar row into view inside the list only, never the page. */
function revealRow(sidebar: HTMLElement | null, monster: string) {
  const row = sidebar?.querySelector<HTMLElement>(`li[data-monster="${attr(monster)}"]`);
  const ol = row?.closest('ol');
  if (!row || !ol) return;
  const top = row.offsetTop;
  const bottom = top + row.offsetHeight;
  if (top >= ol.scrollTop && bottom <= ol.scrollTop + ol.clientHeight) return;
  ol.scrollTo({
    top: top - (ol.clientHeight - row.offsetHeight) / 2,
    behavior: reducedMotion() ? 'auto' : 'smooth',
  });
}

export function MainBoard({
  rows,
  flow,
  filters,
  pick,
  monster = null,
  detail = null,
  basePath = '/',
}: MainBoardProps) {
  const { navigate, pendingHref } = useBoardPending();
  const router = useRouter();
  const ranked = useMemo(() => byRiskThenName(rows), [rows]);
  const [hover, setHover] = useState<SharedHover | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const { width: mainW, settled } = useMeasuredWidth(mainRef);
  const open = Boolean(monster);

  const withBase = useCallback(
    (href: string) => (basePath === '/' ? href : `${basePath}${href.slice(1)}`),
    [basePath],
  );
  const hrefFor = useCallback(
    (p: FlowPick, m: string | null) => withBase(boardHref(filters, p, m)),
    [filters, withBase],
  );

  // The detail slot is always mounted, also while closed (its Suspense then holds nothing), so
  // opening a monster reuses an already-shown boundary: the transition keeps the overview until
  // the detail is ready instead of sliding in a skeleton. Once closed, the last detail stays on
  // the track while it slides out (the server sends an empty slot by then).
  const [kept, setKept] = useState<ReactNode>(detail);
  if (monster && detail !== kept) setKept(detail);
  const shownDetail = monster ? detail : kept;

  // The row being opened lights up at once; the slide itself waits for the detail's data.
  const pendingMonster = pendingHref === null ? undefined : monsterOfHref(pendingHref);
  const current = pendingMonster === undefined ? monster : pendingMonster;

  const overviewHref = useCallback((p: FlowPick) => hrefFor(p, null), [hrefFor]);
  /** A row's / dot's target: the monster, or the overview when it is the one shown as open. */
  const rowHref = useCallback(
    (m: string) => withBase(toggleHref(filters, pick, m, current)),
    [current, filters, pick, withBase],
  );
  // Monster changes replace the history entry, so Back leaves the board instead of stepping
  // through every monster clicked. Filter and pick changes still push. Clicking the open
  // monster again closes the detail; another one switches.
  const toggleMonster = useCallback(
    (m: string) => navigate(rowHref(m), { replace: true }),
    [navigate, rowHref],
  );
  const close = useCallback(
    () => navigate(hrefFor(pick, null), { replace: true }),
    [hrefFor, navigate, pick],
  );
  // Pre-warms the target: the same route with or without ?m=, so this fetches its RSC payload.
  const prefetch = useCallback((m: string) => router.prefetch(rowHref(m)), [router, rowHref]);
  const hoverScatter = useCallback(
    (m: string | null) => setHover(m ? { monster: m, from: 'scatter' } : null),
    [],
  );
  const hoverList = useCallback(
    (m: string | null) => setHover(m ? { monster: m, from: 'list' } : null),
    [],
  );

  const toggleCell = useCallback(
    (key: FlowKey, value: string) => {
      const next: FlowPick = { ...pick };
      if (next[key] === value) delete next[key];
      else next[key] = value;
      navigate(overviewHref(next));
    },
    [overviewHref, navigate, pick],
  );

  // Esc closes the detail, unless a select popup is open (it closes itself first). It also binds
  // while an open is only pending (current set, ?m= not yet): navigating to the no-m href then
  // supersedes the pending one, so the board stays on the overview.
  const shown = open || current !== null;
  useEffect(() => {
    if (!shown) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[role="listbox"]')) return;
      close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, shown]);

  // Opening: the detail starts at its top and its title takes focus. Closing: focus returns to
  // the monster's row in the sidebar. preventScroll keeps the clipped viewport still.
  const shownMonster = useRef<string | null>(monster);
  useLayoutEffect(() => {
    const before = shownMonster.current;
    shownMonster.current = monster;
    if (before === monster) return;
    if (monster && !before) {
      detailRef.current?.scrollTo({ top: 0 });
      detailRef.current
        ?.querySelector<HTMLElement>('[data-detail-title]')
        ?.focus({ preventScroll: true });
    } else if (!monster && before) {
      sidebarRef.current
        ?.querySelector<HTMLElement>(`li[data-monster="${attr(before)}"] a`)
        ?.focus({ preventScroll: true });
    }
  }, [monster]);

  // Keep the open monster visible in the sidebar (e.g. opened from the scatter).
  useEffect(() => {
    if (monster) revealRow(sidebarRef.current, monster);
  }, [monster]);

  const chips = pickChips(pick, overviewHref);
  const hasFlow = flow.rows.some((r) => r.enc > 0);

  return (
    <div
      className="flex"
      style={{ gap: GAP, height: BOARD_H }}
      data-board-still={settled ? undefined : ''}
    >
      <div ref={sidebarRef} data-board-sidebar className="shrink-0" style={{ width: SIDEBAR_W }}>
        <Panel
          title="위험 높은 순"
          meta={
            <>
              <span className="text-ink">{ranked.length}</span>종
            </>
          }
          info="기대 대비 위험이 높은 순서입니다. 누르면 상세 · 다시 누르면 개요"
          className="h-full"
          enter={0}
        >
          <div className="absolute inset-x-2 top-[52px] bottom-3">
            {ranked.length ? (
              <RiskList
                rows={ranked}
                hover={hover?.monster ?? null}
                hoverFrom={hover?.from ?? null}
                onHover={hoverList}
                hrefFor={rowHref}
                onOpen={toggleMonster}
                onPrefetch={prefetch}
                open={monster}
                current={current}
              />
            ) : (
              <EmptyState>조건에 맞는 몬스터가 없습니다</EmptyState>
            )}
          </div>
        </Panel>
      </div>

      {/* overflow: clip (not hidden) so focus or find-in-page can never scroll the track. */}
      <div
        ref={mainRef}
        className="relative min-w-0 flex-1 overflow-clip"
        style={{ height: BOARD_H }}
      >
        <MainWidthProvider value={mainW}>
          <div
            className="flex h-full"
            style={{
              gap: GAP,
              width: TRACK_W,
              transform: open ? TRACK_OPEN : 'translateX(0)',
              transition: SLIDE,
            }}
          >
            <div
              className="flex shrink-0 flex-col"
              style={{ width: SLOT_W, gap: GAP }}
              inert={open}
            >
              <Panel
                title="사망 수 × 기대 대비 위험"
                meta={
                  <>
                    <span className="text-ink">{rows.length}</span>종
                  </>
                }
                info="오른쪽 위 옅은 영역 = 우선 점검 · 점을 누르면 상세"
                className="h-[678px] shrink-0"
                enter={1}
              >
                <div className="absolute inset-x-4 top-[52px] h-[597px]">
                  {rows.length ? (
                    <FocusScatter
                      rows={rows}
                      width={mainW - 2 * PANEL_X}
                      hover={hover?.monster ?? null}
                      current={current}
                      onHover={hoverScatter}
                      onOpen={toggleMonster}
                      onPrefetch={prefetch}
                    />
                  ) : (
                    <EmptyState>조건에 맞는 몬스터가 없습니다</EmptyState>
                  )}
                </div>
              </Panel>
              <Panel
                title="전체 교전 흐름"
                info={
                  <>
                    <p>칸을 차례로 눌러보세요.</p>
                    <p>
                      고른 칸이 패널 아래에 차례로 쌓이고, 몬스터 상세에도 같은 조건으로 이어집니다.
                    </p>
                  </>
                }
                className="h-[440px] shrink-0"
                enter={2}
              >
                <div
                  className="absolute top-[52px] left-4"
                  style={{ right: SANKEY_REST - PANEL_X, height: SANKEY_H }}
                >
                  {hasFlow ? (
                    <Sankey
                      width={mainW - SANKEY_REST}
                      columns={flow.columns}
                      rows={flow.rows}
                      pick={pick}
                      onToggle={toggleCell}
                    />
                  ) : (
                    <EmptyState>이 조건의 교전이 없습니다</EmptyState>
                  )}
                </div>
                <div
                  className="absolute top-[52px] right-3"
                  style={{ width: SUMMARY_W, height: SANKEY_H }}
                >
                  <FlowSummary
                    rows={flow.rows}
                    pick={pick}
                    excludedEnc={flow.excluded?.enc ?? 0}
                    excludedDeaths={flow.excluded?.deaths ?? 0}
                  />
                </div>
                {chips.length ? (
                  <div className="absolute bottom-3 left-3">
                    <FlowChips chips={chips} />
                  </div>
                ) : null}
              </Panel>
            </div>
            {/* A size container: the detail switches to its wide arrangement from 1200. */}
            <div
              ref={detailRef}
              role="region"
              aria-label={monster ? `${monster} 상세` : '몬스터 상세'}
              className="@container h-full shrink-0 overflow-y-auto overscroll-contain"
              style={{ width: SLOT_W }}
              inert={!open}
            >
              {shownDetail}
            </div>
          </div>
        </MainWidthProvider>
      </div>
    </div>
  );
}
