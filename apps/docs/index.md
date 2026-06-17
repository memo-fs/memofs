---
layout: home

hero:
  name: "TekMemo"
  text: "Your AI tools forget everything between sessions. They shouldn't."
  image: /logo.svg
  tagline: "Durable, project-scoped memory for AI agents and coding assistants. Plain text files in your repo. No cloud required."
  actions:
    - theme: brand
      text: "Install TekMemo"
      link: /packages/tekmemo/getting-started
    - theme: alt
      text: "Read the Docs"
      link: /packages/tekmemo/

features:
  - title: Memory you can read
    icon: 📁
    link: /packages/tekmemo/file-first-memory
    details: Every memory is a plain text file in `.tekmemo/`. Read it in VS Code. Review it in PRs. Git-track it alongside your code.
  - title: Start local, scale to cloud
    icon: 🔌
    link: /packages/tekmemo/cloud-client
    details: Local mode works offline. Cloud mode adds sync and hosted search. Hybrid gives you both. One API, zero rewrites.
  - title: Your agent plugs in directly
    icon: 🧠
    link: /packages/mcp/
    details: The MCP server ships in the box. Claude Code, Cursor, Codex, Opencode — add one config block and your agent remembers.
  - title: Ask, don't search
    icon: 💬
    link: /packages/tekmemo/architecture/indexing-recall
    details: Semantic recall fetches the right memory for the task. No keyword guessing. No scrolling through old prompts.
---