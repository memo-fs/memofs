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
		cmd: "tekmemo init quoin",
		note: "Initialize and connect to cloud",
	},
	{ cmd: "tekmemo push", note: "Pushed 247 files (2.4 MB) in 1.2s" },
	{ cmd: "tekmemo pull", note: "Pull on any other machine" },
];

export const SOLUTION_BULLETS = [
	"Pre-sync snapshots before every push — one-click rollback",
	"Content-addressed blobs (sha256) — no silent overwrites",
	"Cursor-based protocol — conflicts surface immediately, not silently",
	"Zero-config connectors — GitHub, Notion, and more already wired in",
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
		cmd: "tekmemo init quion",
		title: "Initialize",
		desc: "Creates .tekmemo/ in the current directory and registers the project with TekMemo Cloud. Generates an API key for this machine.",
	},
	{
		step: "02",
		cmd: "tekmemo push",
		title: "Push",
		desc: "Diffs local files against the last cursor, uploads changed blobs, advances the cursor. Takes a pre-push snapshot automatically.",
	},
	{
		step: "03",
		cmd: "tekmemo pull",
		title: "Pull",
		desc: "Downloads all blobs since your local cursor and writes them to disk. On any machine — laptop, CI, workstation.",
	},
];

export type Connector = {
	icon: "github" | "notion" | "linear";
	name: string;
	desc: string;
	status: string;
	disabled: boolean;
};

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
		feature: "Privacy — no content scanning",
		tm: { status: "yes" },
		git: { status: "yes" },
		st: { status: "yes" },
		db: { status: "no" },
	},
	{
		feature: "Works offline",
		tm: { status: "yes", note: "Engine local" },
		git: { status: "yes" },
		st: { status: "yes" },
		db: { status: "partial", note: "Partial" },
	},
];

export const FAQ_ITEMS = [
	{
		q: "What exactly does TekMemo Cloud sync?",
		a: "Everything inside your .tekmemo/ directory — config, memories, connector manifests, and any other files you've created there. The sync is byte-for-byte; we do not transform or re-encode your files.",
	},
	{
		q: "Does TekMemo Cloud read my memory contents?",
		a: "No. Blobs are stored content-addressed (sha256) in R2 object storage. Your files are encrypted at rest. We store metadata (paths, sizes, hashes) to power the sync protocol — we do not index or analyze content.",
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
