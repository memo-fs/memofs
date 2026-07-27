---
title: "Lesson 3: Anatomy of a SKILL.md"
description: "Frontmatter requirements, body sections, and progressive disclosure."
---

# Lesson 3: Anatomy of a SKILL.md

A `SKILL.md` file consists of two primary components: YAML frontmatter and Markdown body.

## Frontmatter Schema
```yaml
---
name: my-skill
description: Triggers when performing database migrations or schema updates.
---
```

## Progressive Disclosure
1. **Discovery**: The agent reads only `name` and `description` upfront to save context tokens.
2. **Execution**: The agent loads the full Markdown body only when the skill is triggered.
