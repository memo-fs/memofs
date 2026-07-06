import { Miniflare } from "miniflare";

const mf = new Miniflare({
	modules: [
		{
			type: "ESModule",
			path: "entry.mjs",
			contents: `
    import { Tekmemo } from "@memofs/core";
    export default { async fetch() { return new Response("OK " + typeof Tekmemo); } };
  `,
		},
	],
	compatibilityFlags: ["nodejs_compat"],
	compatibilityDate: "2026-06-20",
});
process.stderr.write("--- probe start ---\n");
try {
	const res = await mf.dispatchFetch("http://x/");
	process.stderr.write("STATUS " + res.status + "\n");
	process.stderr.write("BODY " + (await res.text()) + "\n");
} catch (e) {
	process.stderr.write(
		"ERR " + (e?.message || String(e)) + "\n" + (e?.stack || "") + "\n",
	);
}
await mf.dispose();
