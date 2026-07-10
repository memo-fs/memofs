/**
 * Framework-neutral AI-runtime contract for MemoFS.
 *
 * @remarks
 * Re-exported from the package root so adapter packages can
 * `import type { MemoFSMemoryRuntime } from "@memofs/core"`. The
 * Vercel AI SDK adapter (`@memofs/adapter-ai-sdk`) and any future
 * framework adapter implement this contract.
 *
 * @public
 */

export * from "./llm-client";
export * from "./types";
