import { describe, expect, it } from "vitest";
import type { MemoryKind } from "../../src/index";
import {
	assertWriteAllowed,
	BLOCKLIST_RULES,
	containsBlockedContent,
	detectBlockedContent,
	MemoryWriteBlockedError,
	MemoFS,
} from "../../src/index";
import { createNodeFsMemoryStore } from "../../src/node-fs";
import {
	classifyDurability,
	TRANSIENT_CONFIDENCE_THRESHOLD,
	TRANSIENT_CONTENT_MIN_LENGTH,
} from "../../src/security/durability-tier";
import { createTempMemoFsDir } from "../../src/testing/temp-dir";

/**
 * Write intelligence — ADR 0009 Component 6.
 *
 * Two layers: (1) a secret/PII blocklist that hard-rejects, and (2) a
 * durability tier classifier that decides whether a memory gets indexed. This
 * file covers both the pure decision functions and the end-to-end write-path
 * behavior (reject + skip-indexing).
 */
describe("write intelligence — secret blocklist (layer 1)", () => {
	describe("detectBlockedContent", () => {
		it("returns no violations for clean text", () => {
			expect(detectBlockedContent("We use OAuth2 for authentication.")).toEqual(
				[],
			);
		});

		it("detects an AWS access key id", () => {
			const violations = detectBlockedContent(
				"The deploy role uses AKIAIOSFODNN7EXAMPLE.",
			);
			expect(violations).toHaveLength(1);
			expect(violations[0]?.ruleId).toBe("aws_access_key_id");
			// Preview must never contain the full secret.
			expect(violations[0]?.preview).not.toContain("AKIAIOSFODNN7EXAMPLE");
		});

		it("detects an OpenAI-style key", () => {
			const violations = detectBlockedContent(
				"OPENAI key: sk-projabcdefghijklmnopqrstuvwxyz0123456789",
			);
			expect(violations.length).toBeGreaterThan(0);
			expect(violations.some((v) => v.ruleId === "openai_api_key")).toBe(true);
		});

		it("detects a GitHub token", () => {
			const violations = detectBlockedContent(
				"ghp_01234567890123456789012345678901234567",
			);
			expect(violations.some((v) => v.ruleId === "github_token")).toBe(true);
		});

		it("detects a PEM private key block", () => {
			const pem =
				"-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----";
			const violations = detectBlockedContent(pem);
			expect(violations.some((v) => v.ruleId === "private_key_block")).toBe(
				true,
			);
		});

		it("detects a secret assignment with digit + length", () => {
			const violations = detectBlockedContent(
				'api_key = "ak_live_1234567890abcdef"',
			);
			expect(violations.some((v) => v.ruleId === "secret_assignment")).toBe(
				true,
			);
		});

		it("detects a connection string with embedded credentials", () => {
			const violations = detectBlockedContent(
				"postgres://user:s3cretpw@db.example.com:5432/prod",
			);
			expect(
				violations.some((v) => v.ruleId === "connection_string_credentials"),
			).toBe(true);
		});

		it("does NOT trip on documentation prose about auth", () => {
			// These must stay clean — precision over recall.
			expect(
				detectBlockedContent("password: must be rotated quarterly."),
			).toEqual([]);
			expect(detectBlockedContent("we hash passwords with bcrypt.")).toEqual(
				[],
			);
			expect(detectBlockedContent("secret: see the vault docs.")).toEqual([]);
		});

		it("deduplicates by rule — one violation per rule even on multiple matches", () => {
			const text = "keys: AKIAIOSFODNN7EXAMPLE and AKIAEXAMPLE12345678AB";
			const violations = detectBlockedContent(text);
			const awsCount = violations.filter(
				(v) => v.ruleId === "aws_access_key_id",
			).length;
			expect(awsCount).toBe(1);
		});

		it("never includes the full secret in the preview", () => {
			const secret = "sk-projabcdefghijklmnopqrstuvwxyz0123456789XYZ";
			const violations = detectBlockedContent(`key: ${secret}`);
			for (const v of violations) {
				expect(v.preview.length).toBeLessThan(secret.length);
				expect(v.preview).not.toContain(secret);
			}
		});

		it("containsBlockedContent is a boolean convenience", () => {
			expect(containsBlockedContent("clean text")).toBe(false);
			expect(containsBlockedContent("AKIAIOSFODNN7EXAMPLE leaked here")).toBe(
				true,
			);
		});

		it("BLOCKLIST_RULES is non-empty and each rule has id + pattern", () => {
			expect(BLOCKLIST_RULES.length).toBeGreaterThan(5);
			for (const rule of BLOCKLIST_RULES) {
				expect(typeof rule.id).toBe("string");
				expect(rule.id.length).toBeGreaterThan(0);
				expect(rule.pattern).toBeInstanceOf(RegExp);
			}
		});
	});

	describe("assertWriteAllowed", () => {
		it("passes through clean text without throwing", () => {
			expect(() => assertWriteAllowed(["clean content"])).not.toThrow();
		});

		it("throws MemoryWriteBlockedError on a detected secret", () => {
			try {
				assertWriteAllowed(["api_key=sk-live-1234567890abcdefghijkl"]);
				throw new Error("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(MemoryWriteBlockedError);
				const e = error as MemoryWriteBlockedError;
				expect(e.code).toBe("MEMOFS_WRITE_BLOCKED");
				expect(Array.isArray(e.details?.violations)).toBe(true);
				expect(e.details?.violations.length).toBeGreaterThan(0);
			}
		});

		it("aggregates violations across multiple scanned texts", () => {
			try {
				assertWriteAllowed([
					"AKIAIOSFODNN7EXAMPLE",
					"ghp_01234567890123456789012345678901234567",
				]);
				throw new Error("should have thrown");
			} catch (error) {
				const e = error as MemoryWriteBlockedError;
				expect(e.details?.violations.length).toBeGreaterThanOrEqual(2);
			}
		});

		it("surfaces the path in details when provided", () => {
			try {
				assertWriteAllowed(
					["AKIAIOSFODNN7EXAMPLE"],
					".memofs/memory/notes.md",
				);
				throw new Error("should have thrown");
			} catch (error) {
				const e = error as MemoryWriteBlockedError;
				expect(e.details?.path).toBe(".memofs/memory/notes.md");
			}
		});
	});
});

describe("write intelligence — durability tier (layer 2)", () => {
	describe("classifyDurability", () => {
		it("returns an explicit override verbatim", () => {
			const d = classifyDurability({
				content: "short",
				tier: "durable",
			});
			expect(d.tier).toBe("durable");
			expect(d.reason).toBe("explicit-override");
		});

		it("classifies a durable kind as durable", () => {
			const durableKinds: MemoryKind[] = [
				"decision",
				"constraint",
				"goal",
				"preference",
				"reference",
			];
			for (const kind of durableKinds) {
				const d = classifyDurability({
					content: "A real durable fact about the project.",
					kind,
				});
				expect(d.tier).toBe("durable");
				expect(d.reason).toBe("durable-kind");
			}
		});

		it("classifies a transient kind as transient", () => {
			for (const kind of ["note", "summary"] as MemoryKind[]) {
				const d = classifyDurability({
					content: "Working note about the current session state.",
					kind,
				});
				expect(d.tier).toBe("transient");
				expect(d.reason).toBe("transient-kind");
			}
		});

		it("classifies low confidence as transient regardless of kind", () => {
			const d = classifyDurability({
				content: "We might be using OAuth2 for authentication flows.",
				kind: "decision",
				confidence: TRANSIENT_CONFIDENCE_THRESHOLD - 0.1,
			});
			expect(d.tier).toBe("transient");
			expect(d.reason).toBe("low-confidence");
		});

		it("classifies very short content as transient regardless of kind", () => {
			const d = classifyDurability({
				content: "ok",
				kind: "decision",
			});
			expect(d.tier).toBe("transient");
			expect(d.reason).toBe("low-signal-content");
		});

		it("defaults to durable when no signal is present", () => {
			const d = classifyDurability({
				content: "A sufficiently long memory with no kind or confidence.",
			});
			expect(d.tier).toBe("durable");
			expect(d.reason).toBe("default-durable");
		});

		it("explicit override beats low confidence", () => {
			const d = classifyDurability({
				content: "x",
				kind: "note",
				confidence: 0.1,
				tier: "durable",
			});
			expect(d.tier).toBe("durable");
			expect(d.reason).toBe("explicit-override");
		});

		it("respects the documented thresholds", () => {
			expect(TRANSIENT_CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
			expect(TRANSIENT_CONFIDENCE_THRESHOLD).toBeLessThan(1);
			expect(TRANSIENT_CONTENT_MIN_LENGTH).toBeGreaterThan(0);
		});
	});
});

/**
 * End-to-end: the write path enforces both layers. A secret is rejected; a
 * transient memory is written to notes.md but NOT indexed into recall.
 */
describe("write intelligence — write-path behavior", () => {
	it("hard-rejects a write containing a secret and never persists it", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "blocklist",
				mode: "local",
			});

			await expect(
				memo.notes.record({
					content: "The deploy key is AKIAIOSFODNN7EXAMPLE.",
					kind: "reference",
				}),
			).rejects.toBeInstanceOf(MemoryWriteBlockedError);

			// Nothing was written — notes.md is untouched (just the scaffold).
			const notes = await memo.notes.read();
			expect(notes).not.toContain("AKIA");
		} finally {
			await cleanup();
		}
	});

	it("hard-rejects a secret in the title even when content is clean", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "blocklist",
				mode: "local",
			});

			await expect(
				memo.notes.record({
					title: "ghp_01234567890123456789012345678901234567",
					content: "A normal note about deployment.",
					kind: "note",
				}),
			).rejects.toBeInstanceOf(MemoryWriteBlockedError);
		} finally {
			await cleanup();
		}
	});

	it("writes a durable memory and indexes it for recall", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "tier",
				mode: "local",
			});

			const result = await memo.notes.record({
				content: "MemoFS uses Biome for all linting and formatting.",
				kind: "decision",
			});
			expect(result.tier).toBe("durable");
			expect(result.tierReason).toBe("durable-kind");

			// Durable → indexed → recallable.
			const recall = await memo.recall("Biome formatting", { limit: 5 });
			expect(recall.items.length).toBeGreaterThan(0);
		} finally {
			await cleanup();
		}
	});

	it("writes a transient memory to notes.md but does NOT index it", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "tier",
				mode: "local",
			});

			const result = await memo.notes.record({
				content: "Scratch: debugging the auth flow locally this afternoon.",
				kind: "note",
			});
			expect(result.tier).toBe("transient");
			expect(result.tierReason).toBe("transient-kind");

			// Transient → written to notes.md (audit trail)...
			const notes = await memo.notes.read();
			expect(notes).toContain("debugging the auth flow");

			// ...but NOT indexed → not recallable.
			const recall = await memo.recall("debugging auth flow", { limit: 10 });
			expect(
				recall.items.some((item) => /debugging the auth/i.test(item.text)),
			).toBe(false);
		} finally {
			await cleanup();
		}
	});

	it("honors an explicit durable override on a transient-kind memory", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "tier",
				mode: "local",
			});

			// `note` would normally be transient, but the caller overrides.
			const result = await memo.notes.record({
				content: "Important durable fact captured as a note.",
				kind: "note",
				tier: "durable",
			});
			expect(result.tier).toBe("durable");
			expect(result.tierReason).toBe("explicit-override");

			// Override wins → indexed → recallable.
			const recall = await memo.recall("important durable fact", { limit: 5 });
			expect(
				recall.items.some((item) => /important durable fact/i.test(item.text)),
			).toBe(true);
		} finally {
			await cleanup();
		}
	});

	it("does not auto-extract graph facts from a transient memory", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "tier",
				mode: "local",
			});

			// "X uses Y" would normally extract a graph edge — but it's a note.
			await memo.notes.record({
				content: "Scratch: MemoFS uses Redis locally for now.",
				kind: "note",
			});

			const nodes = await memo.graph.listNodes({ limit: 50 });
			const labels = nodes.items.map((n) => n.label);
			// Transient → no graph extraction → no Redis node.
			expect(labels.some((l) => /redis/i.test(l))).toBe(false);
		} finally {
			await cleanup();
		}
	});
});
