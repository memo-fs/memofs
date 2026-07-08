import type { SubmissionResult } from "@conform-to/dom";
import { z } from "zod/v4";

/**
 * Shared validation schema for the waitlist form.
 *
 * Only email is validated here; the MX check remains in the action because
 * it requires an async DNS lookup.
 */
export const WaitlistSchema = z.object({
	email: z
		.string()
		.trim()
		.min(1, "Email is required.")
		.email("Enter a valid email address."),
});

export type WaitlistFormValues = z.infer<typeof WaitlistSchema>;

/**
 * Discriminated-union result returned by the waitlist action.
 * Success variant carries the email for the confirmation screen;
 * error variant is a Conform SubmissionResult for field/form-level display.
 */
export type WaitlistResult =
	| { status: "success"; email: string }
	| SubmissionResult<string[]>;
