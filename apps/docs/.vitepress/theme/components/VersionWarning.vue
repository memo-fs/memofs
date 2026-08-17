<script setup lang="ts">
import { useRoute } from "vitepress";
import { computed } from "vue";
import { CURRENT_VERSION, isArchivedPath } from "../../config/versions.mts";

const route = useRoute();

const isArchived = computed(() => {
	return isArchivedPath(route.path);
});

const currentVersionLabel = CURRENT_VERSION;
</script>

<template>
  <div v-if="isArchived" class="version-warning-banner" role="alert">
    <div class="version-warning-content">
      <span class="version-warning-icon">⚠️</span>
      <span class="version-warning-text">
        You are viewing documentation for an older version of MemoFS.
      </span>
      <a href="/introduction" class="version-warning-link">
        Switch to latest ({{ currentVersionLabel }}) →
      </a>
    </div>
  </div>
</template>

<style scoped>
.version-warning-banner {
  background: var(--vp-c-warning-soft, rgba(234, 179, 8, 0.14));
  border: 1px solid var(--vp-c-warning-dimm, rgba(234, 179, 8, 0.3));
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 24px;
}

.version-warning-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 14px;
  color: var(--vp-c-text-1);
}

.version-warning-icon {
  font-size: 16px;
}

.version-warning-text {
  font-weight: 500;
}

.version-warning-link {
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: opacity 0.2s ease;
}

.version-warning-link:hover {
  opacity: 0.85;
}
</style>
