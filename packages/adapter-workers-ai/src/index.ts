/**
 * @memofs/adapter-workers-ai — Cloudflare Workers AI frontier
 * extractor adapter for MemoFS.
 *
 * Implements core's provider-neutral {@link Extractor} contract against a
 * Cloudflare Workers AI binding. The Workers AI coupling lives here, never in
 * core (AGENTS.md: provider-neutral contracts).
 *
 * @packageDocumentation
 */

export * from "./workers-ai-extractor";
