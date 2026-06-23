## Code Style Rules

These are enforced by Biome — do not fight them:

- **Indentation**: tabs (not spaces)
- **Quotes**: double quotes (`"`) in JavaScript/TypeScript
- **Imports**: auto-organized by Biome assist
- **Trailing commas**: yes
- **Semicolons**: yes
- **JSDoc**: Every function, React component, file, and `useEffect` hook MUST be properly documented using JSDoc. Documentation should explain the purpose, parameters, return types, and any side effects or constraints.

Run `pnpm format-and-lint:fix` before committing. If Biome raises a lint error, fix it — do not suppress it unless there is a strong, documented reason.
