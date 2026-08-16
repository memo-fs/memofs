<script setup lang="ts">
import { ref } from "vue";
import { Icon } from "@iconify/vue";
import CopyButton from "./CopyButton.vue";

interface StepItem {
  step: number;
  title: string;
  description: string;
  code: string;
  htmlCode?: string;
  lang: string;
}

interface StackOption {
  id: string;
  name: string;
  badge: string;
  icon: string;
  description: string;
  steps: StepItem[];
}

const stacks: StackOption[] = [
  {
    id: "claude",
    name: "Claude Code",
    badge: "MCP & Hooks",
    icon: "simple-icons:anthropic",
    description: "Equip Claude Code with automatic memory loading, hooks, and MCP tools.",
    steps: [
      {
        step: 1,
        title: "Initialize MemoFS in your project repository",
        description: "Creates `.memofs/` workspace directory with default memory structures.",
        code: "npx @memofs/cli init",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli init</span>',
        lang: "bash",
      },
      {
        step: 2,
        title: "Generate Claude Code rules, hooks & MCP config",
        description: "Emits `CLAUDE.md`, `.claude/settings.json` hooks, and merges `.mcp.json`.",
        code: "npx @memofs/cli generate agent claude",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli generate agent claude</span>',
        lang: "bash",
      },
      {
        step: 3,
        title: "Record persistent project memory",
        description: "Persists key decisions into `.memofs/` Markdown and JSONL files.",
        code: 'npx @memofs/cli remember "Project uses VitePress for documentation" --kind note',
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli remember <span class="token string">"Project uses VitePress for documentation"</span> --kind note</span>',
        lang: "bash",
      },
      {
        step: 4,
        title: "Restart Claude Code",
        description: "Restart Claude Code and prompt it to ensure `.memofs/` is functional",
        code: "Which docs framework does this project use?",
        htmlCode: '<span class="token prompt">$</span> Which docs framework does this project use?</span>',
        lang: "text",
      },
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    badge: "MDC Rules & MCP",
    icon: "simple-icons:cursor",
    description: "Configure Cursor IDE rules and MCP server configuration for MemoFS.",
    steps: [
      {
        step: 1,
        title: "Initialize MemoFS in your project repository",
        description: "Creates `.memofs/` workspace directory with default memory structures.",
        code: "npx @memofs/cli init",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli init</span>',
        lang: "bash",
      },
      {
        step: 2,
        title: "Generate Cursor MDC rules & MCP config",
        description: "Emits `.cursor/rules/memofs.mdc` and merges `.cursor/mcp.json` configuration.",
        code: "npx @memofs/cli generate agent cursor",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli generate agent cursor</span>',
        lang: "bash",
      },
      {
        step: 3,
        title: "Record persistent project memory",
        description: "Persists key decisions into `.memofs/` Markdown and JSONL files.",
        code: 'npx @memofs/cli remember "Project uses VitePress for documentation" --kind note',
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli remember <span class="token string">"Project uses VitePress for documentation"</span> --kind note</span>',
        lang: "bash",
      },
      {
        step: 4,
        title: "Restart Cursor",
        description: "Restart Cursor and prompt Composer / Chat to ensure `.memofs/` is functional",
        code: "Which docs framework does this project use?",
        htmlCode: '<span class="token prompt">$</span> Which docs framework does this project use?</span>',
        lang: "text",
      },
    ],
  },
  {
    id: "codex",
    name: "Codex",
    badge: "AGENTS.md & Hooks",
    icon: "simple-icons:openai",
    description: "Configure Codex CLI with automatic memory loading, hooks, and MCP tools.",
    steps: [
      {
        step: 1,
        title: "Initialize MemoFS in your project repository",
        description: "Creates `.memofs/` workspace directory with default memory structures.",
        code: "npx @memofs/cli init",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli init</span>',
        lang: "bash",
      },
      {
        step: 2,
        title: "Generate Codex rules, hooks & MCP config",
        description: "Emits `AGENTS.md`, `.codex/hooks.json`, and updates `~/.codex/config.toml`.",
        code: "npx @memofs/cli generate agent codex",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli generate agent codex</span>',
        lang: "bash",
      },
      {
        step: 3,
        title: "Record persistent project memory",
        description: "Persists key decisions into `.memofs/` Markdown and JSONL files.",
        code: 'npx @memofs/cli remember "Project uses VitePress for documentation" --kind note',
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli remember <span class="token string">"Project uses VitePress for documentation"</span> --kind note</span>',
        lang: "bash",
      },
      {
        step: 4,
        title: "Restart Codex",
        description: "Restart Codex CLI and prompt it to ensure `.memofs/` is functional",
        code: "Which docs framework does this project use?",
        htmlCode: '<span class="token prompt">$</span> Which docs framework does this project use?</span>',
        lang: "text",
      },
    ],
  },
  {
    id: "opencode",
    name: "opencode",
    badge: "Plugin & Rules",
    icon: "ph:code-bold",
    description: "Configure opencode CLI with MemoFS plugin, rules, and MCP configuration.",
    steps: [
      {
        step: 1,
        title: "Initialize MemoFS in your project repository",
        description: "Creates `.memofs/` workspace directory with default memory structures.",
        code: "npx @memofs/cli init",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli init</span>',
        lang: "bash",
      },
      {
        step: 2,
        title: "Generate opencode plugin, rules & MCP config",
        description: "Emits `AGENTS.md`, `.opencode/plugins/memofs.js`, and merges `opencode.json`.",
        code: "npx @memofs/cli generate agent opencode",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli generate agent opencode</span>',
        lang: "bash",
      },
      {
        step: 3,
        title: "Record persistent project memory",
        description: "Persists key decisions into `.memofs/` Markdown and JSONL files.",
        code: 'npx @memofs/cli remember "Project uses VitePress for documentation" --kind note',
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli remember <span class="token string">"Project uses VitePress for documentation"</span> --kind note</span>',
        lang: "bash",
      },
      {
        step: 4,
        title: "Restart opencode",
        description: "Restart opencode and prompt it to ensure `.memofs/` is functional",
        code: "Which docs framework does this project use?",
        htmlCode: '<span class="token prompt">$</span> Which docs framework does this project use?</span>',
        lang: "text",
      },
    ],
  },
  {
    id: "antigravity",
    name: "Google Antigravity",
    badge: "IDE & CLI Rules",
    icon: "logos:google-icon",
    description: "Connect MemoFS to Google Antigravity agents across IDE and CLI workflows.",
    steps: [
      {
        step: 1,
        title: "Initialize MemoFS in your project repository",
        description: "Creates `.memofs/` workspace directory with default memory structures.",
        code: "npx @memofs/cli init",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli init</span>',
        lang: "bash",
      },
      {
        step: 2,
        title: "Generate Antigravity agent rules & MCP config",
        description: "Emits `AGENTS.md` and registers `@memofs/mcp-server` in `.agents/mcp_settings.json`.",
        code: "npx @memofs/cli generate agent-rules gemini",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli generate agent-rules gemini</span>',
        lang: "bash",
      },
      {
        step: 3,
        title: "Record persistent project memory",
        description: "Persists key decisions into `.memofs/` Markdown and JSONL files.",
        code: 'npx @memofs/cli remember "Project uses VitePress for documentation" --kind note',
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli remember <span class="token string">"Project uses VitePress for documentation"</span> --kind note</span>',
        lang: "bash",
      },
      {
        step: 4,
        title: "Prompt Antigravity",
        description: "Open Antigravity chat panel and prompt the agent to ensure `.memofs/` is functional",
        code: "Which docs framework does this project use?",
        htmlCode: '<span class="token prompt">$</span> Which docs framework does this project use?</span>',
        lang: "text",
      },
    ],
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    badge: "CLI Rules & MCP",
    icon: "simple-icons:googlegemini",
    description: "Configure Gemini CLI and Code Assist with MemoFS rules and MCP tools.",
    steps: [
      {
        step: 1,
        title: "Initialize MemoFS in your project repository",
        description: "Creates `.memofs/` workspace directory with default memory structures.",
        code: "npx @memofs/cli init",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli init</span>',
        lang: "bash",
      },
      {
        step: 2,
        title: "Generate Gemini rules & MCP config",
        description: "Emits `GEMINI.md`, `.gemini/rules/`, and merges `.gemini/settings.json`.",
        code: "npx @memofs/cli generate agent gemini",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli generate agent gemini</span>',
        lang: "bash",
      },
      {
        step: 3,
        title: "Record persistent project memory",
        description: "Persists key decisions into `.memofs/` Markdown and JSONL files.",
        code: 'npx @memofs/cli remember "Project uses VitePress for documentation" --kind note',
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli remember <span class="token string">"Project uses VitePress for documentation"</span> --kind note</span>',
        lang: "bash",
      },
      {
        step: 4,
        title: "Restart Gemini CLI",
        description: "Restart Gemini CLI and prompt it to ensure `.memofs/` is functional",
        code: "Which docs framework does this project use?",
        htmlCode: '<span class="token prompt">$</span> Which docs framework does this project use?</span>',
        lang: "text",
      },
    ],
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    badge: "Instructions & MCP",
    icon: "simple-icons:githubcopilot",
    description: "Equip GitHub Copilot in VS Code with MemoFS markdown memory and MCP server.",
    steps: [
      {
        step: 1,
        title: "Initialize MemoFS in your project repository",
        description: "Creates `.memofs/` workspace directory with default memory structures.",
        code: "npx @memofs/cli init",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli init</span>',
        lang: "bash",
      },
      {
        step: 2,
        title: "Generate Copilot instructions & MCP config",
        description: "Emits `.github/copilot-instructions.md` and merges `.vscode/mcp.json`.",
        code: "npx @memofs/cli generate agent copilot",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli generate agent copilot</span>',
        lang: "bash",
      },
      {
        step: 3,
        title: "Record persistent project memory",
        description: "Persists key decisions into `.memofs/` Markdown and JSONL files.",
        code: 'npx @memofs/cli remember "Project uses VitePress for documentation" --kind note',
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npx @memofs/cli remember <span class="token string">"Project uses VitePress for documentation"</span> --kind note</span>',
        lang: "bash",
      },
      {
        step: 4,
        title: "Reload VS Code & Copilot",
        description: "Reload VS Code window and prompt Copilot Chat to ensure `.memofs/` is functional",
        code: "Which docs framework does this project use?",
        htmlCode: '<span class="token prompt">$</span> Which docs framework does this project use?</span>',
        lang: "text",
      },
    ],
  },
  {
    id: "vercel",
    name: "Vercel AI SDK",
    badge: "Framework Adapter",
    icon: "simple-icons:vercel",
    description: "Equip Vercel AI SDK `generateText` or `streamText` agents with `@memofs/adapter-ai-sdk` memory tools.",
    steps: [
      {
        step: 1,
        title: "Install core engine and AI SDK adapter",
        description: "Add `@memofs/core` and `@memofs/adapter-ai-sdk` to your project.",
        code: "npm install @memofs/core @memofs/adapter-ai-sdk ai",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npm install @memofs/core @memofs/adapter-ai-sdk ai</span>',
        lang: "bash",
      },
      {
        step: 2,
        title: "Instantiate MemoFS & attach toolset",
        description: "Expose runtime memory tools directly to your Vercel AI SDK agent.",
        code: `import { MemoFS } from "@memofs/core";
import { createAiSdkRuntimeFromMemoFS, buildRuntimeMemoryToolDefinition } from "@memofs/adapter-ai-sdk";
import { generateText, tool } from "ai";

const memo = new MemoFS({ projectId: "my-app" });
const runtime = createAiSdkRuntimeFromMemoFS(memo);
const memoryTool = buildRuntimeMemoryToolDefinition({
  runtime,
  access: { projectId: "my-app" },
  allowWrites: true,
});

const response = await generateText({
  model: yourModel,
  tools: { memory: tool(memoryTool) },
  prompt: "Remember that auth uses JWT with refresh tokens.",
});`,
        htmlCode: `<span class="token keyword">import</span> <span class="token punctuation">{</span> <span class="token class">MemoFS</span> <span class="token punctuation">}</span> <span class="token keyword">from</span> <span class="token string">"@memofs/core"</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> <span class="token punctuation">{</span> <span class="token function">createAiSdkRuntimeFromMemoFS</span><span class="token punctuation">,</span> <span class="token function">buildRuntimeMemoryToolDefinition</span> <span class="token punctuation">}</span> <span class="token keyword">from</span> <span class="token string">"@memofs/adapter-ai-sdk"</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> <span class="token punctuation">{</span> <span class="token function">generateText</span><span class="token punctuation">,</span> <span class="token function">tool</span> <span class="token punctuation">}</span> <span class="token keyword">from</span> <span class="token string">"ai"</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> memo = <span class="token keyword">new</span> <span class="token class">MemoFS</span><span class="token punctuation">({</span> projectId<span class="token punctuation">:</span> <span class="token string">"my-app"</span> <span class="token punctuation">})</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> runtime = <span class="token function">createAiSdkRuntimeFromMemoFS</span><span class="token punctuation">(</span>memo<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> memoryTool = <span class="token function">buildRuntimeMemoryToolDefinition</span><span class="token punctuation">({</span>
  runtime<span class="token punctuation">,</span>
  access<span class="token punctuation">:</span> <span class="token punctuation">{</span> projectId<span class="token punctuation">:</span> <span class="token string">"my-app"</span> <span class="token punctuation">}</span><span class="token punctuation">,</span>
  allowWrites<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span>
<span class="token punctuation">})</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> response = <span class="token keyword">await</span> <span class="token function">generateText</span><span class="token punctuation">({</span>
  model<span class="token punctuation">:</span> yourModel<span class="token punctuation">,</span>
  tools<span class="token punctuation">:</span> <span class="token punctuation">{</span> memory<span class="token punctuation">:</span> <span class="token function">tool</span><span class="token punctuation">(</span>memoryTool<span class="token punctuation">) }</span><span class="token punctuation">,</span>
  prompt<span class="token punctuation">:</span> <span class="token string">"Remember that auth uses JWT with refresh tokens."</span><span class="token punctuation">,</span>
<span class="token punctuation">})</span><span class="token punctuation">;</span>`,
        lang: "typescript",
      },
      {
        step: 3,
        title: "Recall context on subsequent requests",
        description: "Agent fetches exact memory fragments matching prompt intent without database latency.",
        code: `const result = await memo.recall("auth decisions");
console.log(result.matches);`,
        htmlCode: `<span class="token keyword">const</span> result = <span class="token keyword">await</span> memo<span class="token punctuation">.</span><span class="token function">recall</span><span class="token punctuation">(</span><span class="token string">"auth decisions"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>result<span class="token punctuation">.</span>matches<span class="token punctuation">)</span><span class="token punctuation">;</span>`,
        lang: "typescript",
      },
    ],
  },
  {
    id: "openai",
    name: "OpenAI Adapter",
    badge: "Embeddings Adapter",
    icon: "simple-icons:openai",
    description: "Power MemoFS hybrid recall with OpenAI embedding models via `@memofs/adapter-openai`.",
    steps: [
      {
        step: 1,
        title: "Install OpenAI adapter package",
        description: "Add `@memofs/core` and `@memofs/adapter-openai`.",
        code: "npm install @memofs/core @memofs/adapter-openai",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npm install @memofs/core @memofs/adapter-openai</span>',
        lang: "bash",
      },
      {
        step: 2,
        title: "Configure MemoFS with OpenAI Embedder",
        description: "Pass `createOpenAIEmbedder` into the MemoFS constructor options.",
        code: `import { MemoFS } from "@memofs/core";
import { createOpenAIEmbedder } from "@memofs/adapter-openai";

const memo = new MemoFS({
  projectId: "my-app",
  embedder: createOpenAIEmbedder({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-large",
  }),
});`,
        htmlCode: `<span class="token keyword">import</span> <span class="token punctuation">{</span> <span class="token class">MemoFS</span> <span class="token punctuation">}</span> <span class="token keyword">from</span> <span class="token string">"@memofs/core"</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> <span class="token punctuation">{</span> <span class="token function">createOpenAIEmbedder</span> <span class="token punctuation">}</span> <span class="token keyword">from</span> <span class="token string">"@memofs/adapter-openai"</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> memo = <span class="token keyword">new</span> <span class="token class">MemoFS</span><span class="token punctuation">({</span>
  projectId<span class="token punctuation">:</span> <span class="token string">"my-app"</span><span class="token punctuation">,</span>
  embedder<span class="token punctuation">:</span> <span class="token function">createOpenAIEmbedder</span><span class="token punctuation">({</span>
    apiKey<span class="token punctuation">:</span> process<span class="token punctuation">.</span>env<span class="token punctuation">.</span>OPENAI_API_KEY<span class="token punctuation">!</span><span class="token punctuation">,</span>
    model<span class="token punctuation">:</span> <span class="token string">"text-embedding-3-large"</span><span class="token punctuation">,</span>
  <span class="token punctuation">})</span><span class="token punctuation">,</span>
<span class="token punctuation">})</span><span class="token punctuation">;</span>`,
        lang: "typescript",
      },
    ],
  },
  {
    id: "core",
    name: "Core SDK",
    badge: "Core Runtime",
    icon: "ph:cpu-bold",
    description: "Direct Node.js / TypeScript programmatic access to MemoFS memory operations.",
    steps: [
      {
        step: 1,
        title: "Install Core SDK",
        description: "Add `@memofs/core` package.",
        code: "npm install @memofs/core",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npm install @memofs/core</span>',
        lang: "bash",
      },
      {
        step: 2,
        title: "Write facts, notes, and recall query",
        description: "Store decision memories into `.memofs/` Markdown & JSONL files.",
        code: `import { MemoFS } from "@memofs/core";

const memo = new MemoFS({ projectId: "my-app" });

// Store a decision
await memo.remember({
  content: "Use Tailwind v4 for apps/docs styling",
  kind: "decision",
  tags: ["styling", "docs"],
});

// Recall facts semantically
const result = await memo.recall("styling conventions");
console.log(result.matches[0].content);`,
        htmlCode: `<span class="token keyword">import</span> <span class="token punctuation">{</span> <span class="token class">MemoFS</span> <span class="token punctuation">}</span> <span class="token keyword">from</span> <span class="token string">"@memofs/core"</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> memo = <span class="token keyword">new</span> <span class="token class">MemoFS</span><span class="token punctuation">({</span> projectId<span class="token punctuation">:</span> <span class="token string">"my-app"</span> <span class="token punctuation">})</span><span class="token punctuation">;</span>

<span class="token comment">// Store a decision</span>
<span class="token keyword">await</span> memo<span class="token punctuation">.</span><span class="token function">remember</span><span class="token punctuation">({</span>
  content<span class="token punctuation">:</span> <span class="token string">"Use Tailwind v4 for apps/docs styling"</span><span class="token punctuation">,</span>
  kind<span class="token punctuation">:</span> <span class="token string">"decision"</span><span class="token punctuation">,</span>
  tags<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token string">"styling"</span><span class="token punctuation">,</span> <span class="token string">"docs"</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
<span class="token punctuation">})</span><span class="token punctuation">;</span>

<span class="token comment">// Recall facts semantically</span>
<span class="token keyword">const</span> result = <span class="token keyword">await</span> memo<span class="token punctuation">.</span><span class="token function">recall</span><span class="token punctuation">(</span><span class="token string">"styling conventions"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>result<span class="token punctuation">.</span>matches<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span>content<span class="token punctuation">)</span><span class="token punctuation">;</span>`,
        lang: "typescript",
      },
    ],
  },
  {
    id: "server",
    name: "Self-Hosted Server",
    badge: "Server Mode",
    icon: "simple-icons:cloudflare",
    description: "Run MemoFS HTTP API & MCP Endpoint on Node.js or Cloudflare Workers.",
    steps: [
      {
        step: 1,
        title: "Install Server runtime",
        description: "Add `@memofs/server` to your backend workspace.",
        code: "npm install @memofs/server",
        htmlCode: '<span class="token prompt">$</span> <span class="token cmd">npm install @memofs/server</span>',
        lang: "bash",
      },
      {
        step: 2,
        title: "Launch server instance",
        description: "Exposes REST endpoints and MCP transport over HTTP.",
        code: `import { createServer } from "@memofs/server";

const app = createServer({
  port: 3000,
  storage: { driver: "local", rootDir: "." },
});

app.listen();`,
        htmlCode: `<span class="token keyword">import</span> <span class="token punctuation">{</span> <span class="token function">createServer</span> <span class="token punctuation">}</span> <span class="token keyword">from</span> <span class="token string">"@memofs/server"</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> app = <span class="token function">createServer</span><span class="token punctuation">({</span>
  port<span class="token punctuation">:</span> <span class="token number">3000</span><span class="token punctuation">,</span>
  storage<span class="token punctuation">:</span> <span class="token punctuation">{</span> driver<span class="token punctuation">:</span> <span class="token string">"local"</span><span class="token punctuation">,</span> rootDir<span class="token punctuation">:</span> <span class="token string">"."</span> <span class="token punctuation">}</span><span class="token punctuation">,</span>
<span class="token punctuation">})</span><span class="token punctuation">;</span>

app<span class="token punctuation">.</span><span class="token function">listen</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>`,
        lang: "typescript",
      },
    ],
  },
];

const activeStackId = ref("claude");
const activeStack = ref(stacks[0]);

function selectStack(stack: StackOption) {
  activeStackId.value = stack.id;
  activeStack.value = stack;
}
</script>

<template>
  <div class="iq-wrapper">
    <div class="iq-header">
      <h2 class="iq-title">Choose your framework or environment</h2>
      <p class="iq-subtitle">Select your tech stack below to see tailored quickstart instructions.</p>
    </div>

    <!-- Stack Selector Tabs -->
    <div class="iq-tabs" role="tablist">
      <button
        v-for="stack in stacks"
        :key="stack.id"
        class="iq-tab"
        :class="{ active: activeStackId === stack.id }"
        role="tab"
        :aria-selected="activeStackId === stack.id"
        @click="selectStack(stack)"
      >
        <span class="iq-tab-icon">
          <Icon :icon="stack.icon" class="iq-icon-svg" />
        </span>
        <span class="iq-tab-name">{{ stack.name }}</span>
      </button>
    </div>

    <!-- Active Stack Content Card -->
    <div class="iq-card" v-if="activeStack">
      <div class="iq-card-banner">
        <div class="iq-card-title-group">
          <Icon :icon="activeStack.icon" class="iq-card-brand-icon" />
          <h3 class="iq-card-name">{{ activeStack.name }}</h3>
          <span class="iq-card-badge">{{ activeStack.badge }}</span>
        </div>
        <p class="iq-card-desc">{{ activeStack.description }}</p>
      </div>

      <!-- Step List -->
      <div class="iq-steps">
        <div
          v-for="item in activeStack.steps"
          :key="item.step"
          class="iq-step"
        >
          <div class="iq-step-num">{{ item.step }}</div>
          <div class="iq-step-body">
            <h4 class="iq-step-title">{{ item.title }}</h4>
            <p class="iq-step-desc">{{ item.description }}</p>
            <div class="iq-code-box">
              <pre class="iq-code"><code v-html="item.htmlCode || item.code"></code></pre>
              <CopyButton :text="item.code" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.iq-wrapper {
  margin: 32px 0 48px;
  width: 100%;
}

.iq-header {
  margin-bottom: 20px;
}

.iq-title {
  font-family: var(--vp-font-family-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 6px;
}

.iq-subtitle {
  font-size: 14.5px;
  color: var(--vp-c-text-2);
  margin: 0;
}

.iq-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 12px;
}

.iq-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 0 !important;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-display);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.iq-tab:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

