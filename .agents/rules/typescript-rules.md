## TypeScript Rules

- All packages use **strict TypeScript ESM**
- Do not use `any` unless explicitly required and documented
- Prefer `unknown` over `any` for untrusted external data
- All public package exports must have explicit return types
- Do not use `// @ts-ignore` — fix the type instead
- Target: `ES2022`, module resolution: `bundler`