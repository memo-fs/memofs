import type { SubmissionResult } from "@conform-to/dom";
import { z } from "zod/v4";
import { hasMxRecord } from "~/.server/mx-check";
import { isDisposableDomain } from "../+utils/email-validation";

/**
 * Validation schema for the signup form (SC4.1).
 *
 * Format check via Zod's `.email()`, disposable-domain rejection via
 * synchronous `superRefine`, and MX-record check via async `superRefine`.
 * The MX check runs last so a disposable address is rejected before any DNS
 * work. `hasMxRecord` fails open (returns true on error), so a DoH outage
 * degrades to "allow".
 *
 * `callbackURL` is a hidden field — it doesn't need validation and is read
 * directly from `formData` in the action.
 */
export const SignupSchema = z.object({
	name: z
		.string("Name is required")
		.trim()
		.min(3, "Name must be at least 3 characters.")
		.max(50, "Name must be 50 characters or fewer."),
	email: z
		.string("Email address is required.")
		.trim()
		.email("Enter a valid email address.")
		.superRefine(async (email, ctx) => {
			const domain = email.split("@")[1];
			if (!domain) return;

			if (isDisposableDomain(domain)) {
				ctx.addIssue({
					code: "custom",
					message: "Invalid email address.",
				});
				return z.NEVER;
			}

			if (!(await hasMxRecord(domain))) {
				ctx.addIssue({
					code: "custom",
					message: "This domain cannot receive emails.",
				});
			}
		}),
});

export type SignupFormValues = z.infer<typeof SignupSchema>;

/**
 * Discriminated-union result returned by the signup action.
 * The success variant carries the email so the component can flip to the
 * "check your inbox" screen; the error variant is a Conform SubmissionResult
 * that powers field/form-level error display via `useForm`.
 */
export type SignupResult =
	| { status: "success"; email: string }
	| SubmissionResult<string[]>;
