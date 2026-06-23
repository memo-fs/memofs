# @repo/utils

Shared utility helpers for TekMemo packages.

This internal package provides common utility functions used across TekMemo packages. It keeps the codebase DRY and ensures consistent behavior.

## Exports;

### Type Guards;

```ts
import { isNotFoundError } from "@repo/utils";

if (isNotFoundError(error)) {
  // Handle not found error
}
```

### JSON Helpers;

```ts
import { cloneJson, uniqueStrings } from "@repo/utils";

// Deep clone JSON-safe values (rejects non-JSON values)
const cloned = cloneJson(data);

// Deduplicate string array
const unique = uniqueStrings(["a", "b", "a", "c"]);
// Returns: ["a", "b", "c"]
```

### Path Utilities;

```ts
import { normalizePath, joinPaths } from "@repo/utils";

const normalized = normalizePath("some//path/../with/./weird/..");
// Returns: "some/with"

const joined = joinPaths("base", "path/to/file");
// Returns: "base/path/to/file"
```

### Other Utilities;

```ts
import { assertString, sleep } from "@repo/utils";

// Assert value is a string (throws if not)
assertString(value, "parameterName");

// Sleep for milliseconds
await sleep(1000); // 1 second
```

---

## API Reference;

### `isNotFoundError(error)` → `boolean`;

Check if an error is a "not found" type error:

```ts
function isNotFoundError(error: unknown): boolean;
```

Checks for:
- Error name containing "notfound", "not_found"
- Error code "ENOENT" or containing "not_found"
- Error message containing "not found" or "does not exist"

### `cloneJson(value)` → `unknown`;

Deep clone a JSON-safe value:

```ts
function cloneJson<T>(value: T): T;
```

Rejects:
- Circular references
- `undefined`
- Functions
- Symbols
- BigInt
- Non-finite numbers (NaN, Infinity)

### `uniqueStrings(arr)` → `string[]`;

Remove duplicates from a string array:

```ts
function uniqueStrings(arr: string[]): string[];
```

### `assertString(value, name?)` → `void`;

Assert a value is a string:

```ts
function assertString(value: unknown, name?: string): asserts value is string;
```

Throws `MemoryValidationError` if value is not a string.

### `sleep(ms)` → `Promise<void>`;

Sleep for a given number of milliseconds:

```ts
function sleep(ms: number): Promise<void>;
```

### `PathLock`;

Utility for preventing concurrent operations on the same path:

```ts
import { PathLock } from "@repo/utils";

const lock = new PathLock();

await lock.runExclusive("/path/to/file", async () => {
  // Only one operation can run at a time for this path
});
```

---

## Package boundary;

**This package owns:**
- Common type guards
- JSON utilities
- Path utilities
- String utilities
- Simple async utilities (sleep, locks)

**This package does NOT own:**
- Package-specific logic
- Build configuration (see `@repo/tsdown`)
- TypeScript configuration (see `@repo/typescript`)

---

## Related packages

- `@repo/tsdown` — Shared tsdown build configuration
- `@repo/typescript` — Shared TypeScript configurations
