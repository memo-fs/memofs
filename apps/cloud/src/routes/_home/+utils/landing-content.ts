/**
 * Landing-page content — copy and structured data for the home route.
 *
 * Colocated under `+utils/` so it is excluded from routing (any path segment
 * starting with `+` is treated as colocated by `react-router-auto-routes`).
 * Keeping the long arrays here lets each section component in `+components/`
 * stay well under the 80-line soft cap.
 */

export const HERO_COMMANDS = [
	{
		cmd: "tekmemo init",
		note: "Initialize local memory and connect to cloud",
	},
	{ cmd: "tekmemo push", note: "Sync: 247 memory nodes pushed to Cloud" },
	{
		cmd: "curl -H \"Authorization: Bearer tm_...\" https://api.tekmemo.com/v1/recall?q=\"react-router\"",
		note: "{\"data\": {\"context\": \"Use +loader.server.ts for route data fetching...\"}}",
	},
];

export const SOLUTION_BULLETS = [
	"Pre-sync snapshots before every push — one-click rollback",
	"Content-addressed blobs (sha256) — no silent overwrites",
	"Fully-hosted serverless runtime — query your memory from anywhere via API",
	"Semantic search & graph extraction — runs automatically in-process",
];

export const CLOUD_FILES = [
	{ label: ".tekmemo/config.json", size: "1.0 KB" },
	{ label: ".tekmemo/connectors.json", size: "2.0 KB" },
	{ label: ".tekmemo/memories/2026-06-22.md", size: "4.0 KB" },
	{ label: ".tekmemo/memories/2026-06-21.md", size: "3.6 KB" },
];

export const SYNC_STEPS = [
	{
		step: "01",
		cmd: "tekmemo init",
		title: "Initialize & Sync",
		desc: "Creates .tekmemo/ in the current directory and registers the project with TekMemo Cloud. Mirrors your files across devices.",
	},
	{
		step: "02",
		cmd: "tekmemo push",
		title: "Push Memories",
		desc: "Diffs local files, uploads changed blobs, and advances the sync cursor. Automatically triggers knowledge graph extraction.",
	},
	{
		step: "03",
		cmd: "curl https://api.tekmemo.com/v1/recall",
		title: "Hosted Recall API",
		desc: "Query your memory remotely. The hosted serverless runtime handles embeddings, semantic search, and context rendering over HTTP.",
	},
];

export const CONNECTORS: Connector[] = [
	{
		icon: "github",
		name: "GitHub",
		desc: "Issues, PRs, README files from any org or repo",
		status: "Available",
		disabled: false,
	},
	{
		icon: "notion",
		name: "Notion",
		desc: "Pages, databases, and workspace content",
		status: "Available",
		disabled: false,
	},
	{
		icon: "linear",
		name: "Linear",
		desc: "Issues, projects, and team activity",
		status: "Coming soon",
		disabled: true,
	},
];

export type Connector = {
	icon: "github" | "notion" | "linear";
	name: string;
	desc: string;
	status: string;
	disabled: boolean;
};

// Comparison cells use a typed status so we render clean lucide icons instead
// of emoji. `note` is an optional short label under the icon (e.g. "Manual").
export type Cell = { status: "yes" | "partial" | "no"; note?: string };

export const COMPARISON: {
	feature: string;
	tm: Cell;
	git: Cell;
	st: Cell;
	db: Cell;
}[] = [
	{
		feature: "Zero-config setup",
		tm: { status: "yes" },
		git: { status: "partial", note: "Manual" },
		st: { status: "partial", note: "Peer setup" },
		db: { status: "yes" },
	},
	{
		feature: "Hosted Serverless Runtime",
		tm: { status: "yes", note: "API Query" },
		git: { status: "no" },
		st: { status: "no" },
		db: { status: "no" },
	},
	{
		feature: "Pre-sync snapshots",
		tm: { status: "yes", note: "Automatic" },
		git: { status: "partial", note: "Manual commits" },
		st: { status: "no" },
		db: { status: "no" },
	},
	{
		feature: "Content-addressed blobs",
		tm: { status: "yes" },
		git: { status: "yes" },
		st: { status: "yes" },
		db: { status: "no" },
	},
	{
		feature: "One-click rollback",
		tm: { status: "yes" },
		git: { status: "partial", note: "git reset" },
		st: { status: "no" },
		db: { status: "partial", note: "Version history" },
	},
	{
		feature: "Connector ingestion",
		tm: { status: "yes", note: "Built-in" },
		git: { status: "no" },
		st: { status: "no" },
		db: { status: "no" },
	},
	{
		feature: "Conflict detection",
		tm: { status: "yes", note: "Cursor-based" },
		git: { status: "yes", note: "Merge" },
		st: { status: "partial", note: "On conflict" },
		db: { status: "no", note: "Silent" },
	},
	{
		feature: "Privacy & Encryption",
		tm: { status: "yes" },
		git: { status: "yes" },
		st: { status: "yes" },
		db: { status: "no" },
	},
];

export const FAQ_ITEMS = [
	{
		q: "What is the Hosted Runtime?",
		a: "It is a secure, serverless execution environment in the cloud that lets you query your local memories remotely. Instead of running the extraction and search local-only, our cloud runs an in-process instance of the TekMemo engine to provide instant semantic recall, note-taking, and context generation via HTTP.",
	},
	{
		q: "Does TekMemo Cloud read my memory contents?",
		a: "By default, your synced memory files are private, content-addressed, and stored securely. If you enable the Hosted Runtime, the cloud instantiates a secure, isolated serverless engine to compile your knowledge graph, calculate embeddings, and answer queries. You can query your memory anytime via our fast Cloud API.",
	},
	{
		q: "What exactly does TekMemo Cloud sync?",
		a: "Everything inside your .tekmemo/ directory — config, memories, connector manifests, and any other files you've created there. The sync is byte-for-byte; we do not transform or re-encode your files.",
	},
	{
		q: "What happens if I push from two machines simultaneously?",
		a: "Each push carries the last-known cursor. If your cursor is stale, the push is rejected with a 409 — you pull first, merge locally, then push. There are no silent conflicts.",
	},
	{
		q: "Can I self-host instead?",
		a: "Yes. The TekMemo engine is open-source and works entirely offline. Cloud sync is an optional add-on. You can also use git or Syncthing — the comparison section above shows the honest trade-offs.",
	},
	{
		q: "What counts as a connector toward the cap?",
		a: "Each configured data source (GitHub org, Notion workspace) counts as one connector. The Free tier includes 1; Pro includes 3; Teams is unlimited.",
	},
	{
		q: "How does billing work?",
		a: "We use Polar as our Merchant of Record. Polar handles checkout, taxes, invoices, and cancellation. You can manage your subscription directly from the Billing page in the dashboard.",
	},
];
