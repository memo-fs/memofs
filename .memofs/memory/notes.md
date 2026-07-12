# Notes

Use this file for lower-confidence notes, observations, and working memory.

## 2026-07-12T07:57:40.540Z
- kind: note
- tags: mobile, responsive, hero-title, vitepress, css
- confidence: 0.9
- source: memofs
- metadata: {"id":"mem_5e4871f89c41ac70"}

Title "MemoFS" not showing on initial render - caused by VitePress `.clip` class applying transparent text fill color via scoped styles. Fix: remove `.clip` class in onMounted when splitting title into spans.

## 2026-07-12T08:03:35.133Z
- kind: decision
- tags: animation, homepage, performance, decision
- confidence: 1
- source: memofs
- metadata: {"id":"mem_1753ebbac352f976"}

Removed all homepage animations except terminal typing. Removed: tekOrb (background orbs), tek-reveal-ready (scroll-triggered section reveals), fadeInUp, IntersectionObserver reveal JS. Kept: HeroTerminal's htGlow and htCaret animations.

## 2026-07-12T08:11:31.129Z
- kind: decision
- tags: hero-title, css, vitepress, scoped-styles, fix
- confidence: 1
- source: memofs
- metadata: {"id":"mem_d36306cb0a200e11"}

Fixed MemoFS title not showing on initial render. Root cause: VitePress scoped `.clip` class sets `-webkit-text-fill-color: transparent` with higher specificity than global overrides. Fix: added `.VPHero .name.clip` CSS rule with `!important` to force visible text color as CSS fallback. JS still splits into colored spans for gradient effect, but text is visible even without JS.
