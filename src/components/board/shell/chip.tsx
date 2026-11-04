'use client';

import { X } from 'lucide-react';

import { useBoardPending } from './board-pending';

interface FlowChipItem {
  /** Column name, drawn light ("레벨"). */
  column: string;
  /** Picked value, drawn dark ("1~19"). */
  value: string;
  /** Href of the same page without this chip. */
  removeHref: string;
}

// One picked flow cell: gray-3 fill, radius pill, as wide as its text. The whole chip is the
// remove button; the X icon (state.chip-close, ink on hover) only marks it. Column name light,
// value dark; on hover the whole chip goes ink. Pops in when added.
export function FlowChip({ column, value, removeHref }: FlowChipItem) {
  const { navigate } = useBoardPending();
  const label = `${column} · ${value}`;
  return (
    <button
      type="button"
      onClick={() => navigate(removeHref)}
      aria-label={`${label} 조건 풀기`}
      className="group board-pop board-first board-control inline-flex h-(--size-chip) items-center rounded-pill bg-gray-3 px-(--space-chip-inset) text-(length:--font-size-label) whitespace-nowrap hover:bg-state-chip-hover focus-visible:outline-2 focus-visible:outline-ink"
    >
      <span className="font-medium text-gray-1 group-hover:text-ink">{column}</span>
      <span className="ml-(--space-chip-part-gap) font-semibold text-ink">{value}</span>
      <X
        aria-hidden
        className="ml-(--space-chip-close-gap) size-(--size-icon-chip-close) shrink-0 text-state-chip-close group-hover:text-ink"
      />
    </button>
  );
}

interface FlowChipsProps {
  chips: FlowChipItem[];
}

// The picked cells all apply together (AND), so the chips sit side by side with only a gap:
// no arrows, which would read as an order.
export function FlowChips({ chips }: FlowChipsProps) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-(--space-chip-gap)">
      {chips.map((c) => (
        <FlowChip key={c.column} {...c} />
      ))}
    </div>
  );
}
