/**
 * Pluggable hook emitter architecture for agent platform hooks.
 *
 * Each platform (Claude Code, Codex, opencode) implements the
 * {@link HookEmitter} interface. Each hook behavior (context injection,
 * subagent injection, compaction survival, status display) is described by a
 * {@link HookModule} descriptor. Adding platform N+1 is O(1) — one new
 * emitter file. Adding a new hook behavior is O(1) — one new hook module.
 *
 * Platforms without a usable hook system (Cursor's hooks cannot inject
 * context and have no session-start event; Gemini and Copilot have no hooks)
 * simply have no emitter — `generate agent` falls back to rules + MCP for
 * them.
 *
 * @module types
 */

/**
 * The platform lifecycle events MemoFS hooks into.
 *
 * These are the platform-agnostic hook intents. Each emitter translates them
 * into its platform's specific config shape. Note the mapping is not always
 * 1:1 — e.g. Claude Code and Codex ignore stdout on their `PreCompact`
 * event, so `preCompact` (compaction survival) is emitted as a
 * `SessionStart` matcher group on the `compact` source instead.
 */
export type HookEvent =
	| "sessionStart"
	| "subagentStart"
	| "preCompact"
	| "stop";

/**
 * How the Stop hook delivers its status output to the developer.
 *
 * - `"systemMessage"` — the platform accepts JSON hook output with a
 *   `systemMessage` field shown to the user (Claude Code, Codex).
 * - `"toast"` — the platform displays output via a UI toast from a plugin
 *   (opencode `client.tui.showToast` on `session.idle`).
 */
export type StopOutputMethod = "systemMessage" | "toast";

/**
 * Platform capabilities that determine which hooks can be emitted.
 *
 * A platform may not support all hook events. For example, opencode has no
 * subagent-start event. The emitter skips hooks that require unsupported
 * capabilities.
 */
export interface HookCapabilities {
	/** Platform supports session start events. */
	readonly sessionStart: boolean;
	/** Platform supports subagent start events (context injection for subagents). */
	readonly subagentStart: boolean;
	/** Platform supports re-injecting context around compaction. */
	readonly preCompact: boolean;
	/** Platform supports stop events (status display). */
	readonly stop: boolean;
	/**
	 * Platform injects hook stdout into the model's context (Claude Code and
	 * Codex inject SessionStart/SubagentStart stdout as context). When false,
	 * hooks can run side effects (cloud pull, session markers) but CANNOT
	 * auto-load memory — the rules file must keep the "call `memofs.context`
	 * yourself" phrasing (`hooksInstalled` stays false).
	 */
	readonly contextInjection: boolean;
	/** How the Stop hook delivers status output. */
	readonly stopOutputMethod: StopOutputMethod;
}

/**
 * A file emitted by a hook emitter (e.g. `.claude/settings.json`).
 */
export interface EmittedHookFile {
	/** Relative path from project root where the file should be written. */
	readonly path: string;
	/** Full file content (JSON, TypeScript, etc — platform-specific). */
	readonly content: string;
	/**
	 * Merge strategy when the file already exists.
	 *
	 * - `"hooks-json"` — the file is a shared platform settings file
	 *   (`.claude/settings.json`, `.codex/hooks.json`); merge our `hooks`
	 *   groups into the existing JSON, preserving all other keys and any
	 *   user-defined hook groups. Prior memofs-owned groups are replaced.
	 * - omitted — the file is exclusively ours (e.g. the opencode plugin);
	 *   plain force-protected whole-file write.
	 */
	readonly merge?: "hooks-json";
}

/**
 * A platform-agnostic hook module descriptor. Each module represents one
 * behavioral hook (context injection, subagent injection, compaction
 * survival, status display). Emitters translate the descriptor into their
 * platform's native config; modules whose `requires` capabilities are not
 * met are skipped.
 *
 * @public
 */
export interface HookModule {
	/** The module's unique name (e.g. "context-injection"). */
	readonly name: string;
	/** The platform lifecycle event this module hooks into. */
	readonly event: HookEvent;
	/** Capabilities this module requires the platform to support. */
	readonly requires: ReadonlyArray<keyof HookCapabilities>;
}

/**
 * Context passed to a {@link HookEmitter.emitHooks} call. Central home for
 * the CLI command strings so they exist in exactly one place.
 */
export interface HookEmitContext {
	/** The target platform (e.g. "claude", "codex", "opencode"). */
	readonly target: string;
	/** The capabilities the platform supports. */
	readonly capabilities: HookCapabilities;
	/**
	 * The CLI command for session-start context injection. Includes the
	 * cloud-conditional pull and the `--mark-session-start` marker.
	 */
	readonly contextCommand: string;
	/**
	 * The CLI command for re-injection (subagent start, post-compaction).
	 * No session marker — the session already started.
	 */
	readonly reinjectCommand: string;
	/**
	 * The CLI command for status display on stop. Emits hook-formatted JSON
	 * (`{"systemMessage": ...}`) — Codex requires JSON on Stop-hook exit 0.
	 */
	readonly statusCommand: string;
}

/**
 * The default CLI commands shared by every emitter.
 *
 * The context command renders plain markdown (no `--json`) because the
 * platforms inject stdout verbatim as model-visible context.
 */
export const DEFAULT_HOOK_COMMANDS: Pick<
	HookEmitContext,
	"contextCommand" | "reinjectCommand" | "statusCommand"
> = {
	contextCommand:
		'sh -c \'[ -n "$MEMOFS_API_KEY" ] && memofs cloud sync pull; memofs context --query "project context" --task-type general --mark-session-start\'',
	reinjectCommand:
		"sh -c 'memofs context --query \"project context\" --task-type general'",
	statusCommand: "memofs status --hook",
};

/**
 * A hook emitter for a specific agent platform. Translates platform-agnostic
 * hook modules into the platform's native hook configuration format.
 *
 * @public
 */
export interface HookEmitter {
	/** The target platform id (e.g. "claude", "codex", "opencode"). */
	readonly target: string;
	/** The capabilities this platform supports. */
	readonly capabilities: HookCapabilities;
	/**
	 * Emits the hook configuration file(s) for this platform, composed from the
	 * given hook modules. Modules whose `requires` capabilities are not met by
	 * the platform are skipped.
	 *
	 * @param modules - The hook modules to emit.
	 * @param context - Additional emission context.
	 * @returns The file(s) to write.
	 */
	emitHooks(
		modules: readonly HookModule[],
		context?: Partial<HookEmitContext>,
	): EmittedHookFile[];
}
