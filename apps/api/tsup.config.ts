import { defineConfig } from 'tsup';

// Production bundle: one ESM file per entry with all JS deps inlined (incl. @roastcost/shared).
// Only native modules stay external and are installed in the runtime image.
export default defineConfig({
  entry: {
    server: 'src/server.ts',
    migrate: 'scripts/migrate.ts',
    'create-admin': 'scripts/create-admin.ts',
  },
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: [/^(?!@node-rs\/argon2|pg-native).*/],
  external: ['@node-rs/argon2', 'pg-native'],
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
});
