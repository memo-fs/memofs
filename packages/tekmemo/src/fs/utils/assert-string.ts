import { MemoryValidationError } from "@tekbreed/tekmemo";

export function assertString(
	value: unknown,
	name: string,
): asserts value is string {
	if (typeof value !== "string") {
		throw new MemoryValidationError(`${name} must be a string.`, {
			name,
			receivedType: typeof value,
		});
	}
}
