import type { MinimalRecallDocument } from "../types/contracts";
import { createOrthogonalishVector } from "./embedding-fixtures";

export function createRecallDocumentsFixture(
	dimensions = 3,
): MinimalRecallDocument[] {
	return [
		{
			id: "chunk_core",
			text: "TekMemo starts with local .tekmemo files.",
			embedding: createOrthogonalishVector(dimensions, 0),
			metadata: {
				projectId: "proj_1",
				sourceType: "document",
				sourceId: "core",
				memoryType: "core",
				sectionName: "Core",
			},
		},
		{
			id: "chunk_notes",
			text: "Notes keep user-authored memory.",
			embedding: createOrthogonalishVector(dimensions, 1),
			metadata: {
				projectId: "proj_1",
				sourceType: "document",
				sourceId: "notes",
				memoryType: "notes",
				sectionName: "Notes",
			},
		},
		{
			id: "chunk_other_project",
			text: "Other project memory should stay isolated.",
			embedding: createOrthogonalishVector(dimensions, 2),
			metadata: {
				projectId: "proj_2",
				sourceType: "document",
				sourceId: "core",
				memoryType: "core",
				sectionName: "Core",
			},
		},
	];
}
