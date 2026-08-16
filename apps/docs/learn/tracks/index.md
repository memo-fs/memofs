---
layout: page
title: MemoFS Tracks
description: "Structured learning tracks to master MemoFS memory runtimes, agent integration, MCP servers, and cloud synchronization."
sidebar: false
aside: false
---

<!--
Tracks Structure Overview:
- Each learning track lives in its own directory under `apps/docs/learn/tracks/<track-slug>/`
- Track Directory Structure:
  - `index.md`: The main entry page for the track containing title, description, and module outlines in frontmatter.
  - Subdirectories for each module (e.g. `foundations/`, `architecture/`, `deployment/`).
  - Individual lesson `.md` files located inside their respective module subdirectories.
- VitePress & Component Integration:
  - Track metadata and lesson structure are indexed by `apps/docs/.vitepress/theme/tracks.data.ts`.
  - Sidebar routing for each track is registered in `apps/docs/.vitepress/config/sidebar.mts`.
-->

<script setup>
import TracksIndex from '../../.vitepress/theme/components/TracksIndex.vue'
</script>

<TracksIndex />

