// Contrast and distinctness check for design-tokens/tokens.json. Run with `pnpm tokens:contrast`
// (also part of `pnpm check`). Exits 1 when a rule fails.
//
// Rules live in tokens.json itself, so whoever edits a color sees its limit next to it:
//   token  $extensions["org.5dots.contrast"]: [{ "on": "{color.base.panel}", "min": 4.5 }, ...]
//          WCAG 2 contrast of this color against each listed background.
//   group  $extensions["org.5dots.distinct"]: { "min": 0.1, "cvdMin": 0.05 }
//          Every pair of colors inside each child group (e.g. one sankey column) must be at least
//          `min` apart in OKLab with normal vision, and `cvdMin` apart under simulated protanopia,
//          deuteranopia and tritanopia (Machado 2009, full severity).
// Mixed colors (org.5dots.mix) are blended in OKLab like CSS color-mix(in oklab, ...), then
// rounded to 8-bit sRGB as the browser paints them; the numbers match /dev/tokens.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tree = JSON.parse(readFileSync(join(ROOT, 'design-tokens/tokens.json'), 'utf8'));
const MIX = 'org.5dots.mix';
const CONTRAST = 'org.5dots.contrast';
const DISTINCT = 'org.5dots.distinct';
const ALIAS = /^\{([^}]+)\}$/;

const lookup = (path) => path.split('.').reduce((node, key) => node?.[key], tree);

// sRGB 0-255 <-> linear <-> OKLab (Ottosson).
const toLinear = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (c) => {
  const s = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, s)) * 255);
};
const linearToOklab = ([r, g, b]) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};
const oklabToLinear = ([L, a, b]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};
const rgbToOklab = (rgb) => linearToOklab(rgb.map(toLinear));
const oklabToRgb = (lab) => oklabToLinear(lab).map(fromLinear);

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
};
const rgbToHex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

/** Painted sRGB of a color token, or null when it is see-through (mixed with transparent). */
const resolve = (path) => {
  const node = lookup(path);
  if (!node || !('$value' in node)) throw new Error(`Unknown token {${path}}`);
  const raw = node.$value;
  const alias = raw.match(ALIAS);
  const base = alias ? resolve(alias[1]) : hexToRgb(raw);
  const mix = node.$extensions?.[MIX];
  if (!mix || base === null) return base;
  if (mix.with === 'transparent') return null;
  const withAlias = mix.with.match(ALIAS);
  const other = withAlias ? resolve(withAlias[1]) : hexToRgb(mix.with);
  if (other === null) return null;
  const [p, q] = [rgbToOklab(base), rgbToOklab(other)];
  return oklabToRgb(p.map((v, i) => v * mix.amount + q[i] * (1 - mix.amount)));
};

const luminance = (rgb) => {
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (x, y) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};

const CVD = {
  normal: null,
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};
const simulate = (rgb, matrix) => {
  const lin = rgb.map(toLinear);
  if (!matrix) return linearToOklab(lin);
  const out = matrix.map((row) =>
    Math.max(
      0,
      row.reduce((s, k, i) => s + k * lin[i], 0),
    ),
  );
  return linearToOklab(out);
};
const distance = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

/** Every token and group with its path. */
const walk = (node, path, out) => {
  out.push({ path, node });
  Object.entries(node)
    .filter(([k, v]) => !k.startsWith('$') && typeof v === 'object' && v !== null)
    .forEach(([k, v]) => walk(v, [...path, k], out));
  return out;
};
const nodes = walk(tree, [], []);

const rows = [];
let failed = 0;
const record = (ok, text) => {
  if (!ok) failed += 1;
  rows.push(`${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

nodes
  .filter(({ node }) => Array.isArray(node.$extensions?.[CONTRAST]))
  .forEach(({ path, node }) => {
    const name = path.join('.');
    const fg = resolve(name);
    node.$extensions[CONTRAST].forEach(({ on, min }) => {
      const bgName = on.match(ALIAS)[1];
      const bg = resolve(bgName);
      // A see-through color has no single painted value, so its contrast cannot be checked.
      // Fail loudly instead of passing: a ruled color must stay opaque.
      if (fg === null || bg === null) {
        const which = fg === null ? name : bgName;
        record(false, `${name} on ${bgName}: ${which} is see-through (mixed with transparent)`);
        return;
      }
      const ratio = contrast(fg, bg);
      record(
        ratio >= min,
        `${name} ${rgbToHex(fg)} on ${bgName}: ${ratio.toFixed(2)}:1 (min ${min}:1)`,
      );
    });
  });

nodes
  .filter(({ node }) => node.$extensions?.[DISTINCT])
  .forEach(({ path, node }) => {
    const { min, cvdMin = min } = node.$extensions[DISTINCT];
    Object.entries(node)
      .filter(([k, v]) => !k.startsWith('$') && typeof v === 'object' && !('$value' in v))
      .forEach(([column, group]) => {
        const all = Object.keys(group)
          .filter((k) => !k.startsWith('$'))
          .map((k) => ({ key: k, rgb: resolve([...path, column, k].join('.')) }));
        const name = [...path, column].join('.');
        all
          .filter((c) => c.rgb === null)
          .forEach((c) => record(false, `${name}.${c.key}: see-through (mixed with transparent)`));
        const colors = all.filter((c) => c.rgb !== null);
        Object.entries(CVD).forEach(([vision, matrix]) => {
          let worst = { d: Infinity, pair: '' };
          colors.forEach((a, i) =>
            colors.slice(i + 1).forEach((b) => {
              const d = distance(simulate(a.rgb, matrix), simulate(b.rgb, matrix));
              if (d < worst.d) worst = { d, pair: `${a.key}·${b.key}` };
            }),
          );
          const floor = matrix ? cvdMin : min;
          record(
            worst.d >= floor,
            `${name} ${vision}: closest ${worst.pair} ΔE ${worst.d.toFixed(3)} (min ${floor})`,
          );
        });
      });
  });

process.stdout.write(`${rows.join('\n')}\n`);
if (failed) {
  process.stderr.write(
    `tokens:contrast: ${failed} rule(s) failed. Fix the color, not the rule: design-tokens/AGENTS.md 6장\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(`tokens:contrast: ${rows.length} rules passed\n`);
}
