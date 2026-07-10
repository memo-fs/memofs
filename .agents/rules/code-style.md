## Code Style Rules

These are enforced by Biome — do not fight them:

- **Indentation**: tabs (not spaces)
- **Quotes**: double quotes (`"`) in JavaScript/TypeScript
- **Imports**: auto-organized by Biome assist
- **Trailing commas**: yes
- **Semicolons**: yes

## TSDoc Documentation Rules

Every file MUST have a file-level `/** ... */` header explaining the module's purpose, architectural rationale, and cross-references (`@see`). Every exported function, class, interface, type alias, const, and React component MUST have a TSDoc block. Internal (non-exported) helpers get a one-line `/** ... */` description.

Required tags (where applicable):

- `@param name - description` for each parameter (not the type — TS handles that)
- `@returns` when the function returns something non-obvious
- `@throws` when the function can throw
- `@example` for complex/public APIs
- `@defaultValue` for optional params with a default
- `@see` for cross-references to related modules, ADRs, or architecture docs

Forbidden patterns:

- No `{Type}` brace syntax in `@param`/`@returns` — write the description only
- No redundant comments that restate the code ("sets x to 1", "returns the result")
- No commented-out code blocks — remove them or leave a one-line `TODO(...)` if they must be preserved temporarily
- No `console.log` in production code — use `console.error` for actual errors with a `[module]` prefix tag, or structured logging

Run `pnpm format-and-lint:fix` before committing. If Biome raises a lint error, fix it — do not suppress it unless there is a strong, documented reason.
