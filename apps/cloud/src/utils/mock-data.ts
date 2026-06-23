export type Project = {
	id: string;
	name: string;
	storageBytes: number;
	maxStorageBytes: number;
	lastSyncAt: string;
	fileCount: number;
	cursor: string;
};

export const MOCK_PROJECTS: Project[] = [
	{
		id: "proj_m1n2o3",
		name: "my-laptop",
		storageBytes: 2_516_582,
		maxStorageBytes: 524_288_000,
		lastSyncAt: "2026-06-22T14:30:00Z",
		fileCount: 247,
		cursor: "cur_xyz789",
	},
	{
		id: "proj_p4q5r6",
		name: "work-ci",
		storageBytes: 891_289,
		maxStorageBytes: 524_288_000,
		lastSyncAt: "2026-06-22T09:00:00Z",
		fileCount: 83,
		cursor: "cur_abc123",
	},
];

export type Connector = {
	id: string;
	projectId: string;
	type: "github" | "notion";
	enabled: boolean;
	schedule: string;
	sourceMapping: string;
	lastRunStatus: "success" | "fail" | "never";
	lastRunAt: string | null;
	secretRef: string;
};

export const MOCK_CONNECTORS: Connector[] = [
	{
		id: "con_gh1",
		projectId: "proj_m1n2o3",
		type: "github",
		enabled: true,
		schedule: "1h",
		sourceMapping: "repos: org/*",
		lastRunStatus: "success",
		lastRunAt: "2026-06-22T13:45:00Z",
		secretRef: "sec_gh_f3a2b1",
	},
	{
		id: "con_nt1",
		projectId: "proj_m1n2o3",
		type: "notion",
		enabled: false,
		schedule: "6h",
		sourceMapping: "workspace: Engineering",
		lastRunStatus: "never",
		lastRunAt: null,
		secretRef: "sec_nt_d9e8f7",
	},
];

export const MOCK_API_KEYS = [
	{
		id: "key_1a2b3c",
		label: "laptop",
		lastFour: "3f9d",
		createdAt: "2026-05-01T10:00:00Z",
		lastSeen: "2026-06-22T14:30:00Z",
		revokedAt: null,
	},
	{
		id: "key_4d5e6f",
		label: "ci",
		lastFour: "7a1b",
		createdAt: "2026-05-15T08:00:00Z",
		lastSeen: "2026-06-22T09:00:00Z",
		revokedAt: null,
	},
	{
		id: "key_7g8h9i",
		label: "old-desktop",
		lastFour: "2c4e",
		createdAt: "2026-03-10T12:00:00Z",
		lastSeen: "2026-04-01T16:00:00Z",
		revokedAt: "2026-04-05T09:00:00Z",
	},
];

export const MOCK_ACCOUNT = {
	id: "acc_u1v2w3",
	plan: "Free" as const,
	storageBytes: 3_407_872,
	maxStorageBytes: 524_288_000,
	connectorsUsed: 1,
	maxConnectors: 1,
};

export const MOCK_USER = {
	id: "usr_alex",
	name: "Alex Chen",
	email: "alex@example.com",
};

export function userInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase();
}

/** Typed shape passed via `<Outlet context={…} />` from the dashboard layout. */
export type DashboardOutletContext = { selectedProject: Project };

export const MOCK_SYNC_CURSORS = [
	{
		id: "c1",
		projectId: "proj_m1n2o3",
		cursor: "cur_xyz789",
		createdAt: "2026-06-22T14:30:00Z",
		fileCount: 247,
	},
	{
		id: "c2",
		projectId: "proj_m1n2o3",
		cursor: "cur_mno456",
		createdAt: "2026-06-21T10:00:00Z",
		fileCount: 245,
	},
	{
		id: "c3",
		projectId: "proj_m1n2o3",
		cursor: "cur_def123",
		createdAt: "2026-06-20T08:30:00Z",
		fileCount: 241,
	},
];

export const MOCK_FILES = [
	{
		path: ".tekmemo/config.json",
		sha256: "a1b2c3d4e5f6...",
		size: 1024,
		updatedAt: "2026-06-22T14:30:00Z",
	},
	{
		path: ".tekmemo/connectors.json",
		sha256: "b2c3d4e5f6a1...",
		size: 2048,
		updatedAt: "2026-06-22T10:00:00Z",
	},
	{
		path: ".tekmemo/memories/2026-06-22.md",
		sha256: "c3d4e5f6a1b2...",
		size: 4096,
		updatedAt: "2026-06-22T14:30:00Z",
	},
	{
		path: ".tekmemo/memories/2026-06-21.md",
		sha256: "d4e5f6a1b2c3...",
		size: 3712,
		updatedAt: "2026-06-21T22:00:00Z",
	},
	{
		path: ".tekmemo/memories/2026-06-20.md",
		sha256: "e5f6a1b2c3d4...",
		size: 5120,
		updatedAt: "2026-06-20T20:00:00Z",
	},
];

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
	return `${(bytes / 1073741824).toFixed(2)} GB`;
}

export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function formatRelative(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}
