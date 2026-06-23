# @repo/tsdown

Shared tsdown configuration for TekMemo packages.

This internal package provides the base tsdown configuration that all public packages use. It ensures consistent build output across the monorepo.

## Usage

Import and use the factory function in your package's `tsdown.config.ts`:

```ts
// packages/your-package/tsdown.config.ts
import { pkgConfig } from "@repo/tsdown";

export default pkgConfig({ entry: "src/index.ts" });
```

---

## Default Options

The `pkgConfig` factory applies these defaults:

| Option | Value | Description |
|--------|-------|-------------|
| `format` | `["esm", "cjs"]` | Build both ESM and CJS outputs |
| `sourcemap` | `true` | Generate source maps |
| `minify` | `false` | No minification (keep readable) |
| `target` | `"node20"` | Target Node.js 20+ |
| `platform` | `"node"` | Node.js platform |
| `dts` | `true` | Generate TypeScript declarations |
| `clean` | `true` | Clean output directory before build |
| `fixedExtension` | `true` | Use `.mjs`/`.cjs` extensions |

---

## Customization

Only override what differs from defaults:

```ts
export default pkgConfig({
  entry: "src/index.ts",
  // Only override what you need:
  platform: "browser",  // Override for browser packages
  format: ["esm"],      // ESM only
});
```

### Available options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entry` | `string \| string[]` | required | Entry file(s) |
| `format` | `("esm" \| "cjs")[]` | `["esm", "cjs"]` | Output formats |
| `sourcemap` | `boolean` | `true` | Generate source maps |
| `minify` | `boolean` | `false` | Minify output |
| `target` | `string` | `"node20"` | JS target |
| `platform` | `"node" \| "browser"` | `"node"` | Target platform |
| `dts` | `boolean` | `true` | Generate `.d.ts` files |
| `clean` | `boolean` | `true` | Clean before build |
| `fixedExtension` | `boolean` | `true` | Use fixed extensions |

---

## Package boundary

**This package owns:**
- Base tsdown configuration
- Default build options
- Factory function for package configs

**This package does NOT own:**
- Package-specific build logic
- TypeScript configuration (see `@repo/typescript`)
- Runtime code

---

## Related packages

- `@repo/typescript` — Shared TypeScript configurations
- `@repo/utils` — Shared utility helpers
