# Semantic Recall

When an AI agent accumulates hundreds of notes, sending them all into the system prompt is slow, expensive, and dilutes the LLM's attention. Instead, use Semantic Recall to find only the notes relevant to the current task.

This guide shows you how to use the `RecallManager` to index notes and perform vector searches.

## Prerequisites
- You need an embedding provider. TekMemo ships with OpenAI out of the box.
- Set your `OPENAI_API_KEY` environment variable.

## 1. Setup the Recall Manager

Initialize the `RecallManager` with the `NodeFsMemoryStore` and your chosen embedding provider. By default, it will use a local JSON file-based vector store (`.tekmemo/vectors.json`).

```typescript
import { 
	NodeFsMemoryStore, 
	RecallManager, 
	OpenAiEmbeddingProvider 
} from "@tekbreed/tekmemo";

const store = new NodeFsMemoryStore(process.cwd());
const embeddings = new OpenAiEmbeddingProvider();

const recall = new RecallManager({
	store,
	embeddingProvider: embeddings,
});
```

## 2. Indexing Notes

Before you can search, the memory must be indexed. If you run the `tekmemo note "..."` CLI command, this happens automatically. Programmatically, you can index a memory fragment like so:

```typescript
// We've just learned a new piece of context
const newNote = "The database uses UUIDv7 for primary keys to ensure temporal locality.";

// Save it and index it
await recall.indexText(newNote, {
	source: "developer-chat",
	tags: ["database", "architecture"]
});
```

## 3. Querying Memory

Now, when your agent needs to know about the database, it queries the memory instead of reading every note.

```typescript
const query = "What kind of primary keys do we use?";

const results = await recall.search(query, {
	topK: 3 // Return the top 3 most relevant notes
});

results.forEach(result => {
	console.log(`Found: ${result.text} (Score: ${result.score})`);
});
```

### Passing Results to the LLM
You can format these results and prepend them to the agent's prompt:

```typescript
const relevantMemoryContext = results.map(r => `- ${r.text}`).join("\n");
const systemPrompt = `Here is relevant past context from memory:\n${relevantMemoryContext}`;
```

This ensures your agent has access to its long-term memory without overflowing its context window!
