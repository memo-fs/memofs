<script setup>
import { useData } from 'vitepress'

const { frontmatter } = useData()
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
     <!-- Back button -->
    <div class="mb-8">
      <a href="/blog/" class="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
        &larr; Back to all insights
      </a>
    </div>

    <!-- Detail Box / Hero Section -->
    <article class="relative">
      <header class="text-center py-6 mb-8">
        <!-- Tags Badges -->
        <div v-if="frontmatter.tags && frontmatter.tags.length > 0" class="mb-4 flex flex-wrap justify-center gap-2">
          <span v-for="tag in frontmatter.tags" :key="tag" class="rounded-none bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 px-2.5 py-0.5 text-[10px] font-mono text-brand-cyan dark:text-[#7cd1f9] uppercase">
            #{{ tag }}
          </span>
        </div>

        <!-- Date & Read Time -->
        <div class="text-xs font-mono font-medium tracking-widest uppercase text-zinc-500">
          {{ frontmatter.date || new Date().toISOString().split('T')[0] }} • {{ frontmatter.readTime || '5 min read' }}
        </div>

        <!-- Large Hero Title -->
        <h1 class="mt-4 text-3xl sm:text-5xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight max-w-3xl mx-auto">
          {{ frontmatter.title }}
        </h1>

        <!-- Hero Graphic -->
        <div class="relative mt-8 aspect-[21/9] w-full flex items-center justify-center">
          <img
            :src="frontmatter.coverImage || 'https://images.unsplash.com/photo-1784792993431-d81e88fdacfb?q=80&w=1744&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'"
            :alt="frontmatter.title"
            class="h-full w-full object-cover rounded-xl"
            style="-webkit-mask-image: radial-gradient(ellipse at center, black 35%, transparent 95%); mask-image: radial-gradient(ellipse at center, black 35%, transparent 95%);"
          />

          <!-- Author Details -->
          <div class="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-10 flex items-center gap-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm p-3 rounded-xl border border-zinc-200 dark:border-white/10 shadow-lg">
            <img :src="frontmatter.authorAvatar || 'https://github.com/shadcn.png'" class="w-10 h-10 rounded-full border border-zinc-200 dark:border-white/20" />
            <div class="text-left">
              <p class="text-sm font-bold text-zinc-900 dark:text-white">{{ frontmatter.author || 'MemoFS Team' }}</p>
              <p class="text-xs text-zinc-500">{{ frontmatter.authorRole || 'Core Team' }}</p>
            </div>
          </div>
        </div>
      </header>

      <!-- Summary -->
      <div v-if="frontmatter.summary" class="max-w-2xl mx-auto mb-8 text-center">
        <p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed italic">
          "{{ frontmatter.summary }}"
        </p>
      </div>

      <!-- HTML Body Content -->
      <div class="vp-doc prose dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-6 text-base sm:text-[1.0625rem] sm:leading-relaxed">
        <slot />
      </div>
    </article>
  </div>
</template>
