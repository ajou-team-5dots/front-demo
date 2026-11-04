import { cn } from '@/lib/utils';

interface Kpi {
  label: string;
  /** The number only ("4,429", "4.74"), or a word when there is no number ("사망 0건"). */
  value: string;
  /** Unit drawn small and gray after the number ("건", "배"). */
  unit?: string;
  /** Comparison line under the value, e.g. "36종 중 2위". */
  sub?: string;
  /** Full meaning for the hover title, e.g. "기대 대비 위험 (던전 단계 반영)". */
  title?: string;
}

interface KpiRowProps {
  /** Up to three, in equal columns. */
  items: Kpi[];
  className?: string;
}

// A white 456×88 box (radius 10, no border) at the right end of the detail's title row: three
// equal columns of label (12 SemiBold gray-1), value (32 Bold ink, tabular) with its unit
// (16 gray-1), and a comparison line (11 gray-1). The values fade in when they change.
export function KpiRow({ items, className }: KpiRowProps) {
  return (
    <dl
      className={cn(
        'board-enter grid h-[88px] w-[456px] shrink-0 grid-cols-3 gap-4 rounded-panel bg-panel px-4 py-2.5 tabular-nums',
        className,
      )}
    >
      {items.slice(0, 3).map((k) => (
        <div key={k.label} className="flex min-w-0 flex-col whitespace-nowrap" title={k.title}>
          <dt className="text-(length:--font-size-label) leading-[14px] font-semibold text-gray-1">
            {k.label}
          </dt>
          <dd className="mt-0.5 leading-9 text-ink">
            <span
              key={k.value}
              className="board-swap inline-block text-(length:--font-size-kpi) font-bold tracking-tight"
            >
              {k.value}
            </span>
            {k.unit ? (
              <span className="ml-0.5 text-(length:--font-size-kpi-unit) font-semibold text-gray-1">
                {k.unit}
              </span>
            ) : null}
          </dd>
          {k.sub ? (
            <dd className="mt-0.5 text-(length:--font-size-caption) leading-[13px] font-semibold text-gray-1">
              {k.sub}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
