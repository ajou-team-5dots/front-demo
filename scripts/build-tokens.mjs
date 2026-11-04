// Builds src/styles/tokens.css and src/styles/tokens.ts from design-tokens/tokens.json (DTCG).
// Run with `pnpm tokens`; `pnpm tokens --check` fails when the generated files are stale.
//
// CSS variable names (docs/DESIGN_TOKENS.md):
//   color.base.<n>      -> --<n>            (e.g. --ink, --gray-1)
//   color.<group>.<n>   -> --<group>-<n>    (e.g. --chart-death, --sankey-lv-1)
//   motion.<group>.<n>  -> --<group>-<n>    (e.g. --ease-board, --duration-fast)
//   radius.<n>          -> --corner-<n>     (--radius-* belongs to Tailwind's @theme)
//   anything else       -> --<path>         (e.g. --opacity-band-default, --font-size-label)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'design-tokens/tokens.json');
const CSS_OUT = join(ROOT, 'src/styles/tokens.css');
const TS_OUT = join(ROOT, 'src/styles/tokens.ts');
const MIX = 'org.5dots.mix';
const HEADER = 'Generated from design-tokens/tokens.json by `pnpm tokens`. Do not edit by hand.';

const tree = JSON.parse(readFileSync(SOURCE, 'utf8'));

/** Every token (an object with $value) with its path and inherited $type. */
const collect = (node, path, type, out) => {
  const groupType = node.$type ?? type;
  if ('$value' in node) {
    out.push({ path, type: groupType, node });
    return out;
  }
  Object.entries(node)
    .filter(([k, v]) => !k.startsWith('$') && typeof v === 'object')
    .forEach(([k, v]) => collect(v, [...path, k], groupType, out));
  return out;
};
const tokens = collect(tree, [], undefined, []);
const byPath = new Map(tokens.map((t) => [t.path.join('.'), t]));

const cssName = (path) => {
  const [head, ...rest] = path;
  if (head === 'color') return `--${(rest[0] === 'base' ? rest.slice(1) : rest).join('-')}`;
  if (head === 'motion') return `--${rest.join('-')}`;
  if (head === 'radius') return `--corner-${rest.join('-')}`;
  return `--${path.join('-')}`;
};

const ALIAS = /^\{([^}]+)\}$/;
const target = (ref) => {
  const t = byPath.get(ref);
  if (!t) throw new Error(`Unknown token reference {${ref}}`);
  return t;
};

/** A plain value: number, "12px", "120ms", [x1, y1, x2, y2] or a color string. */
const plain = (type, v) => {
  if (type === 'cubicBezier') return `cubic-bezier(${v.join(', ')})`;
  if (typeof v === 'object' && v !== null && 'value' in v) return `${v.value}${v.unit}`;
  return String(v);
};

/** CSS value: aliases become var(), mixes become color-mix(). */
const cssValue = (t) => {
  const raw = t.node.$value;
  const alias = typeof raw === 'string' && raw.match(ALIAS);
  const base = alias ? `var(${cssName(target(alias[1]).path)})` : plain(t.type, raw);
  const mix = t.node.$extensions?.[MIX];
  if (!mix) return base;
  const other = mix.with.match(ALIAS);
  const withValue = other ? `var(${cssName(target(other[1]).path)})` : mix.with;
  const pct = Math.round(mix.amount * 10000) / 100;
  return `color-mix(in oklab, ${base} ${pct}%, ${withValue})`;
};

/** Resolved raw value for TS: numbers for number/dimension/duration, [x1, y1, x2, y2] for
 * cubicBezier, strings otherwise. */
const resolved = (t) => {
  const raw = t.node.$value;
  if (t.type === 'cubicBezier') return raw;
  const alias = typeof raw === 'string' && raw.match(ALIAS);
  if (alias) return resolved(target(alias[1]));
  if (t.type === 'number') return raw;
  if (t.type === 'dimension' || t.type === 'duration') {
    return typeof raw === 'object' ? raw.value : Number.parseFloat(raw);
  }
  return plain(t.type, raw);
};

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

