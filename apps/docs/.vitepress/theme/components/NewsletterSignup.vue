<script setup lang="ts">
import { ref } from "vue";

/**
 * Newsletter signup for the docs site.
 *
 * The docs site is a static VitePress build. Resend has no browser-safe API
 * key, so the form POSTs to a same-origin Cloudflare Pages Function
 * (`/api/subscribe`) that holds the secret `RESEND_API_KEY` server-side and
 * forwards the contact to Resend, adding it to the "Docs newsletter" segment.
 * The secret never reaches the browser.
 *
 * @see apps/docs/functions/api/subscribe.ts — the server-side proxy.
 */

const SUBSCRIBE_ENDPOINT = "/api/subscribe";

withDefaults(
	defineProps<{
		/** Source label — accepted for caller compatibility; the segment is applied server-side. */
		event?: string;
		/** Headline above the form. */
		title?: string;
		/** Supporting line under the headline. */
		description?: string;
	}>(),
	{
		event: "blog",
		title: "Stay in the loop",
		description:
			"New posts, changelog highlights, and the occasional deep dive — straight to your inbox. No spam.",
	},
);

type Status = "idle" | "submitting" | "success" | "error";

const email = ref("");
const status = ref<Status>("idle");
const errorMessage = ref("");

/** Pragmatic email shape check — the real validation runs server-side. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleSubmit() {
	if (status.value === "submitting") return;

	const value = email.value.trim();
	if (!EMAIL_RE.test(value)) {
		status.value = "error";
		errorMessage.value = "Please enter a valid email address.";
		return;
	}

	status.value = "submitting";
	errorMessage.value = "";

	try {
		const response = await fetch(SUBSCRIBE_ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: value }),
		});

		if (!response.ok) {
			throw new Error(`Subscribe failed (${response.status})`);
		}

		status.value = "success";
		email.value = "";
	} catch {
		status.value = "error";
		errorMessage.value = "Something went wrong. Please try again.";
	}
}
</script>

<template>
  <section class="newsletter">
    <div class="newsletter-body">
      <h3 class="newsletter-title">{{ title }}</h3>
      <p class="newsletter-description">{{ description }}</p>

      <form
        v-if="status !== 'success'"
        class="newsletter-form"
        @submit.prevent="handleSubmit"
      >
        <input
          v-model="email"
          type="email"
          class="newsletter-input"
          placeholder="you@example.com"
          autocomplete="email"
          aria-label="Email address"
          :disabled="status === 'submitting'"
          required
        />
        <button
          type="submit"
          class="newsletter-button"
          :disabled="status === 'submitting'"
        >
          {{ status === "submitting" ? "Subscribing…" : "Subscribe" }}
        </button>
      </form>

      <p v-if="status === 'success'" class="newsletter-note success">
        ✓ You're in. Check your inbox to confirm.
      </p>
      <p v-else-if="status === 'error'" class="newsletter-note error">
        {{ errorMessage }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.newsletter {
  margin: 20px 0;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--tek-radius);
  background: var(--vp-c-bg-soft);
  box-shadow: var(--tek-shadow-sm);
}

.newsletter-title {
  font-family: var(--vp-font-family-display);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
  margin: 0 0 8px;
}

.newsletter-description {
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0 0 18px;
}

.newsletter-form {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.newsletter-input {
  flex: 1;
  min-width: 220px;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.newsletter-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.newsletter-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.newsletter-button {
  flex-shrink: 0;
  padding: 10px 22px;
  font-family: var(--vp-font-family-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-bg);
  background: var(--vp-c-brand-1);
  border: none;
  border-radius: var(--tek-radius);
  cursor: pointer;
  box-shadow: var(--tek-shadow-md);
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.newsletter-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--tek-shadow-glow);
}

.newsletter-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.newsletter-note {
  margin: 14px 0 0;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.newsletter-note.success {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.newsletter-note.error {
  color: var(--vp-c-danger-1, #e5484d);
}

@media (max-width: 640px) {
  .newsletter {
    padding: 24px 20px;
  }

  .newsletter-button {
    width: 100%;
  }
}
</style>
