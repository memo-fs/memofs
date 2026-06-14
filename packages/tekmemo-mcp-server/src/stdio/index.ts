import { stdin as input, stdout as output, stderr } from "node:process";
import { createInterface } from "node:readline/promises";
import type { TekMemoMcpProtocolServer } from "../protocol/server";

export async function runStdioServer(
	server: TekMemoMcpProtocolServer,
): Promise<void> {
	const rl = createInterface({ input, crlfDelay: Infinity });
	for await (const line of rl) {
		const trimmed = line.trim();
		if (trimmed.length === 0) continue;
		try {
			const response = await server.handleJsonRpcText(trimmed);
			if (response !== undefined) output.write(`${response}\n`);
		} catch (error) {
			stderr.write(
				`[tekmemo-mcp] fatal stdio error: ${error instanceof Error ? error.message : String(error)}\n`,
			);
		}
	}
}
