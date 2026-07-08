/**
 * Drizzle schema helpers — shared column factories for table definitions.
 */

import { createId } from "@paralleldrive/cuid2";
import { text } from "drizzle-orm/sqlite-core";

/**
 * Creates a `text("id")` primary key column that auto-generates a CUID2
 * at insert time when the caller omits the `id` field.
 *
 * @returns A drizzle column builder with `.primaryKey()` and `.$defaultFn()`.
 */
export const idColumn = () =>
	text("id")
		.primaryKey()
		.$defaultFn(() => createId());
