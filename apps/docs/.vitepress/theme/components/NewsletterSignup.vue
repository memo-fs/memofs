<script setup lang="ts">
import { computed, ref } from "vue";

/**
 * Newsletter signup backed by Plunk's public `/v1/track` endpoint.
 *
 * The docs site is a static VitePress build with no backend, so we call Plunk
 * directly from the browser. Plunk's public key (`pk_…`) is scoped to the
 * track endpoint exactly for this — it can be shipped in client code. Triggering
 * an event auto-subscribes the contact unless `subscribed: false` is passed, so
 * one POST both records the signup and subscribes the email.
 *
 * The key is read from `VITE_PLUNK_PUBLIC_KEY` (Vite inlines `VITE_`-prefixed
 * env at build). When it's absent the form renders disabled rather than failing
 * at runtime, mirroring how `apps/cloud` degrades when `PLUNK_API_KEY` is unset.
 *
 * @see apps/cloud/src/server/email.ts — the server-side Plunk transport (secret key).
 */

const PLUNK_TRACK_ENDPOINT = "https://api.useplunk.com/v1/track";

const props = withDefaults(
	defineProps<{
		/** Plunk event name fired on signup — scopes the source (e.g. "blog", "changelog"). */
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

const publicKey = import.meta.env.VITE_PLUNK_PUBLIC_KEY as string | undefined;
const isConfigured = computed(() => Boolean(publicKey));

type Status = "idle" | "submitting" | "success" | "error";

const email = ref("");
const status = ref<Status>("idle");
const errorMessage = ref("");

/** Pragmatic email shape check — the real validation is Plunk's. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleSubmit() {
	if (status.value === "submitting") return;

	const value = email.value.trim();
	if (!EMAIL_RE.test(value)) {
		status.value = "error";
		errorMessage.value = "Please enter a valid email address.";
		return;
	}

	if (!publicKey) {
		status.value = "error";
		errorMessage.value = "Newsletter signup is not configured.";
		return;
	}

	status.value = "submitting";
	errorMessage.value = "";

	try {
		const response = await fetch(PLUNK_TRACK_ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${publicKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				event: props.event,
				email: value,
				subscribed: true,
			}),
		});

		if (!response.ok) {
			throw new Error(`Plunk track failed (${response.status})`);
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
          :disabled="!isConfigured || status === 'submitting'"
          required
        />
        <button
          type="submit"
          class="newsletter-button"
          :disabled="!isConfigured || status === 'submitting'"
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
  margin: 40px 0;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--tek-radius-lg);
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
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
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
