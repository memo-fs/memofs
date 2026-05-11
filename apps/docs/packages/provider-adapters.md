# Provider adapters

Provider adapters connect TekMemo to model and embedding providers.

## OpenAI

```bash
pnpm add @tekmemo/openai
```

## VoyageAI

```bash
pnpm add @tekmemo/voyageai
```

Provider adapters accept credentials from their caller. They do not store provider keys.

## Convenience imports

Provider adapters are also reexported through `@tekmemo/adapters`:

```ts
import { createOpenAIEmbedder } from "@tekmemo/adapters/openai";
import { createVoyageEmbedder } from "@tekmemo/adapters/voyageai";
```

Use the direct packages for the smallest dependency graph. Use `@tekmemo/adapters` when an app wants one first-party adapter package.
