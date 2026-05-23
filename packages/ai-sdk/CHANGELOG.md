# @tekmemo/ai-sdk

## 0.2.1

### Patch Changes

- Replace `any` types with proper TypeScript types across runtime helpers
- Updated dependencies
  - @tekmemo/cloud-client@0.1.1

## 0.2.0

### Minor Changes

- #### tekmemo

  - Add graph memory primitives: nodes, edges, JSONL persistence, rule-based extraction, temporal resolution, and path-finding
  - Improve validation and error types across all memory operations
  - Require Node.js >=22
  - Dual CJS/ESM output via tsdown

  #### @tekmemo/agentfs

  - Fix error handling imports in README
  - Remove deprecated `external` tsdown option, use `deps.neverBundle`
  - Add release scripts (prepack, pack:dry-run, release:check)
  - Require Node.js >=22

  #### @tekmemo/ai-sdk

  - Add agent session instructions and prepare-call memory helpers
  - Improve scope policy validation and recall filter creation
  - Require Node.js >=22

  #### @tekmemo/benchmark-kit

  - Require Node.js >=22

  #### @tekmemo/fs

  - Require Node.js >=22

  #### @tekmemo/graph

  - Fix non-null assertion safety in temporal validity checks
  - Require Node.js >=22

  #### @tekmemo/openai

  - Require Node.js >=22

  #### @tekmemo/recall

  - Require Node.js >=22

  #### @tekmemo/rerank

  - Require Node.js >=22

  #### @tekmemo/rerank-voyage

  - Require Node.js >=22

  #### @tekmemo/upstash-vector

  - Remove deprecated `external` tsdown option, use `deps.neverBundle`
  - Require Node.js >=22

  #### @tekmemo/voyageai

  - Require Node.js >=22

### Patch Changes

- Updated dependencies
  - tekmemo@0.2.0
