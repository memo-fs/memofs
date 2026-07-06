/**
 * Shared validation schema for the profile-edit form on `/dashboard/settings`.
 *
 * Lives in `+utils/` so both the client (`ProfileForm`) and the route
 * `action` validate against the same SSOT — the client uses it for
 * `onValidate`, the server uses it with `parseWithZod` so the two sides can
 * never disagree on what a valid name is.
 *
 * The name is the only editable field at v1: email is the login identity
 * (passwordless, SC4.1) so it is read-only, and avatar image upload is a
 * later concern. Trimming + a 1–80 char bound mirrors Better Auth's own
 * `updateUser` expectations.
 */

import { z } from "zod/v4";

/** The profile-edit mutation schema. */
export const ProfileSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Name is required.")
		.max(80, "Name must be 80 characters or fewer."),
});

/** The fields the profile form can submit (subset of the user record). */
export type ProfileFormValues = z.infer<typeof ProfileSchema>;
