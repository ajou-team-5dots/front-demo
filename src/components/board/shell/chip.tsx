'use client';

import { useBoardPending } from './board-pending';

interface ChipProps {
  label: string;
  /** Href of the same page without this chip. */
  removeHref: string;
  /** Second and later chips start with an arrow (Figma 25:50 "→ 무기 · 나무 ×"). */
  arrow?: boolean;
}

// Figma 25:43: 128×28, gray-3 fill, radius 6, 12 Medium gray text. Pops in when added.
export function FlowChip({ label, removeHref, arrow }: ChipProps) {
  const { navigate } = useBoardPending();
  return (
    <button
      type="button"
      onClick={() => navigate(removeHref)}
      aria-label={`${label} 조건 풀기`}
      className="board-pop board-first board-control inline-flex h-7 min-w-32 items-center justify-center rounded-pill bg-gray-3 px-3 text-(length:--font-size-label) font-medium whitespace-nowrap text-gray-1 hover:bg-state-chip-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
    >
      {arrow ? '→ ' : ''}
      {label} ×
    </button>
  );
}

interface FlowChipsProps {
  chips: { label: string; removeHref: string }[];
}

export function FlowChips({ chips }: FlowChipsProps) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c, i) => (
        <FlowChip key={c.label} label={c.label} removeHref={c.removeHref} arrow={i > 0} />
      ))}
    </div>
  );
}
