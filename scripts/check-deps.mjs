#!/usr/bin/env node
/* eslint-disable no-console */
// Every bare import in a workspace must be declared in THAT workspace's package.json.
// With pnpm's hoisted node_modules an undeclared package still resolves locally (it was installed
// for a sibling), then fails in EAS / Docker builds ("Module not found"). Run in CI.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const workspaces = ['apps/api', 'apps/mobile', 'packages/shared'];
const skipDirs = new Set(['node_modules', 'dist', '.expo', 'coverage', 'ios', 'android']);
const builtins = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);
// virtual / framework-provided specifiers
const virtual = [/^@\//, /^expo-router\/entry$/, /^react-native\//];

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (skipDirs.has(n)) return [];
    if (statSync(p).isDirectory()) return files(p);
    return /\.(m?[jt]sx?)$/.test(n) && !n.endsWith('.d.ts') ? [p] : [];
  });
}

let bad = 0;
for (const ws of workspaces) {
  const dir = join(root, ws);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const declared = new Set(
    Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies }),
  );
  declared.add(pkg.name);
  for (const f of files(dir)) {
    const src = readFileSync(f, 'utf8');
    const re =
      /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (const m of src.matchAll(re)) {
      const spec = m[1] ?? m[2] ?? m[3];
      if (!spec || spec.startsWith('.') || builtins.has(spec) || virtual.some((r) => r.test(spec)))
        continue;
      const name = spec.startsWith('@')
        ? spec.split('/').slice(0, 2).join('/')
        : spec.split('/')[0];
      if (!declared.has(name)) {
        bad++;
        console.error(
          `${relative(root, f)}: "${name}" is imported but not declared in ${ws}/package.json`,
        );
      }
    }
  }
}
if (bad) process.exit(1);
console.log('dependencies: every import is declared');
