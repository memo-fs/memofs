## Adding a New Package

1. Create the directory under `packages/<name>/`
2. Add a `package.json` — name it `@memofs/<name>` for a public OSS package, or `@repo/<name>` for internal tooling only. Set `"type": "module"`.
3. Add a `tsconfig.json` extending `@repo/typescript/base.json`
4. Add a `tsdown.config.ts` using the shared factory:
   ```ts
   import { pkgConfig } from "@repo/tsdown";
   export default pkgConfig({ entry: "src/index.ts" });
   ```
5. Add the standard scripts: `build`, `build:watch`, `test`, `test:run`, `lint:package`
6. Add `@repo/typescript` and `@repo/tsdown` to `devDependencies`
7. Run `pnpm install` from the root

Do not add a new package unless it has a clear, single responsibility.
