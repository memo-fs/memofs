import { parseWithZod } from "@conform-to/zod/v4";
import { eq } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";
import { Plug } from "lucide-react";
import { useState } from "react";
import { useOutletContext } from "react-router";
import { env } from "cloudflare:workers";
import { encryptToken } from "~/.server/utils";
import type { Database } from "~/.server/db";
import { getDB } from "~/.server/db";
import { connectors as connectorsTable } from "~/.server/db/schema";
import {
	type ConnectorView,
	countConnectorsForProject,
	createConnector,
	deleteConnector,
	listConnectorsForProject,
	updateConnector,
	verifyProjectOwnership,
} from "~/.server/queries/connectors";
import { requireUserWithAccount } from "~/.server/session";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import type { DashboardOutletContext } from "./_layout";
import { AddConnectorDialog } from "./+components/add-connector-dialog";
import { ConnectorCard } from "./+components/connector-card";
import { ConnectorCatalog } from "./+components/connector-catalog";
import { PageHeader } from "./+components/page-header";
import type { Route } from "./+types/connectors";
import { ConnectorActionSchema } from "./+utils/connectors";

export function meta() {
	return [{ title: "Connectors — Memo FS Cloud" }];
}

export async function loader({
	request,
}: Route.LoaderArgs): Promise<{ connectors: ConnectorView[] } | Response> {
	const { account } = await requireUserWithAccount(request);
	if (!account) return { connectors: [] };

	const url = new URL(request.url);
	const projectId = url.searchParams.get("projectId");
	if (!projectId) return { connectors: [] };

	const db = getDB();
	if (!(await verifyProjectOwnership(db, projectId, account.id))) {
		return { connectors: [] };
	}
	return { connectors: await listConnectorsForProject(db, projectId) };
}

export async function action({
	request,
}: Route.ActionArgs): Promise<{ ok: boolean; error?: string } | Response> {
	const { account } = await requireUserWithAccount(request);
	if (!account) {
		return Response.json(
			{ ok: false, error: "No account found." },
			{ status: StatusCodes.NOT_FOUND },
		);
	}

	const form = await request.formData();
	const submission = parseWithZod(form, { schema: ConnectorActionSchema });
	if (submission.status !== "success") {
		return Response.json(
			{ ok: false, error: "Invalid submission." },
			{ status: StatusCodes.BAD_REQUEST },
		);
	}
	const data = submission.value;

	const db = getDB();
	if (data.intent === "create") {
		return handleCreate(db, account.id, account.maxConnectors, data);
	}
	if (data.intent === "update") {
		return handleUpdate(db, account.id, data);
	}
	if (data.intent === "delete") {
		return handleDelete(db, account.id, data);
	}
	return Response.json(
		{ ok: false, error: "Unknown intent." },
		{ status: StatusCodes.BAD_REQUEST },
	);
}

async function handleCreate(
	db: Database,
	accountId: string,
	maxConnectors: number,
	data: {
		projectId: string;
		type: "github" | "notion";
		name: string;
		schedule: string;
		sourceMapping: string;
		token: string;
	},
) {
	if (!(await verifyProjectOwnership(db, data.projectId, accountId))) {
		return Response.json(
			{ ok: false, error: "Project not found." },
			{ status: StatusCodes.NOT_FOUND },
		);
	}
	const count = await countConnectorsForProject(db, data.projectId);
	if (count >= maxConnectors) {
		return Response.json(
			{ ok: false, error: "Connector cap reached. Upgrade your plan." },
			{ status: StatusCodes.FORBIDDEN },
		);
	}
	const encrypted = await encryptToken(data.token, env.ENCRYPTION_KEY);
	await createConnector(db, {
		projectId: data.projectId,
		type: data.type,
		name: data.name,
		schedule: data.schedule,
		sourceMapping: data.sourceMapping,
		secretRef: `tmc_ref_${crypto.randomUUID()}`,
		encryptedSecret: encrypted,
	});
	return { ok: true };
}

async function handleUpdate(
	db: Database,
	accountId: string,
	data: {
		id: string;
		name?: string;
		enabled?: "true" | "false";
		schedule?: string;
		sourceMapping?: string;
	},
) {
	const rows = await db
		.select()
		.from(connectorsTable)
		.where(eq(connectorsTable.id, data.id))
		.limit(1);
	if (!rows[0]) {
		return Response.json(
			{ ok: false, error: "Connector not found." },
			{ status: StatusCodes.NOT_FOUND },
		);
	}
	if (!(await verifyProjectOwnership(db, rows[0].projectId, accountId))) {
		return Response.json(
			{ ok: false, error: "Not authorized." },
			{ status: StatusCodes.FORBIDDEN },
		);
	}
	await updateConnector(db, data.id, {
		name: data.name,
		enabled: data.enabled === "true",
		schedule: data.schedule,
		sourceMapping: data.sourceMapping,
	});
	return { ok: true };
}

async function handleDelete(
	db: Database,
	accountId: string,
	data: { id: string },
) {
	const rows = await db
		.select()
		.from(connectorsTable)
		.where(eq(connectorsTable.id, data.id))
		.limit(1);
	if (!rows[0]) {
		return Response.json(
			{ ok: false, error: "Connector not found." },
			{ status: StatusCodes.NOT_FOUND },
		);
	}
	if (!(await verifyProjectOwnership(db, rows[0].projectId, accountId))) {
		return Response.json(
			{ ok: false, error: "Not authorized." },
			{ status: StatusCodes.FORBIDDEN },
		);
	}
	await deleteConnector(db, data.id);
	return { ok: true };
}

export default function ConnectorsPage({ loaderData }: Route.ComponentProps) {
	const { selectedProject, account } =
		useOutletContext<DashboardOutletContext>();
	const projectId = selectedProject?.id ?? null;
	const projectName = selectedProject?.name ?? "—";
	const maxConnectors = account?.maxConnectors ?? 0;
	const activeCount = loaderData?.connectors.length ?? 0;
	const atCap = activeCount >= maxConnectors;

	const [showAdd, setShowAdd] = useState(false);
	const [connectors, setConnectors] = useState(loaderData?.connectors ?? []);

	return (
		<div className="p-6">
			<PageHeader
				title="Connectors"
				subtitle={
					<>
						Project{" "}
						<span className="font-mono font-semibold text-foreground">
							{projectName}
						</span>{" "}
						· {activeCount} / {maxConnectors} active
					</>
				}
				action={
					<Button
						size="sm"
						className="h-9 text-xs"
						disabled={atCap || !projectId}
						onClick={() => setShowAdd(true)}
					>
						Add connector
					</Button>
				}
			/>

			<ConnectorCatalog />

			{connectors.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
						<Plug className="h-8 w-8 text-muted-foreground/40" />
						<div>
							<p className="text-sm font-medium text-foreground">
								No connectors configured
							</p>
							<p className="mx-auto mt-1 max-w-md text-xs leading-normal text-muted-foreground">
								Connectors run locally on the Memo FS runtime. Tokens are
								encrypted server-side and never synced to your files.
							</p>
						</div>
					</CardContent>
				</Card>
			) : (
				<section className="space-y-3">
					{connectors.map((c) => (
						<ConnectorCard
							key={c.id}
							connector={c}
							onRemove={(id) =>
								setConnectors((prev) => prev.filter((c) => c.id !== id))
							}
						/>
					))}
				</section>
			)}

			<AddConnectorDialog
				open={showAdd}
				onOpenChange={setShowAdd}
				projectId={projectId}
			/>
		</div>
	);
}
