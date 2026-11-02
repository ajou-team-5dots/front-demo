import { defineConfig, globalIgnores } from 'eslint/config';
import { configs, plugins } from 'eslint-config-airbnb-extended';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),

  // Airbnb style guide (JS + React + Next.js + TypeScript).
  // airbnb-extended bundles the Next.js plugin, so eslint-config-next is not used.
  plugins.stylistic,
  plugins.importX,
  plugins.node,
  plugins.react,
  plugins.reactA11y,
  plugins.reactHooks,
  plugins.next,
  plugins.typescriptEslint,
  ...configs.base.all,
  ...configs.react.all,
  ...configs.next.all,

  // Team overrides. Keep this list short and explain every entry in docs/CONVENTION.md.
  {
    rules: {
      // Next.js App Router requires default exports for page/layout files.
      'import-x/prefer-default-export': 'off',
      // React 17+ JSX transform: no need to import React.
      'react/react-in-jsx-scope': 'off',
      // Props spreading is the shadcn/ui component pattern.
      'react/jsx-props-no-spreading': 'off',
      // TypeScript types replace runtime prop-types.
      'react/require-default-props': 'off',
      // any disables type checking from that point on. Use unknown and narrow instead.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // shadcn/ui generated components are vendored code; keep them close to upstream.
    files: ['src/components/ui/**'],
    rules: {
      'import-x/no-extraneous-dependencies': 'off',
      'react/function-component-definition': 'off',
      'no-restricted-exports': 'off',
    },
  },

  {
    // Env vars (DB credentials etc.) may only be read in the server data layer. See docs/CONVENTION.md 7.
    files: ['src/**'],
    ignores: ['src/server/**'],
    rules: {
      'n/no-process-env': 'error',
    },
  },

  // Must stay last: turns off formatting rules that Prettier owns.
  prettierConfig,
]);
