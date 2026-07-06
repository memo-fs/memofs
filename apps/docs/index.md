---
layout: home

hero:
  name: "Memo FS"
  text: "Your AI agents forget. Memo FS doesn’t."
  image: /logo.svg
  tagline: "Local-first memory for AI agents — versioned, portable, and always there when the next session starts."
  actions:
    - theme: brand
      text: "Get Started"
      link: /packages/core/
    - theme: alt
      text: "Star on GitHub"
      link: https://github.com/christophersesugh/memofs

features:
  - title: Memory you can read
    icon: 📁
    link: /packages/core/agentfs
    details: Every memory is a markdown file in `.memofs/`. Read it in your editor, review it in PRs, track it in Git — alongside your source code.
  - title: Local by default
    icon: 🔒
    link: /packages/core/configuration
    details: Works offline with zero cloud setup. Your memory never leaves your repo unless you say so.
  - title: Sync when you need it
    icon: ☁️
    link: /configure/storage
    details: Add a cloud replica so memory follows you across machines. Same engine, same files, same code — the cloud is a sync transport, not a separate system.
  - title: Works with your coding agent
    icon: 🧠
    link: /packages/mcp/
    details: One config block and Claude Code, Cursor, Codex, or any MCP-compatible agent remembers your project — every session, automatically.
  - title: Ask, don't search
    icon: 💬
    link: /packages/core/concepts
    details: Semantic recall finds the right memory for each task. No keyword guessing. No re-reading old transcripts.
  - title: Roll back any decision
    icon: 🕸️
    link: /packages/core/concepts
    details: Versioned snapshots and a knowledge graph let you restore any state. One bad edit never erases a good decision.
  - title: Auto-ingest context
    icon: 🔌
    link: /packages/connectors/
    details: Pull context from GitHub issues or Notion docs directly into your local memory files.
---

