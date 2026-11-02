// Node runs the actual data functions against ClickHouse and the committed batch JSON.
// Only Next's server-only boundary and cache metadata need a stand-in outside Next.
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (existsSync('.env.local')) loadEnvFile('.env.local');

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only' || specifier === 'next/cache') {
      const source =
        specifier === 'server-only'
          ? 'export {};'
          : 'export const cacheTag = () => {}; export const cacheLife = () => {};';
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    }
    if (specifier.startsWith('@/')) {
      return nextResolve(
        pathToFileURL(path.resolve('src', `${specifier.slice(2)}.ts`)).href,
        context,
      );
    }
    if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts')) {
      const target = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(target))) return nextResolve(target.href, context);
    }
    return nextResolve(specifier, context);
  },
});
