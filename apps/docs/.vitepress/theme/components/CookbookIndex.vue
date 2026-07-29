<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { data as cookbooks } from '../cookbooks.data.ts'
import { withBase } from 'vitepress'

const searchQuery = ref('')
const selectedCategory = ref('all')

const categories = [
  { id: 'all', name: 'All' },
  { id: 'cli', name: 'Apps & CLI' },
  { id: 'connectors', name: 'Connectors' },
  { id: 'mcp', name: 'MCP & Cloud' }
]

const getRecipeCategory = (recipe) => {
  const url = (recipe.url || '').toLowerCase()
  const title = (recipe.frontmatter?.title || '').toLowerCase()
  if (url.includes('connector') || title.includes('connector') || title.includes('github') || title.includes('notion') || title.includes('linear')) {
    return 'connectors'
  }
  if (url.includes('mcp') || url.includes('sync') || url.includes('hosted') || title.includes('mcp') || title.includes('sync')) {
    return 'mcp'
  }
  return 'cli'
}

const filteredCookbooks = computed(() => {
  return cookbooks.filter(item => {
    const matchesCat = selectedCategory.value === 'all' || getRecipeCategory(item) === selectedCategory.value
    if (!matchesCat) return false

    if (!searchQuery.value) return true
    const q = searchQuery.value.toLowerCase()
    return (
      item.frontmatter?.title?.toLowerCase().includes(q) ||
      item.url?.toLowerCase().includes(q)
    )
  })
})

const getBrandIconType = (recipe) => {
  const url = (recipe.url || '').toLowerCase()
  const title = (recipe.frontmatter?.title || '').toLowerCase()
  const combined = url + ' ' + title

  if (combined.includes('aider')) return 'aider'
  if (combined.includes('amazon')) return 'amazon-q'
  if (combined.includes('antigravity')) return 'antigravity'
  if (combined.includes('claude')) return 'claude'
  if (combined.includes('cline')) return 'cline'
  if (combined.includes('codex')) return 'codex'
  if (combined.includes('command')) return 'command-code'
  if (combined.includes('copilot')) return 'copilot'
  if (combined.includes('cursor')) return 'cursor'
  if (combined.includes('gemini')) return 'gemini'
  if (combined.includes('github')) return 'github'
  if (combined.includes('jetbrains')) return 'jetbrains'
  if (combined.includes('kilo')) return 'kilo-code'
  if (combined.includes('notion')) return 'notion'
  if (combined.includes('opencode')) return 'opencode'
  if (combined.includes('windsurf')) return 'windsurf'
  if (combined.includes('zed')) return 'zed'
  return 'memofs'
}

const brandMap = {
  'aider': { name: 'Aider', icon: 'simple-icons:python' },
  'amazon-q': { name: 'Amazon Q', icon: 'simple-icons:amazonaws' },
  'antigravity': { name: 'Google Antigravity', icon: 'logos:google-icon' },
  'claude': { name: 'Claude Code', icon: 'simple-icons:anthropic' },
  'cline': { name: 'Cline', icon: 'ph:robot-bold' },
  'codex': { name: 'OpenAI Codex', icon: 'simple-icons:openai' },
  'command-code': { name: 'Command Code', icon: 'ph:terminal-window-bold' },
  'copilot': { name: 'GitHub Copilot', icon: 'simple-icons:githubcopilot' },
  'cursor': { name: 'Cursor', icon: 'simple-icons:cursor' },
  'gemini': { name: 'Gemini CLI', icon: 'simple-icons:googlegemini' },
  'github': { name: 'GitHub', icon: 'simple-icons:github' },
  'jetbrains': { name: 'JetBrains AI', icon: 'simple-icons:jetbrains' },
  'kilo-code': { name: 'Kilo Code', icon: 'ph:lightning-bold' },
  'notion': { name: 'Notion', icon: 'simple-icons:notion' },
  'opencode': { name: 'OpenCode', icon: 'ph:code-bold' },
  'windsurf': { name: 'Windsurf', icon: 'simple-icons:codeium' },
  'zed': { name: 'Zed AI', icon: 'simple-icons:zeddotdev' },
  'memofs': { name: 'MemoFS', icon: 'ph:brain-bold' }
}

const getBrandInfo = (recipe) => {
  const type = getBrandIconType(recipe)
  return brandMap[type] || brandMap['memofs']
}
</script>

