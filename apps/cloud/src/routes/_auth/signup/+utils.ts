import type { SubmissionResult } from "@conform-to/dom";
import { z } from "zod/v4";

/**
 * Shared validation schema for the signup form (SC4.1).
 *
 * Lives in `+utils` so both the client (useForm `onValidate`) and the server
 * (action `parseWithZod`) validate against the same SSOT. The schema covers
 * format checks only; disposable-domain and MX-record checks remain in the
 * action because they require async server-side work.
 *
 * `callbackURL` is a hidden field — it doesn't need validation and is read
 * directly from `formData` in the action.
 */
export const SignupSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Please enter your name.")
		.max(50, "Name must be 50 characters or fewer."),
	email: z
		.string()
		.trim()
		.min(1, "Email is required.")
		.email("Enter a valid email address."),
});

export type SignupFormValues = z.infer<typeof SignupSchema>;

/**
 * discriminated-union result returned by the signup action.
 * The success variant carries the email so the component can flip to the
 * "check your inbox" screen; the error variant is a Conform SubmissionResult
 * that powers field/form-level error display via `useForm`.
 */
export type SignupResult =
	| { status: "success"; email: string }
	| SubmissionResult<string[]>;
