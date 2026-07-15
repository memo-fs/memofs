<script setup lang="ts">
import { useData, useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { computed, nextTick, onMounted, watch } from "vue";
import AnnouncementPill from "./AnnouncementPill.vue";
import AskAiBar from "./AskAiBar.vue";
import BlogSidebar from "./BlogSidebar.vue";
import AudienceSection from "./AudienceSection.vue";
import BentoShowcase from "./BentoShowcase.vue";
import BlogPostFooter from "./BlogPostFooter.vue";
import BlogPostHeader from "./BlogPostHeader.vue";

import BottomCta from "./BottomCta.vue";
import ComparisonSection from "./ComparisonSection.vue";
import CredibilityBar from "./CredibilityBar.vue";
import HeroTerminal from "./HeroTerminal.vue";
import HowItWorks from "./HowItWorks.vue";
import ProblemSection from "./ProblemSection.vue";
import RuntimesSection from "./RuntimesSection.vue";
import SidebarBrand from "./SidebarBrand.vue";
import StatsStrip from "./StatsStrip.vue";

const { Layout } = DefaultTheme;

const { frontmatter } = useData();
/** Blog posts opt in with `blog: post` frontmatter to get editorial chrome. */
const isBlogPost = computed(() => frontmatter.value.blog === "post");

const route = useRoute();

const splitTitle = () => {
	const nameEl = document.querySelector<HTMLElement>(".VPHero .name");
	if (nameEl && nameEl.textContent === "MemoFS") {
		nameEl.classList.remove("clip");
		nameEl.innerHTML =
			'<span class="name-memo">Memo</span><span class="name-fs">FS</span>';
	}
};

onMounted(() => {
	splitTitle();
});

watch(
	() => route.path,
	(to) => {
		if (to === "/") {
			nextTick(() => splitTitle());
		}
	},
);
</script>

<template>
  <Layout>
    <template #sidebar-nav-before>
      <SidebarBrand />
      <BlogSidebar v-if="isBlogPost" />
    </template>

    <template #doc-before>
      <BlogPostHeader v-if="isBlogPost" />
    </template>

    <template #aside-top>
      <AskAiBar v-if="!isBlogPost" class="ask-ai-bar-aside" />
    </template>

    <template #doc-after>
      <BlogPostFooter v-if="isBlogPost" />
    </template>

    <template #home-hero-before>
      <AnnouncementPill
        badge="Cloud"
        text="Introducing MemoFS Cloud"
        href="https://memofs.dev"
      />
    </template>

    <template #home-hero-image>
      <div class="hero-visual-container">
        <HeroTerminal />
      </div>
    </template>

    <template #home-hero-after>
      <div class="home-custom-sections">
        <CredibilityBar />
      </div>
    </template>

    <template #home-features-after>
      <div class="home-custom-sections">
        <hr class="tek-hairline" />
        <ProblemSection />
        <hr class="tek-hairline" />
        <HowItWorks />
        <StatsStrip />
        <hr class="tek-hairline" />
        <BentoShowcase />
        <hr class="tek-hairline" />
        <RuntimesSection />
        <hr class="tek-hairline" />
        <AudienceSection />
        <hr class="tek-hairline" />
        <ComparisonSection />
        <BottomCta />
      </div>
    </template>
  </Layout>
</template>

<style scoped>
.ask-ai-bar-aside {
  margin-bottom: 16px;
}

.container {
  max-width: var(--tek-container-narrow);
  margin: 0 auto;
  padding: 0 24px;
}

.container-wide {
  max-width: var(--tek-container);
  margin: 0 auto;
  padding: 0 24px;
}

.home-custom-sections {
  max-width: var(--tek-container);
  margin: 0 auto;
}

.hero-visual-container {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

<style>
@media (max-width: 959px) {
  .VPHero .image {
    display: none !important;
  }
}

@media (max-width: 640px) {
  .VPHero {
    padding-top: calc(var(--vp-nav-height) + var(--vp-layout-top-height, 0px) + 16px) !important;
  }
}
</style>
