import type { SubmissionResult } from "@conform-to/dom";
import { z } from "zod/v4";
import { isDisposableDomain } from "../+utils/email-validation";

/**
 * Validation schema for the login form (SC4.1).
 *
 * Format check via Zod's `.email()`, plus disposable-domain rejection via
 * `superRefine`. The MX check is intentionally skipped so a transient DoH
 * failure can't lock a returning user out.
 */
export const LoginSchema = z.object({
	email: z
		.string("Email is required")
		.trim()
		.email("Invalid email address.")
		.superRefine((email, ctx) => {
			const domain = email.split("@")[1];
			if (domain && isDisposableDomain(domain)) {
				ctx.addIssue({
					code: "custom",
					message: "Invalid email address.",
				});
			}
		}),
});

export type LoginFormValues = z.infer<typeof LoginSchema>;

/**
 * Discriminated-union result returned by the login action.
 * Success variant carries the email for the "check your inbox" screen;
 * error variant is a Conform SubmissionResult for field/form-level display.
 */
export type LoginResult =
	| { status: "success"; email: string }
	| SubmissionResult<string[]>;
