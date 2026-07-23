/**
 * Minimal logger interface for best-effort warnings.
 *
 * @public
 */

/**
 * Minimal logger for observable best-effort paths.
 *
 * @remarks
 * Used to surface warnings when vector indexing, graph edge upserts,
 * or hybrid recall fallbacks degrade silently. Keeps intelligence observable
 * without throwing.
 *
 * @public
 */
export interface Logger {
	/**
	 * Log a warning with optional structured metadata.
	 *
	 * @param message - Human-readable warning.
	 * @param meta - Optional structured context.
	 */
	warn: (message: string, meta?: unknown) => void;
	/** Optional debug — unused in current best-effort paths. */
	debug?: (message: string, meta?: unknown) => void;
	/** Optional info — unused in current best-effort paths. */
	info?: (message: string, meta?: unknown) => void;
}
