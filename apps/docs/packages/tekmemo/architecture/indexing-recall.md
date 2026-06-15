# Indexing and recall

"Recall" is how TekMemo converts static memory into useful context. Instead of passing an entire massive `notes.md` file to an LLM on every turn, recall searches for the most relevant fragments (chunks) and injects only those into the agent's context window.

## Local recall

Local recall runs entirely on your machine. It breaks `.tekmemo/` files into chunks and scores them against the query using fast text matching algorithms (like BM25).

**Best for:**
- Short, simple projects
- Finding exact terms, file names, or package names
- When you are offline or cannot send data to an external provider

## Provider-backed recall

Provider-backed recall uses semantic embeddings (vectors) to find context based on *meaning* rather than exact keywords. 

**How it works:**
1. Memory is chunked.
2. An embedding provider (like OpenAI or VoyageAI) converts the chunks into vectors.
3. The vectors are stored in a vector database (like Upstash).
4. When a query is made, it is embedded and compared against the database.
5. A reranker (like Voyage Rerank) can optionally re-order the top results for maximum relevance.

**Best for:**
- Large codebases with extensive documentation
- Answering conceptual questions (e.g., "How does authentication work here?")

## Cloud recall

Cloud recall happens when you use TekMemo Cloud as your central memory repository. TekMemo Cloud handles the chunking, embedding, vector storage, and reranking automatically behind the scenes.

**Best for:**
- Teams sharing memory across different machines
- CI/CD pipelines that need access to memory
- Applications built on the TekMemo API

When you run `npx tekmemo cloud index`, the Cloud API detects any changes pushed from your machine and updates the vector indices in the background.
