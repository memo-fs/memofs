## Package Build Rules (`tsdown`)

OSS packages use `tsdown` for building, **not** `tsc` alone.

### Shared config — always use the factory, never copy-paste options

The base build options live in `@repo/tsdown`. Every package's `tsdown.config.ts` **must** import from there:

```ts
// packages/<name>/tsdown.config.ts
import { pkgConfig } from "@repo/tsdown";

export default pkgConfig({ entry: "src/index.ts" });
```

Only override what genuinely differs for that package (e.g. a different `entry` or `platform`). Do not duplicate `format`, `sourcemap`, `minify`, `target`, or `platform` unless you have a specific reason to deviate from the base.

The base options that `pkgConfig` applies by default:

| Option | Value |
|---|---|
| `format` | `["esm", "cjs"]` |
| `sourcemap` | `true` |
| `target` | `"node20"` |
| `platform` | `"node"` |
| `dts` | `true` |
| `clean` | `true` |
| `fixedExtension` | `true` |

### Export map

All packages must ship a dual ESM + CJS build. The `package.json` export map must always specify all three fields:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  }
}
```

Run `pnpm lint:package` (via `publint`) to validate the export map before opening a PR.