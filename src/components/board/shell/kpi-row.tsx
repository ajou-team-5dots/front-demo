import { cn } from '@/lib/utils';

interface Kpi {
  label: string;
  value: string;
  /** Full meaning for the hover title, e.g. "기대 대비 위험 (던전 단계 반영)". */
  title?: string;
}

interface KpiRowProps {
  /** Up to three pairs, placed at the Figma x positions. */
  items: Kpi[];
  className?: string;
}

/** Left edge of each label/value pair inside the box (Figma 25:169 / 38:623). */
const PAIR_X = [12, 121, 263];

// Figma 25:169 / 38:623: a white 380×66 box (radius 10) at the right end of the detail's title
// row. Labels 12 SemiBold gray-1 at top 12, values 22 SemiBold ink at top 28. The values fade in
// when they change (another monster).
export function KpiRow({ items, className }: KpiRowProps) {
  return (
    <dl
      className={cn(
        'board-enter relative h-[66px] w-[380px] shrink-0 rounded-panel bg-panel tabular-nums',
        className,
      )}
    >
      {items.slice(0, PAIR_X.length).map((k, i) => (
        <div
          key={k.label}
          className="absolute top-3 whitespace-nowrap"
          style={{ left: PAIR_X[i] }}
          title={k.title}
        >
          <dt className="text-(length:--font-size-label) leading-[14px] font-semibold text-gray-1">
            {k.label}
          </dt>
          <dd className="mt-0.5 text-(length:--font-size-kpi) leading-[26px] font-semibold text-ink">
            <span key={k.value} className="board-swap inline-block">
              {k.value}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
