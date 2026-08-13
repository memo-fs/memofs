<script setup lang="ts">
import { ref } from "vue";
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
  svg: string;
  description: string;
  steps: StepItem[];
}

const stacks: StackOption[] = [
  {
    id: "claude",
    name: "Claude Code",
    badge: "MCP & Hooks",
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.84 2.5h-3.68L4 21.5h3.68l1.63-4.73h5.38l1.63 4.73h3.68L13.84 2.5zm-3.52 11.4l1.68-4.88 1.68 4.88h-3.36z"/></svg>',
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
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    badge: "MDC Rules & MCP",
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 1L1.75 6.918v10.164L12 23l10.25-5.918V6.918L12 1zm8.5 15.197L12 21.111l-8.5-4.914V7.803L12 2.889l8.5 4.914v8.394zM12 5.5L5.5 9.25v5.5L12 18.5l6.5-3.75v-5.5L12 5.5z"/></svg>',
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
    ],
  },
  {
    id: "codex",
    name: "Codex",
    badge: "AGENTS.md & Hooks",
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 6-6 6 6 6M16 6l6 6-6 6"/></svg>',
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
    ],
  },
  {
    id: "opencode",
    name: "opencode",
    badge: "Plugin & Rules",
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 8l-5 4 5 4M15 8l5 4-5 4M14 6l-4 12"/></svg>',
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
    ],
  },
  {
    id: "vercel",
    name: "Vercel AI SDK",
    badge: "Framework Adapter",
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 1L24 22H0L12 1Z"/></svg>',
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
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.04 6.04 0 0 0-6.51-2.9 6.07 6.07 0 0 0-4.99-2.38 6.04 6.04 0 0 0-5.77 4.22 6.03 6.03 0 0 0-4.04 2.92 6.04 6.04 0 0 0 .74 7.14 5.98 5.98 0 0 0 .52 4.91 6.04 6.04 0 0 0 6.51 2.9 6.04 6.04 0 0 0 4.99 2.38 6.04 6.04 0 0 0 5.77-4.22 6.03 6.03 0 0 0 4.04-2.92 6.04 6.04 0 0 0-.74-7.14zm-9.02 11.44a4.42 4.42 0 0 1-2.73-1.02l.14-.08 4.54-2.62a.81.81 0 0 0 .41-.7v-6.42l1.93 1.11a.08.08 0 0 1 .04.06v5.27a4.44 4.44 0 0 1-4.33 4.4zm-7.66-3.47a4.41 4.41 0 0 1-.58-2.86l.14.08 4.54 2.62a.81.81 0 0 0 .81 0l5.56-3.21v2.23a.08.08 0 0 1-.04.07l-4.57 2.64a4.44 4.44 0 0 1-5.86-1.57zm-1.12-8.38a4.4 4.4 0 0 1 2.15-1.85v5.39a.81.81 0 0 0 .41.7l5.56 3.21-1.93 1.11a.08.08 0 0 1-.08 0l-4.57-2.64a4.44 4.44 0 0 1-1.54-5.92zm14.18 4.49-5.56-3.21 1.93-1.11a.08.08 0 0 1 .08 0l4.57 2.64a4.44 4.44 0 0 1 1.54 5.92 4.4 4.4 0 0 1-2.15 1.85v-5.39a.81.81 0 0 0-.41-.7zm1.7-2.7a4.41 4.41 0 0 1 .58 2.86l-.14-.08-4.54-2.62a.81.81 0 0 0-.81 0l-5.56 3.21v-2.23a.08.08 0 0 1 .04-.07l4.57-2.64a4.44 4.44 0 0 1 5.86 1.57zM8.33 10.4l1.93-1.11a.08.08 0 0 1 .08 0l4.57 2.64a4.44 4.44 0 0 1 1.54 5.92 4.4 4.4 0 0 1-2.15 1.85v-5.39a.81.81 0 0 0-.41-.7l-5.56-3.21zM12 14.12l-2.6-1.5 2.6-1.5 2.6 1.5-2.6 1.5z"/></svg>',
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
    name: "Direct SDK (@memofs/core)",
    badge: "Core Runtime",
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 1.84L2.4 7.38v11.08L12 23.99l9.6-5.53V7.38L12 1.84zM12 4.15l7.6 4.38v8.77L12 21.68l-7.6-4.38V8.53L12 4.15z"/></svg>',
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
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>',
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
        <span class="iq-tab-icon" v-html="stack.svg" />
        <span class="iq-tab-name">{{ stack.name }}</span>
      </button>
    </div>

    <!-- Active Stack Content Card -->
    <div class="iq-card" v-if="activeStack">
      <div class="iq-card-banner">
        <div class="iq-card-title-group">
          <span class="iq-card-badge">{{ activeStack.badge }}</span>
          <h3 class="iq-card-name">{{ activeStack.name }}</h3>
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
