## Git Conventions

- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`
- Commit messages: imperative mood, present tense (`add memory patch utility`, not `added...`)
- Do not commit directly to `main` — open a PR
- Keep PRs focused: one feature or fix per PR

### Commit Messages

When this agent creates a Git commit in this repository, it must use the
Conventional Commits format unless the user explicitly asks for a different
convention.

Format:

```text
type: subject
type(scope): subject
```

Rules:

- Do not commit directly to `main` — open a PR
- Keep PRs focused: one feature or fix per PR
- Use one of these lowercase commit types: `feat`, `fix`, `chore`,
  `refactor`, `docs`, `style`, `test`, `perf`, `ci`, `build`, `revert`
- Keep the commit type lowercase
- Write a short subject after the colon
- Keep the subject concise and under the hook-enforced 100 character limit
- Use the optional body for extra detail that does not fit in the subject
- Use the body to explain what changed and why when helpful
- Wrap body lines to stay within the hook-enforced 100 character limit
- When creating a multiline commit from the CLI, use multiple `-m` flags or
  the commit editor instead of embedding literal `\n` sequences
- If the change is breaking, include `BREAKING CHANGE: <description>` in the
  body
- If relevant, use the footer to reference the linked ticket or story, for
  example `Closes D2IQ-12345`

Type guide:

- `feat` - a new feature is introduced with the changes
- `fix` - a bug fix has occurred
- `chore` - changes that do not relate to a fix or feature and do not modify
  `src` or test files
- `refactor` - refactored code that neither fixes a bug nor adds a feature
- `docs` - updates to documentation such as the `README` or other markdown
  files
- `style` - changes that do not affect the meaning of the code, usually
  formatting-related
- `test` - including new tests or correcting previous tests
- `perf` - performance improvements
- `ci` - continuous integration related changes
- `build` - changes that affect the build system or external dependencies
- `revert` - reverts a previous commit

Examples:

```text
fix: fix foo to enable bar

This fixes the broken behavior of the component by doing xyz.

BREAKING CHANGE: Before this fix foo wasn't enabled at all, behavior changes
from <old> to <new>

Closes D2IQ-12345
```

```text
perf: reduce sandbox preview startup work
```