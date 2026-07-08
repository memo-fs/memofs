import type { SubmissionResult } from "@conform-to/dom";
import { z } from "zod/v4";

/**
 * Shared validation schema for the login form.
 *
 * Only email is validated; the MX check is intentionally skipped (unlike signup)
 * so a transient DoH failure can't lock a returning user out.
 */
export const LoginSchema = z.object({
	email: z.string("Email is required").trim().email("Invalid email address."),
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