<template>
  <div class="cookbook-page">
    <div class="cookbook-container">
      <!-- Header -->
      <div class="cookbook-header">
        <span class="cookbook-kicker">Recipes</span>
        <h1 class="cookbook-title">Cookbooks</h1>
        <p class="cookbook-subtitle">
          Step-by-step tutorials for installing, configuring, and using MemoFS.
        </p>
      </div>

      <!-- Controls (Categories + Search) -->
      <div class="cookbook-controls">
        <div class="cookbook-category-pills">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            class="pill-btn"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectedCategory = cat.id"
          >
            {{ cat.name }}
          </button>
        </div>

        <div class="cookbook-search-box">
          <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search cookbooks..." 
            class="search-field"
          />
        </div>
      </div>

      <!-- Grid of Cards (3 per row on desktop, without description) -->
      <div v-if="filteredCookbooks.length > 0" class="cookbook-grid">
        <a
          v-for="recipe in filteredCookbooks" 
          :key="recipe.url"
          :href="withBase(recipe.url)"
          class="cookbook-card"
        >
          <div class="card-main-content">
            <div class="card-meta">
              <span class="meta-label">How-To Guide</span>
              <template v-if="recipe.frontmatter?.estimatedMinutes">
                <span class="meta-dot">•</span>
                <span class="meta-time">{{ recipe.frontmatter.estimatedMinutes }} min read</span>
              </template>
            </div>

            <h2 class="card-title">
              {{ recipe.frontmatter?.title }}
            </h2>
          </div>

          <div class="card-footer">
            <!-- Brand Icon -->
            <div class="brand-badge">
              <svg v-if="getBrandIconType(recipe) === 'memofs'" class="icon-svg" viewBox="0 0 100 100">
                <polygon fill="#4cae61" points="50,82 12,62 50,45 88,62" />
                <polygon fill="#2c9ab8" points="50,63 12,43 50,26 88,43" />
                <polygon fill="#258acb" points="50,45 12,25 50,8 88,25" />
                <circle fill="#ffffff" cx="50" cy="23" r="3.5" />
                <circle fill="#ffffff" cx="35" cy="30" r="1.5" opacity="0.6" />
                <circle fill="#ffffff" cx="65" cy="30" r="1.5" opacity="0.6" />
                <circle fill="#ffffff" cx="50" cy="37" r="1.5" opacity="0.6" />
              </svg>
              <Icon v-else :icon="getBrandInfo(recipe).icon" class="icon-svg" />
              <span>{{ getBrandInfo(recipe).name }}</span>
            </div>

            <span class="read-link">
              Read Guide &rarr;
            </span>
          </div>
        </a>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <h3 class="empty-title">No cookbooks found</h3>
        <p class="empty-desc">We couldn't find any cookbooks matching your search query.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cookbook-page {
  width: 100%;
  padding: 48px 0 96px;
}

.cookbook-container {
  max-width: var(--tek-container, 1200px);
  margin: 0 auto;
  padding: 0 24px;
}

.cookbook-header {
  margin-bottom: 36px;
}

.cookbook-kicker {
  display: inline-block;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--vp-c-brand-1);
}

.cookbook-title {
  font-family: var(--vp-font-family-display);
  font-size: clamp(32px, 5vw, 44px);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  margin-top: 6px;
  line-height: 1.1;
}

.cookbook-subtitle {
  font-size: 16px;
  color: var(--vp-c-text-2);
  margin-top: 12px;
  max-width: 640px;
  line-height: 1.6;
}

.cookbook-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 40px;
}

.cookbook-category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill-btn {
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pill-btn:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

.pill-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.cookbook-search-box {
  position: relative;
  width: 100%;
  max-width: 320px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--vp-c-text-3);
  pointer-events: none;
}

.search-field {
  display: block;
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  padding: 8px 16px 8px 36px;
  font-size: 14px;
  color: var(--vp-c-text-1);
  outline: none;
  transition: all 0.2s ease;
}

.search-field:focus {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.cookbook-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 960px) {
  .cookbook-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .cookbook-grid {
    grid-template-columns: 1fr;
  }
}

.cookbook-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  padding: 24px;
  text-decoration: none !important;
  transition: all 0.3s ease;
  height: 100%;
}

.cookbook-card:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-alt);
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.25);
  transform: translateY(-2px);
}

.card-main-content {
  display: flex;
  flex-direction: column;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  margin-bottom: 12px;
}

.meta-label {
  font-weight: 700;
}

.meta-dot {
  color: var(--vp-c-text-3);
}

.meta-time {
  color: var(--vp-c-text-2);
}

.card-title {
  font-family: var(--vp-font-family-display);
  font-size: 19px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.35;
  margin-bottom: 0;
  transition: color 0.2s ease;
}

.cookbook-card:hover .card-title {
  color: var(--vp-c-brand-1);
}

.card-footer {
  margin-top: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 16px;
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.icon-svg {
  width: 16px;
  height: 16px;
}

.read-link {
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.cookbook-card:hover .read-link {
  text-decoration: underline;
}

.empty-state {
  padding: 64px 24px;
  text-align: center;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 6px;
  grid-column: 1 / -1;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto;
  color: var(--vp-c-text-3);
}

.empty-title {
  margin-top: 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.empty-desc {
  margin-top: 4px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}
</style>
