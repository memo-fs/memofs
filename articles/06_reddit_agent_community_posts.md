# Revised Reddit Posts — Self-Promo-Safe Versions

General changes made to all four, and why:
- **Disclosure line added up top** ("I'm the maintainer/built this"). Most subs (r/ClaudeAI, r/LocalLLaMA, r/programming) explicitly require this — undisclosed promo is the #1 reason posts get auto-removed or shadow-flagged.
- **Down to one link in the post body.** Multiple doc links in a single post is the clearest spam signal to Reddit's filters and to mods. The rest are moved into a "links in the comments" note — post them yourself as the first comment right after submitting.
- **Removed CTA-style formatting** ("Quick Setup", numbered install steps as a sales flow). Replaced with narrative framing — what the problem was, what you tried, what didn't work — since that's what these subs actually upvote.
- **Ended each post with a genuine question**, not a link dump. Discussion-shaped posts get treated as content; announcement-shaped posts get treated as ads.
- One practical note outside the text itself: these subs also apply the informal **9:1 rule** — if your account's post history is mostly links to your own project, that alone gets you filtered regardless of how the copy reads. Commenting/participating on unrelated threads in between posts helps more than any wording change.

---

## Post 1: r/ClaudeAI & r/ClaudeCode

**Title:** Claude Code forgets everything between sessions — here's the memory-persistence approach I ended up building

**Body:**

Disclosure: I'm the maintainer of MemoFS, an open-source project — sharing the technical approach, not trying to sell anything.

Every fresh Claude Code session starts blank, so I kept re-explaining the same stack decisions, past refactors, and deployment quirks. Cluttering `CLAUDE.md` with more and more unindexed notes didn't scale, so I went looking at how to hook into the session lifecycle directly instead.

What I landed on:
- On session start, a small memory store gets queried and a compact briefing (a few KB) gets injected before the first prompt runs.
- Subagents spawned mid-session inherit the parent's memory state instead of starting cold.
- The trickier part was context compaction — when Claude Code compacts a long window, the summarization step tends to quietly drop the rules you set earlier in the conversation. I ended up intercepting that event and re-injecting the project memory after compaction rather than trusting the summary to preserve it.

Now restarts keep things like my auth library choice, ORM conventions, and CI constraints without re-typing them.

Curious whether others hit the same compaction problem, and if so what you did about it — did you work around it in CLAUDE.md, or something else? Docs/link in the comments if anyone wants to poke at the source.

---

## Post 2: r/OpenAI & r/Codex

**Title:** Codex/CLI agents lose all codebase context between sessions — tried git-versioned memory files instead of a vector DB

**Body:**

Disclosure: I maintain MemoFS, an open-source tool — posting to discuss the design tradeoff, not to pitch it.

The token waste and repeated setup with Codex/CLI agents across sessions got old fast, so I tried storing agent memory as plain files instead of the usual vector-DB approach.

The reasoning: memory as Markdown/JSON under a `.memofs/` folder means it's git-versioned (branch your code, the memory branches with it), it's inspectable (you can just open the file and see what the agent "knows" instead of trusting an opaque embedding), and writes get scanned to reject anything that looks like a secret before it's ever stored.

For anyone building custom agent wrappers on the OpenAI SDK rather than using a CLI directly, there's also a TypeScript core package for wiring this into your own runtime.

Has anyone else moved away from vector stores for this kind of thing, or found a good reason to stick with one? Genuinely curious where it falls short. Links to the SDK docs in the comments.

---

## Post 3: r/LocalLLaMA

**Title:** Went local-first for agent memory instead of a hosted vector DB — write-up + numbers

**Body:**

Disclosure: I built this (MemoFS) — sharing it because the local-first angle seemed relevant here, happy to discuss the tradeoffs.

Most memory tooling for agents assumes you're fine sending data to a hosted vector DB or cloud API. That's a nonstarter if you're running local models via Ollama/vLLM/LM Studio and actually want the memory layer to stay offline and private too.

So the approach here is file-first: memories live as plain Markdown/JSON inside the project directory, search is BM25 + fuzzy matching locally by default (optional local ONNX embeddings if you want vector search without a network call), and there's an MCP server for wiring it into Cursor/Windsurf/Claude Code/custom runtimes.

Rough local benchmarks from my own test suite (take with appropriate skepticism since it's self-measured): sub-millisecond recall, ~7ms round-trip read/write, ~0.2ms rerank. Haven't had anyone else benchmark it independently yet, which I'd genuinely welcome.

If anyone's tried BM25/fuzzy-only setups for this instead of embeddings, how'd it hold up on recall quality? That's the part I'm least sure about long-term. Docs and source in the comments.

---

## Post 4: r/programming & r/coding

**Title:** Is agent memory actually a filesystem problem instead of a database problem?

**Body:**

Disclosure: I maintain MemoFS, an open-source project that takes this approach — posting because I think the underlying argument is more interesting than the tool itself.

After using vector DBs for agent memory in a few different setups, three things kept bugging me:

You can't `cat` or `grep` a vector database, so when an agent acts on bad memory there's no clean way to diff or debug what it actually "believed." Vector stores also live outside git, so switching branches leaves the memory stuck referencing old context. And cosine similarity is a poor fit for exact-match cases — symbol names, error codes, function signatures — which is a lot of what agent memory actually needs to retrieve precisely.

The alternative I've been using treats the canonical memory as plain versioned text files, and treats any search index (BM25, fuzzy, vector, graph) as a derived, disposable artifact that gets rebuilt from the text if it ever degrades. That gets you `git diff`-able memory changes, portability (copy the folder, copy the state), and no network round-trip for local recall.

Not claiming this is the right answer for every scale — curious where people think plain-file memory would fall over as agent context grows. Full write-up in the comments if useful.