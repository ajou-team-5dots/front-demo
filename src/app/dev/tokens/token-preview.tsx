'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { SignalBadge } from '@/components/board/detail/signal-badge';
import { Panel } from '@/components/board/shell/panel';
import { cn } from '@/lib/utils';
import { COLOR, OPACITY, RADIUS, SIZE, STROKE, TOKEN_LIST, type TokenEntry } from '@/styles/tokens';

// Every token from design-tokens/tokens.json, grouped as in the file. Color cards show the
// contrast ratio on the two surfaces the board uses (panel white, page gray-3), measured from the
// rendered color, so color-mix tokens are checked as they actually paint.

type Rgba = [number, number, number, number];

/** Paints a CSS color on a 1×1 canvas and reads it back as sRGB bytes. */
const resolveColor = (ctx: CanvasRenderingContext2D, css: string): Rgba => {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
};

const luminance = ([r, g, b]: Rgba) => {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const contrast = (fg: Rgba, bg: Rgba) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const hex = ([r, g, b]: Rgba) =>
  `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;

interface Measured {
  hex: string;
  onPanel: number | null;
  onPage: number | null;
}

/** Rendered hex and contrast for every color token (null for see-through colors). */
function measureColors(): Record<string, Measured> {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!ctx) return {};
  // Resolve var() chains on a probe element; the canvas does not understand var().
  const probe = document.createElement('span');
  document.body.appendChild(probe);
  const paint = (cssVar: string): Rgba => {
    probe.style.color = `var(${cssVar})`;
    return resolveColor(ctx, getComputedStyle(probe).color);
  };
  const panel = paint('--panel');
  const page = paint('--gray-3');
  const out: Record<string, Measured> = {};
  TOKEN_LIST.filter((t) => t.type === 'color').forEach((t) => {
    const c = paint(t.cssVar);
    const solid = c[3] === 1;
    out[t.cssVar] = {
      hex: solid ? hex(c) : `${hex(c)} · ${Math.round(c[3] * 100)}%`,
      onPanel: solid ? contrast(c, panel) : null,
      onPage: solid ? contrast(c, page) : null,
    };
  });
  probe.remove();
  return out;
}

function useMeasuredColors(): Record<string, Measured> {
  const [out, setOut] = useState<Record<string, Measured>>({});
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOut(measureColors()));
    return () => cancelAnimationFrame(frame);
  }, []);
  return out;
}

const byPrefix = (prefix: string) => TOKEN_LIST.filter((t) => t.path.startsWith(`${prefix}.`));
const shortName = (t: TokenEntry, prefix: string) => t.path.slice(prefix.length + 1);

function Ratio({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-1">–</span>;
  let verdict = '부족';
  if (value >= 4.5) verdict = '글자 OK';
  else if (value >= 3) verdict = '그래픽 OK';
  return (
    <span className={value >= 3 ? 'text-ink' : 'text-status-danger'}>
      {value.toFixed(2)}:1 <span className="text-gray-1">{verdict}</span>
    </span>
  );
}

function ColorCard({ t, prefix, m }: { t: TokenEntry; prefix: string; m?: Measured }) {
  return (
    <li className="flex gap-3 rounded-control border border-gray-3 p-2">
      <span
        aria-hidden
        className="size-12 shrink-0 rounded-control border border-gray-3"
        style={{ background: `var(${t.cssVar})` }}
      />
      <span className="flex min-w-0 flex-col text-(length:--font-size-caption) leading-[15px]">
        <span className="text-(length:--font-size-label) font-semibold text-ink">
          {shortName(t, prefix)}
        </span>
        <code className="text-gray-1">{t.cssVar}</code>
        <span className="truncate text-gray-1" title={t.css}>
          {m?.hex ?? t.css}
        </span>
        <span className="tabular-nums">
          패널 <Ratio value={m?.onPanel ?? null} /> · 바탕 <Ratio value={m?.onPage ?? null} />
        </span>
        {t.description ? <span className="text-gray-1">{t.description}</span> : null}
      </span>
    </li>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Panel title={title} meta={hint} className="pb-4">
      <div className="mt-3">{children}</div>
    </Panel>
  );
}

function Row({ t, prefix, children }: { t: TokenEntry; prefix: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[220px_120px_1fr] items-center gap-4 py-1.5">
      <span className="flex flex-col">
        <span className="text-(length:--font-size-label) font-semibold text-ink">
          {shortName(t, prefix)}
        </span>
        <code className="text-(length:--font-size-caption) text-gray-1">{t.cssVar}</code>
      </span>
      <span className="text-(length:--font-size-label) text-ink tabular-nums">
        {Array.isArray(t.value) ? t.value.join(', ') : t.value}
      </span>
      <span className="flex min-w-0 items-center gap-4">
        {children}
        <span className="text-(length:--font-size-caption) text-gray-1">{t.description}</span>
      </span>
    </li>
  );
}

const COLOR_GROUPS = [
  ['color.base', '기본 (글자, 바탕, 테두리)'],
  ['color.chart', '차트 의미색'],
  ['color.status', '상태 (항상 글자와 함께)'],
  ['color.sankey', '흐름도 칸별 색 (lv 레벨 · wp 무기 · ar 방어구 · grp 몬스터 집단)'],
  ['color.scatter', '산점도'],
  ['color.text-scale', '작은 글자용 대비 보정 색'],
  ['color.state', '상호작용 바탕'],
] as const;

/** Four ribbons at the band opacity steps, in sankey hues. */
function BandSample() {
  const steps = [
    ['기본', OPACITY.band.default],
    ['hover', OPACITY.band.hover],
    ['선택', OPACITY.band.picked],
    ['흐림', OPACITY.band.dim],
  ] as const;
  return (
    <svg width={520} height={150} role="img" aria-label="흐름도 띠 불투명도 예시">
      {steps.map(([label, o], i) => {
        const y = 10 + i * 34;
        const x0 = 96;
        const x1 = 380;
        return (
          <g key={label}>
            <text x={0} y={y + 16} fontSize={12} fill="var(--gray-1)">
              {label} {o}
            </text>
            <defs>
              <linearGradient id={`band-${i}`} x1={x0} x2={x1} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={COLOR.sankey.lv[i]} />
                <stop offset="100%" stopColor={COLOR.sankey.wp[i]} />
              </linearGradient>
            </defs>
            <rect
              x={x0 - SIZE.sankey.nodeWidth}
              y={y}
              width={SIZE.sankey.nodeWidth}
              height={24}
              rx={RADIUS.mark}
              fill={COLOR.sankey.lv[i]}
            />
            <path
              d={`M${x0} ${y}C${(x0 + x1) / 2} ${y},${(x0 + x1) / 2} ${y + 4},${x1} ${y + 4}V${y + 28}C${(x0 + x1) / 2} ${y + 28},${(x0 + x1) / 2} ${y + 24},${x0} ${y + 24}Z`}
              fill={`url(#band-${i})`}
              opacity={o}
            />
            <rect
              x={x1}
              y={y + 4}
              width={SIZE.sankey.nodeWidth}
              height={24}
              rx={RADIUS.mark}
              fill={COLOR.sankey.wp[i]}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** A small scatter: zone wash, 1× and 2× lines, the three risk colors, one dimmed mark. */
function ScatterSample() {
  const marks: [number, number, string, number][] = [
    [60, 110, COLOR.scatter.below, 1],
    [110, 96, COLOR.scatter.below, OPACITY.dim.mark],
    [150, 70, COLOR.scatter.mid, 1],
    [210, 64, COLOR.scatter.mid, 1],
    [270, 30, COLOR.scatter.high, 1],
    [330, 22, COLOR.scatter.high, 1],
  ];
  return (
    <svg width={400} height={140} role="img" aria-label="산점도 예시">
      <rect x={240} y={4} width={156} height={44} fill={COLOR.scatter.zone} />
      <line
        x1={20}
        x2={396}
        y1={48}
        y2={48}
        stroke="var(--chart-death)"
        strokeOpacity={OPACITY.line.flag}
        strokeWidth={STROKE.width.thin}
      />
      <line
        x1={20}
        x2={396}
        y1={84}
        y2={84}
        stroke="var(--ink)"
        strokeOpacity={OPACITY.line.reference}
        strokeWidth={STROKE.width.regular}
        strokeDasharray="5 4"
      />
      <line
        x1={240}
        x2={240}
        y1={4}
        y2={130}
        stroke="var(--gray-1)"
        strokeOpacity={OPACITY.line.median}
        strokeWidth={STROKE.width.thin}
        strokeDasharray="3 3"
      />
      <line
        x1={20}
        x2={396}
        y1={130}
        y2={130}
        stroke="var(--gray-2)"
        strokeWidth={STROKE.width.thin}
      />
      {marks.map(([x, y, fill, o]) => (
        <circle key={`${x}`} cx={x} cy={y} r={STROKE.point.mark} fill={fill} opacity={o} />
      ))}
    </svg>
  );
}

/** Skill bars, a readiness share bar and a dumbbell at their token sizes. */
function BarSample() {
  return (
    <div className="flex w-[420px] flex-col gap-3">
      {[
        ['bg-chart-death', '50%'],
        ['bg-chart-survival', '36%'],
      ].map(([fill, w]) => (
        <div key={fill} className="h-(--size-bar-skill) rounded-mark bg-chart-track">
          <div className={cn('h-full rounded-mark', fill)} style={{ width: w }} />
        </div>
      ))}
      <div className="h-(--size-bar-share) overflow-hidden rounded-mark bg-chart-track">
        <div className="h-full w-[16%] rounded-mark bg-chart-actual" />
      </div>
      <div className="relative h-3">
        <div className="absolute top-[5.5px] right-0 left-0 h-px bg-chart-track" />
        <div className="absolute top-[calc(6px-var(--size-dumbbell-line)/2)] left-[20%] h-(--size-dumbbell-line) w-[45%] rounded-full bg-chart-comparison" />
        <div className="absolute -top-px left-[20%] size-(--size-dumbbell-dot) -translate-x-1/2 rounded-full bg-chart-survival" />
        <div className="absolute -top-px left-[65%] size-(--size-dumbbell-dot) -translate-x-1/2 rounded-full bg-chart-death" />
      </div>
    </div>
  );
}

export function TokenPreview() {
  const measured = useMeasuredColors();
  const opacity = byPrefix('opacity');
  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-(--space-panel-gap) p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-(length:--font-size-display) leading-[29px] font-semibold text-ink">
          디자인 토큰
        </h1>
        <p className="text-(length:--font-size-label) text-gray-1">
          원본 design-tokens/tokens.json · 바꾼 뒤 pnpm tokens · 설명 docs/DESIGN_TOKENS.md · 대비
          기준: 글자 4.5:1, 그래픽(점·선·막대) 3:1
        </p>
      </header>

      <Section title="작은 차트 예시" hint="토큰 값만으로 그린 견본">
        <div className="flex flex-wrap items-start gap-10">
          <BandSample />
          <ScatterSample />
          <BarSample />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <SignalBadge tone="danger">점검 신호</SignalBadge>
              <SignalBadge tone="warning">표본 부족</SignalBadge>
              <SignalBadge tone="supported">가설 지지</SignalBadge>
            </div>
            <p className="text-(length:--font-size-body-sm) font-semibold tabular-nums">
              <span style={{ color: COLOR.textScale.flag }}>4.74배</span>{' '}
              <span style={{ color: COLOR.textScale.sub }}>2단계 · 보스</span>
            </p>
          </div>
        </div>
      </Section>

      {COLOR_GROUPS.map(([prefix, title]) => (
        <Section key={prefix} title={title} hint={prefix}>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2">
            {byPrefix(prefix).map((t) => (
              <ColorCard key={t.path} t={t} prefix={prefix} m={measured[t.cssVar]} />
            ))}
          </ul>
        </Section>
      ))}

      <Section title="불투명도" hint="opacity">
        <ul>
          {opacity.map((t) => (
            <Row key={t.path} t={t} prefix="opacity">
              <span
                aria-hidden
                className="h-5 w-24 shrink-0 rounded-mark bg-chart-comparison"
                style={{ opacity: `var(${t.cssVar})` }}
              />
            </Row>
          ))}
        </ul>
      </Section>

      <Section title="글자 크기" hint="font-size · 클래스 text-(length:--font-size-…)">
        <ul>
          {byPrefix('font-size').map((t) => (
            <Row key={t.path} t={t} prefix="font-size">
              <span
                className="shrink-0 font-semibold text-ink"
                style={{ fontSize: `var(${t.cssVar})` }}
              >
                위험 4.74배
              </span>
            </Row>
          ))}
        </ul>
      </Section>

      <Section title="선 두께 · 점 크기" hint="stroke">
        <ul>
          {byPrefix('stroke.width').map((t) => (
            <Row key={t.path} t={t} prefix="stroke">
              <svg width={96} height={12} aria-hidden className="shrink-0">
                <line
                  x1={0}
                  x2={96}
                  y1={6}
                  y2={6}
                  stroke="var(--ink)"
                  strokeWidth={t.value as number}
                />
              </svg>
            </Row>
          ))}
          {byPrefix('stroke.point').map((t) => (
            <Row key={t.path} t={t} prefix="stroke">
              <svg width={96} height={20} aria-hidden className="shrink-0">
                <circle cx={10} cy={10} r={t.value as number} fill="var(--chart-actual)" />
              </svg>
            </Row>
          ))}
        </ul>
      </Section>

      <Section title="크기 · 모서리 · 간격" hint="size · radius · space">
        <ul>
          {byPrefix('size').map((t) => (
            <Row key={t.path} t={t} prefix="size">
              <span
                aria-hidden
                className="w-24 shrink-0 rounded-mark bg-chart-comparison"
                style={{ height: `var(${t.cssVar})` }}
              />
            </Row>
          ))}
          {byPrefix('radius').map((t) => (
            <Row key={t.path} t={t} prefix="radius">
              <span
                aria-hidden
                className="h-8 w-24 shrink-0 border-2 border-ink bg-gray-3"
                style={{ borderRadius: `var(${t.cssVar})` }}
              />
            </Row>
          ))}
          {byPrefix('space').map((t) => (
            <Row key={t.path} t={t} prefix="space">
              <span aria-hidden className="flex shrink-0" style={{ gap: `var(${t.cssVar})` }}>
                <span className="size-5 rounded-mark bg-gray-2" />
                <span className="size-5 rounded-mark bg-gray-2" />
              </span>
            </Row>
          ))}
        </ul>
      </Section>

      <Section title="모션" hint="motion · prefers-reduced-motion 이면 모두 꺼짐">
        <ul>
          {byPrefix('motion').map((t) => (
            <Row key={t.path} t={t} prefix="motion">
              {null}
            </Row>
          ))}
        </ul>
      </Section>
    </main>
  );
}
