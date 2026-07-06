/**
 * Profile-edit form for `/dashboard/settings`.
 *
 * The only editable field at v1 is `name` — email is the passwordless login
 * identity (SC4.1) and avatar upload is deferred. The form uses Conform +
 * Zod v4 for progressive-enhancement validation: the same `ProfileSchema`
 * powers client `onValidate` and the route `action`, so the two sides never
 * disagree (AGENTS.md form mandate).
 *
 * On success the route action returns the updated name; we reflect it in the
 * read-only avatar block via the `name` prop so the user sees the change
 * without a full reload.
 */

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { useFetcher } from "react-router";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { userInitials } from "~/utils/misc";
import { ProfileSchema } from "../+utils/settings";

export function ProfileForm({ name, email }: { name: string; email: string }) {
	const profileFetcher = useFetcher<{ ok: boolean; error?: string }>();
	const [form, fields] = useForm({
		id: "profile-edit",
		defaultValue: { name },
		constraint: getZodConstraint(ProfileSchema),
		onValidate: ({ formData }) =>
			parseWithZod(formData, { schema: ProfileSchema }),
		shouldRevalidate: "onInput",
	});

	const isPending = profileFetcher.state === "submitting";
	const formError = profileFetcher.data?.error;
	const displayName = fields.name.value ?? name;

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-4">
				<Avatar className="h-12 w-12">
					<AvatarFallback className="bg-primary/20 text-sm text-primary">
						{userInitials(displayName)}
					</AvatarFallback>
				</Avatar>
				<div>
					<p className="text-xs font-semibold text-foreground">{displayName}</p>
					<p className="text-[11px] text-muted-foreground">{email}</p>
				</div>
			</div>

			<profileFetcher.Form
				method="post"
				{...getFormProps(form)}
				className="grid grid-cols-1 gap-4 sm:grid-cols-2"
			>
				<input type="hidden" name="intent" value="update-profile" />
				<div className="space-y-1.5">
					<Label htmlFor={fields.name.id} className="text-xs">
						Name
					</Label>
					<Input
						{...getInputProps(fields.name, { type: "text" })}
						key={fields.name.key}
						defaultValue={name}
						className="h-9 text-xs"
						disabled={isPending}
					/>
					{fields.name.errors && (
						<p className="text-[10px] text-destructive">{fields.name.errors}</p>
					)}
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="email" className="text-xs">
						Email
					</Label>
					<Input
						id="email"
						type="email"
						defaultValue={email}
						className="h-9 text-xs"
						disabled
					/>
					<p className="text-[10px] text-muted-foreground">
						Email is your login identity (passwordless, SC4.1).
					</p>
				</div>
				<div className="col-span-full flex items-center gap-3 sm:col-span-2">
					<Button
						type="submit"
						size="sm"
						className="h-9 text-xs"
						disabled={isPending}
					>
						{isPending ? "Saving…" : "Save name"}
					</Button>
					{formError && (
						<p className="text-[10px] text-destructive">{formError}</p>
					)}
					{profileFetcher.data?.ok && !formError && (
						<p className="text-[10px] text-primary">Saved.</p>
					)}
				</div>
			</profileFetcher.Form>
		</div>
	);
}
