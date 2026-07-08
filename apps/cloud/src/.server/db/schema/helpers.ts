import { createId } from "@paralleldrive/cuid2";
import { text } from "drizzle-orm/sqlite-core";

/**
 * Auto-generates a row id at insert time when the caller omits it.
 */
export const idColumn = () =>
	text("id")
		.primaryKey()
		.$defaultFn(() => createId());
