/**
 * Ambient type declarations for raw asset imports.
 *
 * Allows importing `.md` files as string constants via the `?raw` suffix,
 * e.g. `import memoryTemplate from "./templates/memory.md?raw"`.
 * The content is inlined at build time by tsdown/rolldown.
 */

declare module "*.md?raw" {
	const content: string;
	export default content;
}