/** Nested object for TS; groups keyed 1..n become arrays (sankey columns). */
const nest = (list, leaf) => {
  const root = {};
  list.forEach((t) => {
    let cur = root;
    t.path.slice(1, -1).forEach((k) => {
      cur[k] ??= {};
      cur = cur[k];
    });
    cur[t.path.at(-1)] = leaf(t);
  });
  const arrays = (o) => {
    if (typeof o !== 'object' || Array.isArray(o)) return o;
    const keys = Object.keys(o);
    if (keys.length && keys.every((k, i) => k === String(i + 1))) return keys.map((k) => o[k]);
    return Object.fromEntries(keys.map((k) => [camel(k), arrays(o[k])]));
  };
  return arrays(root);
};

const group = (name) => tokens.filter((t) => t.path[0] === name);
const desc = (t) => t.node.$description ?? '';

const css = [
  `/* ${HEADER} */`,
  ':root {',
  ...tokens.map((t) => {
    const note = desc(t) ? ` /* ${desc(t).replaceAll('*/', '')} */` : '';
    return `  ${cssName(t.path)}: ${cssValue(t)};${note}`;
  }),
  '}',
  '',
].join('\n');

const exported = [
  ['COLOR', 'color', (t) => `var(${cssName(t.path)})`, 'CSS var() for each color.'],
  ['OPACITY', 'opacity', resolved, 'Opacity, 0–1.'],
  ['RADIUS', 'radius', resolved, 'Corner radius, px.'],
  ['SPACE', 'space', resolved, 'Spacing, px.'],
  ['FONT_SIZE', 'font-size', resolved, 'Font size, px.'],
  ['STROKE', 'stroke', resolved, 'Stroke width and point radius, px.'],
  ['SIZE', 'size', resolved, 'Bar heights and mark sizes, px.'],
  ['MOTION', 'motion', resolved, 'Easing control points [x1, y1, x2, y2] and durations (ms).'],
];

const list = tokens.map((t) => ({
  path: t.path.join('.'),
  type: t.type,
  cssVar: cssName(t.path),
  css: cssValue(t),
  value: resolved(t),
  description: desc(t),
}));

const ts = [
  `// ${HEADER}`,
  '',
  ...exported.flatMap(([name, key, leaf, doc]) => [
    `/** ${doc} */`,
    `export const ${name} = ${JSON.stringify(nest(group(key), leaf), null, 2)} as const;`,
    '',
  ]),
  'export interface TokenEntry {',
  '  path: string;',
  '  type: string;',
  '  cssVar: string;',
  '  css: string;',
  '  value: string | number | readonly number[];',
  '  description: string;',
  '}',
  '',
  '/** Every token, in file order (the /dev/tokens preview page lists these). */',
  `export const TOKEN_LIST: TokenEntry[] = ${JSON.stringify(list, null, 2)};`,
  '',
].join('\n');

const prettier = (file, text) =>
  execFileSync(join(ROOT, 'node_modules/.bin/prettier'), ['--stdin-filepath', file], {
    input: text,
    encoding: 'utf8',
  });

const outputs = [
  [CSS_OUT, prettier(CSS_OUT, css)],
  [TS_OUT, prettier(TS_OUT, ts)],
];

if (process.argv.includes('--check')) {
  const stale = outputs.filter(([file, text]) => {
    try {
      return readFileSync(file, 'utf8') !== text;
    } catch {
      return true;
    }
  });
  stale.forEach(([file]) => process.stderr.write(`stale: ${file} (run pnpm tokens)\n`));
  process.exitCode = stale.length ? 1 : 0;
} else {
  outputs.forEach(([file, text]) => writeFileSync(file, text));
  process.stdout.write(`tokens: ${tokens.length} -> src/styles/tokens.css, src/styles/tokens.ts\n`);
}
