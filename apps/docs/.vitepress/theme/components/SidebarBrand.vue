<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: Used by Vue template.
import { withBase } from "vitepress";
</script>

<template>
  <a class="TekMemoSidebarBrand" :href="withBase('/')">
    <img class="TekMemoSidebarBrandIcon" :src="withBase('/tekmemo.svg')" alt="TekMemo" />
    <span class="TekMemoSidebarBrandContent">
      <span class="TekMemoSidebarBrandName">TekMemo</span>
      <span class="TekMemoSidebarBrandLabel">Developer docs</span>
    </span>
  </a>
</template>
