## Testing

- Unit tests are **mandatory** for every feature that requires them.
- Unit tests live alongside the source file as `<file>.test.ts`.
- Use `vitest` for all unit tests.
- Run from root: `pnpm test` (single pass) or `pnpm test:watch` (watch).
- Run from package: `pnpm test:run` (single pass) or `pnpm test` (watch).