.iq-tab.active {
  background: color-mix(in srgb, var(--tek-c-cyan) 12%, var(--vp-c-bg-soft));
  border-color: var(--tek-c-cyan);
  color: var(--tek-c-cyan);
}

.iq-tab-icon {
  display: inline-flex;
  align-items: center;
}

.iq-icon-svg {
  width: 16px;
  height: 16px;
}

.iq-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 0 !important;
  padding: 28px;
}

.iq-card-banner {
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.iq-card-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.iq-card-brand-icon {
  width: 22px;
  height: 22px;
  color: var(--vp-c-text-1);
}

.iq-card-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 0 !important;
  background: color-mix(in srgb, var(--tek-c-cyan) 15%, transparent);
  color: var(--tek-c-cyan);
}

.iq-card-name {
  font-family: var(--vp-font-family-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
}

.iq-card-desc {
  font-size: 14.5px;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.5;
}

.iq-steps {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.iq-step {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 16px;
  align-items: start;
}

.iq-step-num {
  width: 32px;
  height: 32px;
  border-radius: 0 !important;
  background: var(--vp-c-bg);
  border: 1px solid var(--tek-c-cyan);
  color: var(--tek-c-cyan);
  font-family: var(--vp-font-family-display);
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.iq-step-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.iq-step-title {
  font-family: var(--vp-font-family-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 4px 0 0;
}

.iq-step-desc {
  font-size: 13.5px;
  color: var(--vp-c-text-2);
  margin: 0 0 8px;
}

.iq-code-box {
  position: relative;
  background: #0d1117;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0 !important;
  padding: 12px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.iq-code {
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
  border-radius: 0 !important;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.6;
  color: #c9d1d9;
  flex: 1;
  min-width: 0;
  white-space: pre;
}

.iq-code code {
  font-family: inherit;
  font-size: inherit;
  background: transparent !important;
  padding: 0 !important;
  border-radius: 0 !important;
}

/* Syntax Highlighting Tokens */
:deep(.token.keyword) { color: #f472b6; font-weight: 600; }
:deep(.token.string) { color: var(--tek-c-gold, #f59e0b); }
:deep(.token.comment) { color: var(--vp-c-text-3); font-style: italic; }
:deep(.token.class) { color: #60a5fa; font-weight: 600; }
:deep(.token.function) { color: var(--tek-c-cyan, #38bdf8); }
:deep(.token.punctuation) { color: #94a3b8; }
:deep(.token.prompt) { color: var(--tek-c-cyan, #38bdf8); font-weight: 700; user-select: none; }
:deep(.token.cmd) { color: #e2e8f0; }
:deep(.token.boolean) { color: #f472b6; }
:deep(.token.number) { color: #fb923c; }

@media (max-width: 640px) {
  .iq-card {
    padding: 18px;
  }

  .iq-tab {
    font-size: 12.5px;
    padding: 6px 12px;
  }
}
</style>
