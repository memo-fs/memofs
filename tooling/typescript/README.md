# @repo/typescript

Shared TypeScript configurations for TekMemo packages.

This internal package provides the base TypeScript configurations that all packages extend. It ensures consistent TypeScript settings across the monorepo.

## Available Configs

| Config | Description |
|--------|-------------|
| `base.json` | Base config for Node.js packages (strict, ESM, target ES2022) |

---

## Usage

### In package.json

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

### In tsconfig.json

```json
{
  "extends": "@repo/typescript/base.json"
}
```

---

## Base configuration

The `base.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

---

## Requirements

| Tool | Version |
|------|---------|
| TypeScript | `>=5.0` |
| Node.js | `>=22` |

---

## Package boundary

**This package owns:**
- Base TypeScript configuration
- React TypeScript configuration
- Future config variants (browser, etc.)

**This package does NOT own:**
- Build tool configuration (see `@repo/tsdown`)
- Runtime code
- Package-specific settings

---

## Related packages

- `@repo/tsdown` — Shared tsdown build configuration
- `@repo/utils` — Shared utility helpers
