import { pageSchema } from "fumadocs-core/source/schema";
import { z } from "zod";

/**
 * Article frontmatter schema — the single source of truth for article
 * defaults. Imported by both `source.config.ts` (build-time collection
 * config) and `src/lib/source.ts` (runtime typed source) so the two can
 * never drift. Keep this module free of React/browser imports: the build
 * config loads it under Node.
 */
export const articleFrontmatterSchema = pageSchema.extend({
	category: z.string(),
	publishedAt: z.string(),
	authorName: z.string(),
	authorRole: z.string(),
	authorInitials: z.string(),
	authorHandle: z.string().optional(),
	authorAvatarUrl: z.string(),
	featured: z.boolean().default(false),
	tags: z.array(z.string()).default([]),
});
