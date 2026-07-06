/**
 * Add-connector dialog (SC3.3 add flow).
 *
 * Pick from catalog → paste token → set schedule + source mapping → save.
 * Uses Conform + Zod v4 for progressive-enhancement validation.
 */

import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { CreateConnectorSchema } from "../+utils/connectors";
import { ConnectorFormFields } from "./connector-form-fields";

export function AddConnectorDialog({
	open,
	onOpenChange,
	projectId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId: string | null;
}) {
	const fetcher = useFetcher<{ ok: boolean; error?: string }>();
	const isPending = fetcher.state === "submitting";
	const error = fetcher.data?.error;

	const [form, fields] = useForm({
		id: "add-connector",
		defaultValue: { intent: "create", schedule: "Every 1h" },
		constraint: getZodConstraint(CreateConnectorSchema),
		onValidate: ({ formData }) =>
			parseWithZod(formData, { schema: CreateConnectorSchema }),
		shouldRevalidate: "onInput",
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="text-base font-semibold">
						Add a connector
					</DialogTitle>
					<DialogDescription className="text-xs">
						Connectors run locally on the Memo FS runtime. The token is
						encrypted server-side and never synced to your files.
					</DialogDescription>
				</DialogHeader>

				<fetcher.Form
					method="post"
					{...getFormProps(form)}
					className="space-y-4 py-2"
				>
					<input type="hidden" name="projectId" value={projectId ?? ""} />
					<ConnectorFormFields fields={fields} isPending={isPending} />
					{error && <p className="text-[10px] text-destructive">{error}</p>}
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-9 text-xs"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							size="sm"
							className="h-9 text-xs"
							disabled={isPending || !projectId}
						>
							{isPending ? "Adding…" : "Add connector"}
						</Button>
					</div>
				</fetcher.Form>
			</DialogContent>
		</Dialog>
	);
}
