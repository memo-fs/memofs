# Notes

Use this file for lower-confidence notes, observations, and working memory.

## 2026-07-18T06:20:17.544Z — resolveSchemaPath: emit portable ./node_modules ref instead of computed relative path
- kind: decision
- tags: cli, config, schema, portability, bug-fix
- confidence: 0.95
- source: memofs
- metadata: {"id":"mem_b33e8c27403afeac","sourceRefs":[{"sourceType":"document","path":"packages/cli/src/config/runtime.ts","title":"resolveSchemaPath implementation"},{"sourceType":"document","path":"packages/cli/tests/config-schema.test.ts","title":"resolveSchemaPath tests"},{"sourceType":"document","path":"apps/docs/packages/cli/index.md","title":"docs $schema example"}]}

resolveSchemaPath (packages/cli/src/config/runtime.ts) was rewritten. The previous implementation called `require.resolve("@memofs/cli/schema/config.json")` and then `path.relative(rootDir/.memofs, resolvedFile)`. Inside the MemoFS monorepo, `@memofs/cli` is a workspace symlink under `node_modules/@memofs/cli -> ../../packages/cli`, and `require.resolve` follows the symlink to the *source* path `packages/cli/schema/config.json` — which lives outside the consumer's project root. `path.relative` then climbs past the root and emits non-portable paths like `../../packages/cli/schema/config.json` or even `../../../Users/.../packages/cli/schema/config.json`.\n\nNew strategy: emit a deterministic, portable `./node_modules/@memofs/cli/schema/config.json` reference (the value the docs advertise) when that file exists under `<rootDir>`; otherwise fall back to the hosted URL `https://memofs.dev/schema/config.json`. `existsSync` follows symlinks, so for npm/pnpm/yarn installs (including workspace symlinks under `node_modules/`) the canonical ref is emitted. For global installs / stripped bundles, the hosted URL keeps editor validation working.\n\nRemoved the now-unused `locateSchemaFile` helper (and `createRequire` / `fileURLToPath` imports). Added `tests/config-schema.test.ts` with 4 tests covering: (1) canonical ref when schema is installed under root, (2) hosted URL fallback when it isn't, (3) regression test that the emitted string never contains `..` (catches the upward-climbing bug), (4) sanity that the packaged schema file used as symlink target actually exists. All 200 CLI tests pass; typecheck + biome clean.
