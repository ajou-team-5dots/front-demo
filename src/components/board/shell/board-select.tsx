'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface BoardSelectOption {
  value: string;
  label: string;
}

interface BoardSelectProps {
  id: string;
  /** Accessible name; the trigger shows the selected option's label. */
  label: string;
  value: string;
  options: BoardSelectOption[];
  onChange: (value: string) => void;
  /** Trigger width class, Figma 22:17 is 95px. */
  widthClass?: string;
}

// The empty string means "all" in our filters, but the select needs a real value for it.
const ALL = '__all__';
const toUi = (v: string) => (v === '' ? ALL : v);
const fromUi = (v: string) => (v === ALL ? '' : v);

// Figma 22:17 select (2px gray-2 border, radius 6, 12 Medium, text inset 19) with a designed
// popup: white, gray-2 border, items left-aligned on the same x as the trigger text.
export function BoardSelect({
  id,
  label,
  value,
  options,
  onChange,
  widthClass = 'w-[95px]',
}: BoardSelectProps) {
  const items = options.map((o) => ({ value: toUi(o.value), label: o.label }));
  return (
    <Select
      items={items}
      value={toUi(value)}
      onValueChange={(v) => {
        if (typeof v === 'string') onChange(fromUi(v));
      }}
    >
      <SelectTrigger
        id={id}
        aria-label={label}
        className={cn(
          'board-control h-[30px] gap-1 rounded-control border-2 border-gray-2 bg-panel pr-2 pl-[17px] text-(length:--font-size-label) font-medium text-ink hover:border-gray-1 focus-visible:border-ink focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink data-[size=default]:h-[30px] [&_svg]:text-ink',
          widthClass,
        )}
      >
        <SelectValue className="truncate" />
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        sideOffset={4}
        className="w-max min-w-(--anchor-width) rounded-control border border-gray-2 bg-panel p-1 shadow-none ring-0"
      >
        {items.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            className="h-8 rounded-control pr-8 pl-[13px] text-(length:--font-size-label) font-medium text-gray-1 focus:bg-gray-3 focus:text-ink data-selected:text-ink"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
