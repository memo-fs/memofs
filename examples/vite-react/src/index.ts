// Browser-side Vite/React code must never import @tekmemo/cloud-client with a secret API key.
// Call your own server route instead.

export async function loadTekMemoContext(query: string) {
	const response = await fetch(
		`/api/tekmemo/context?q=${encodeURIComponent(query)}`,
	);
	if (!response.ok)
		throw new Error(`TekMemo context failed: ${response.status}`);
	return response.json() as Promise<{ text?: string; sources?: unknown[] }>;
}

console.log(
	"Vite React example loaded. Keep your TekMemo API key on your server route only.",
);
