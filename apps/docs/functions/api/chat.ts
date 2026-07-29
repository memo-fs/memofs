export const onRequestPost = async (context) => {
	try {
		const { request, env } = context;
		const body = await request.json();
		const { message, history, selectedText, pageTitle, pageText } = body;

		const messages = [
			{
				role: "system",
				content: `You are Engram, an AI assistant for the MemoFS documentation site. You are a helpful, expert AI who helps developers build memory systems for their agents.
Answer the user's questions clearly, concisely, and accurately based on the documentation context provided. Always prioritize using the context. If the answer is not in the context, say you are not sure but offer general guidance based on your internal knowledge of Node.js, TypeScript, and AI agents.
        
Current Page: ${pageTitle || "Unknown"}
Selected Text Context (if any): ${selectedText ? `"${selectedText}"` : "None"}

Page Context:
${pageText ? pageText.substring(0, 8000) : "No context available."}
`,
			},
			...(history || []).map((msg) => ({
				role: msg.role === "user" ? "user" : "assistant",
				content: msg.content,
			})),
			{ role: "user", content: message },
		];

		// Using Cloudflare Workers AI (Llama 3 8B Instruct is very fast and cheap)
		const stream = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
			messages,
			stream: true,
		});

		return new Response(stream, {
			headers: { "content-type": "text/event-stream" },
		});
	} catch (err) {
		return new Response(
			JSON.stringify({ error: err.message || "Internal Server Error" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
