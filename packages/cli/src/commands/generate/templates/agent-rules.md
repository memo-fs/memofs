# {{projectName}} — Agent Rules

This file is the bootstrap for every agent working in this repo, and it is binding, not advisory. **All project knowledge lives in MemoFS — use MCP tools, not this file.** If something you already believe about this codebase isn't confirmed there, treat it as unverified until MemoFS says otherwise.

## MemoFS Memory (**REQUIRED** — no exceptions)

This repo uses MemoFS as its single source of truth for project knowledge.
{{hooksNote}}
Every task, agents **MUST**:

1. **Load context** — {{stepOneText}}, before your first file read or edit this session.
2. **Look up details** — call the MemoFS `recall` tool (e.g. `memofs.recall`) before acting on anything not already covered by loaded context. If you're not certain it's covered, that counts as "not covered" — call it.
3. **Adhere to memory** — treat constraints, decisions, and references returned as binding. If a task conflicts with them, stop and surface the conflict instead of quietly choosing your own approach.
4. **Persist new facts** — before considering any task finished, call the MemoFS `remember` tool (e.g. `memofs.remember`) for every new durable fact discovered along the way — root causes, interface changes, conventions you had to infer. High signal only: one fact per note, and only facts that would change a future task's behavior. Check `recall` first and update what exists instead of re-recording a near-duplicate — the runtime skips near-duplicate writes.

**MUST NOT:**
- Answer questions about this codebase's conventions, architecture, or past decisions from assumption or general knowledge instead of MemoFS.
- Skip step 4 because a task felt too small to be worth persisting.
- Flood memory with low-signal content: transcripts, step logs, verification output, or near-duplicates of notes already stored. One durable fact per note; if it wouldn't change a future task's behavior, don't record it.
- Continue silently if a MemoFS tool errors or is unavailable — stop and tell the user instead of proceeding without memory.

**Before ending any task**, confirm: did anything warrant a `recall` call, and did you make it? Did you learn anything new that needs `remember`? Resolve both before finishing.

This file contains only behavioral rules and pointers — no project facts.
{{rules}}
{{workspaceRules}}
