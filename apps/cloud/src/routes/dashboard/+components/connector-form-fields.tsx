/**
 * Connector form fields — the shared input set for the add-connector dialog.
 *
 * Extracted so `AddConnectorDialog` stays under the 100-LoC component cap.
 * Uses Conform field props for progressive-enhancement validation.
 */

import { type FieldMetadata, getInputProps } from "@conform-to/react";
import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export function ConnectorFormFields({
	fields,
	isPending,
}: {
	fields: {
		name: FieldMetadata<string>;
		token: FieldMetadata<string>;
		sourceMapping: FieldMetadata<string>;
		schedule: FieldMetadata<string>;
	};
	isPending: boolean;
}) {
	const [selectedType, setSelectedType] = useState<"github" | "notion">(
		"github",
	);

	return (
		<>
			<div className="space-y-1.5">
				<Label className="text-xs">Type</Label>
				<div className="flex gap-2">
					{(["github", "notion"] as const).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => setSelectedType(t)}
							className={`h-9 rounded px-3 text-xs capitalize ${
								selectedType === t
									? "bg-primary text-primary-foreground"
									: "border border-border hover:bg-muted"
							}`}
						>
							{t}
						</button>
					))}
				</div>
				<input type="hidden" name="type" value={selectedType} />
			</div>

			<Field
				label="Name"
				field={fields.name}
				placeholder="My GitHub repos"
				isPending={isPending}
			/>
			<Field
				label="Token / PAT"
				field={fields.token}
				placeholder="ghp_… / secret_…"
				type="password"
				isPending={isPending}
			/>
			<Field
				label="Source mapping"
				field={fields.sourceMapping}
				placeholder="repos: org/*"
				isPending={isPending}
			/>
			<Field
				label="Schedule"
				field={fields.schedule}
				placeholder="Every 1h"
				isPending={isPending}
			/>
		</>
	);
}

/**
 * Reusable form field with label, input, and inline error display. Used by
 * connector credential forms to keep field layout consistent.
 *
 * @param label - Visible label text above the input.
 * @param field - Conform `FieldMetadata` providing id, value, errors, and key.
 * @param placeholder - Placeholder text shown when the input is empty.
 * @param type - HTML input type (defaults to `"text"`).
 * @param isPending - When `true`, the input is disabled (submit in progress).
 */
function Field({
	label,
	field,
	placeholder,
	type = "text",
	isPending,
}: {
	label: string;
	field: FieldMetadata<string>;
	placeholder: string;
	type?: "text" | "password" | "email" | "url" | "number" | "tel";
	isPending: boolean;
}) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={field.id} className="text-xs">
				{label}
			</Label>
			<Input
				{...getInputProps(field, { type })}
				key={field.key}
				placeholder={placeholder}
				className="h-9 text-xs"
				disabled={isPending}
			/>
			{field.errors && (
				<p className="text-[10px] text-destructive">{field.errors}</p>
			)}
		</div>
	);
}
