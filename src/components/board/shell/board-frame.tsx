import type { ReactNode } from 'react';

import { BoardPendingProvider } from './board-pending';
import { BoardSeen } from './board-seen';
import { BoardHeader } from './header';

interface BoardFrameProps {
  children: ReactNode;
}

/**
 * Side padding of the frame: 20px at the 1440 frame, 40px at 1920, linear between. 100cqw is the
 * page wrapper's width (the window without its scrollbar), the same as the frame inside 1440→1920.
 */
const FRAME_PAD = 'clamp(20px, calc(20px + (100cqw - 1440px) / 24), 40px)';

// The board is fluid between a 1440 and a 1920 frame (Figma frames are 1440). Narrower windows
// scroll sideways inside this wrapper; wider ones center the 1920 frame on the gray-3 page.
// Header, filter bar and board share the padding, so all three span the same width.
export function BoardFrame({ children }: BoardFrameProps) {
  return (
    <div className="@container w-full overflow-x-auto bg-gray-3">
      <div
        className="mx-auto w-full max-w-[1920px] min-w-[1440px] pb-7"
        style={{ paddingInline: FRAME_PAD }}
      >
        <BoardHeader />
        <BoardSeen />
        <BoardPendingProvider>{children}</BoardPendingProvider>
      </div>
    </div>
  );
}

interface BlockProps {
  className: string;
}

/** Shimmering placeholder block. */
function Block({ className }: BlockProps) {
  return <div className={`board-skeleton rounded-control ${className}`} />;
}

interface SkeletonPanelProps {
  className: string;
  children?: ReactNode;
}

function SkeletonPanel({ className, children }: SkeletonPanelProps) {
  return (
    <div
      className={`rounded-panel bg-panel px-(--space-panel-inset) pt-(--space-panel-top) ${className}`}
    >
      <Block className="h-[22px] w-40" />
      {children}
    </div>
  );
}

function FilterSkeleton() {
  return (
    <div className="flex h-[42px] items-center gap-3 rounded-panel bg-panel px-[6px]">
      <Block className="h-[30px] w-[95px]" />
      <Block className="h-[30px] w-[95px]" />
      <Block className="h-[30px] w-[124px]" />
      <Block className="h-[30px] w-[100px]" />
    </div>
  );
}

/** The explorer sidebar's rows (left column of both skeletons' board). */
function SidebarSkeleton() {
  return (
    <SkeletonPanel className="h-[1132px] w-[320px] shrink-0">
      <Block className="mt-1 h-[13px] w-48" />
      <div className="mt-[22px] flex flex-col gap-2">
        {Array.from({ length: 24 }, (_, i) => (
          <Block key={i} className="h-9 w-full" />
        ))}
      </div>
    </SkeletonPanel>
  );
}

/**
 * Same boxes as the board (one page): filter bar, then the 320 sidebar on the left beside the
 * main area (the rest of the frame: scatter 678 + flow 440). Shown until data arrives.
 */
export function MainSkeleton() {
  return (
    <div className="board-skeleton-late" aria-busy="true" aria-label="화면을 불러오는 중">
      <FilterSkeleton />
      <div className="mt-(--space-panel-gap) flex gap-(--space-panel-gap)">
        <SidebarSkeleton />
        <div className="flex min-w-0 flex-1 flex-col gap-(--space-panel-gap)">
          <SkeletonPanel className="h-[678px]">
            <Block className="mt-[25px] h-[597px] w-full" />
          </SkeletonPanel>
          <SkeletonPanel className="h-[440px]">
            <Block className="mt-[25px] h-[320px] w-full" />
          </SkeletonPanel>
        </div>
      </div>
    </div>
  );
}

/**
 * The detail's boxes (monster-detail.tsx), shown in the main area's detail slot only when a board
 * opened with ?m= is still loading the detail; after 200ms like every skeleton. The slot is a
 * size container: from 1200 wide the 전투 양상 column is 360, below 340.
 */
export function DetailSkeleton() {
  return (
    <div
      className="board-skeleton-late flex w-full flex-col gap-(--space-panel-gap)"
      aria-busy="true"
      aria-label="상세를 불러오는 중"
    >
      <div className="flex h-[66px] items-center justify-between gap-6 pl-4">
        <Block className="h-[29px] w-56" />
        <Block className="h-[66px] w-[380px] shrink-0 rounded-panel" />
      </div>
      <div className="flex h-[380px] gap-(--space-panel-gap)">
        <SkeletonPanel className="h-full w-[340px] shrink-0 @min-[1200px]:w-[360px]" />
        <SkeletonPanel className="h-full min-w-0 flex-1" />
      </div>
      <SkeletonPanel className="h-[332px]" />
    </div>
  );
}
