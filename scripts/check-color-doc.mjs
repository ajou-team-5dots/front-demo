// Checks that the hex colors written in docs/COLOR_RATIONALE.md still match design-tokens/tokens.json
// (light values). Run with `pnpm tokens:doc` (also part of `pnpm check`).
//
// Per table row of the document:
//   - a row naming a token (`--chart-death`) must contain that token's hex. Fails otherwise.
//   - a hex in a row without a token name must equal some token's painted value (mixes included,
//     e.g. the light pink of the focus zone). If no token has it, only a warning is printed.
// Case is ignored. The document is the user's own writing: when this fails, fix the hex in the
// document or the token on purpose, never the sentence around it.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = 'docs/COLOR_RATIONALE.md';
const tree = JSON.parse(readFileSync(join(ROOT, 'design-tokens/tokens.json'), 'utf8'));
const doc = readFileSync(join(ROOT, DOC), 'utf8');
const MIX = 'org.5dots.mix';
const ALIAS = /^\{([^}]+)\}$/;

// sRGB <-> OKLab, as CSS color-mix(in oklab, ...) and scripts/check-contrast.mjs do.
const toLinear = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (c) => {
  const s = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, s)) * 255);
};
const toOklab = (rgb) => {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};
const fromOklab = ([L, a, b]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(fromLinear);
};
const hexToRgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const rgbToHex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

const lookup = (path) => path.split('.').reduce((node, key) => node?.[key], tree);
/** Painted light value of a color token as #rrggbb, or null when mixed with transparent. */
const resolve = (path) => {
  const node = lookup(path);
  const alias = node.$value.match(ALIAS);
  const base = alias ? resolve(alias[1]) : node.$value.toLowerCase();
  const mix = node.$extensions?.[MIX];
  if (!mix || base === null) return base;
  if (mix.with === 'transparent') return null;
  const w = mix.with.match(ALIAS);
  const other = w ? resolve(w[1]) : mix.with.toLowerCase();
  if (other === null) return null;
  const [p, q] = [toOklab(hexToRgb(base)), toOklab(hexToRgb(other))];
  return rgbToHex(fromOklab(p.map((v, i) => v * mix.amount + q[i] * (1 - mix.amount))));
};

/** CSS variable name -> painted hex, for every color token (same names as src/styles/tokens.css). */
const byVar = new Map();
const walk = (node, path) => {
  if ('$value' in node) {
    const rest = path.slice(1);
    const name = `--${(rest[0] === 'base' ? rest.slice(1) : rest).join('-')}`;
    byVar.set(name, resolve(path.join('.')));
    return;
  }
  Object.entries(node)
    .filter(([k, v]) => !k.startsWith('$') && typeof v === 'object')
    .forEach(([k, v]) => walk(v, [...path, k]));
};
walk(tree.color, ['color']);
const known = new Set([...byVar.values()].filter(Boolean));

const HEX = /#[0-9a-fA-F]{6}\b/g;
const VAR = /`(--[a-z0-9-]+)`/g;
const rows = [];
let failed = 0;
let warned = 0;

doc.split('\n').forEach((line, i) => {
  if (!line.trimStart().startsWith('|')) return;
  const at = `${DOC}:${i + 1}`;
  const hexes = [...line.matchAll(HEX)].map((m) => m[0].toLowerCase());
  const vars = [...line.matchAll(VAR)].map((m) => m[1]).filter((v) => byVar.has(v));
  vars.forEach((v) => {
    const want = byVar.get(v);
    if (hexes.includes(want)) {
      rows.push(`ok   ${at} ${v} ${want}`);
    } else {
      failed += 1;
      rows.push(`FAIL ${at} ${v}: document has ${hexes.join(', ') || 'no hex'}, token is ${want}`);
    }
  });
  if (vars.length) return;
  hexes.forEach((h) => {
    if (known.has(h)) return;
    warned += 1;
    rows.push(`warn ${at} ${h}: no token paints this color (not checked)`);
  });
});

process.stdout.write(`${rows.join('\n')}\n`);
const summary = `tokens:doc: ${failed} failed, ${warned} warning(s)`;
if (failed) {
  process.stderr.write(`${summary}. Fix the hex in ${DOC} or the token, not the sentence.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${summary}\n`);
}
