declare const process: { env?: Record<string, string | undefined> } | undefined;

import { TekMemoCloudTransport } from "./transport";
import type {
	AgentSessionEvent,
	AgentSessionExtraction,
	AgentSessionListResult,
	AgentSessionRecord,
	ApproveAgentSessionMemoryInput,
	CandidateActionResult,
	CandidateListResult,
	CompleteAgentSessionInput,
	ConflictListResult,
	ConflictResolveResult,
	CoreMemoryDocument,
	CreateAgentSessionEventInput,
	CreateAgentSessionInput,
	CreateCandidateInput,
	CreateNoteInput,
	DeleteProviderInput,
	DismissCandidateInput,
	ExtractAgentSessionMemoryInput,
	GetAgentSessionInput,
	ListAgentSessionsInput,
	ListCandidatesInput,
	ListConflictsInput,
	ListNotesInput,
	MemoryCandidate,
	MemoryNote,
	Page,
	ProjectScopedInput,
	PromoteCandidateInput,
	ReadCoreMemoryInput,
	RecallIndexInput,
	RecallIndexResult,
	RecallQueryInput,
	RecallQueryResult,
	ResolveConflictInput,
	SyncPullInput,
	SyncPullResult,
	SyncPushInput,
	SyncPushResult,

	SyncStatusInput,
	SyncStatusResult,
	TekMemoCloudBenchmarkRunInput,
	TekMemoCloudBenchmarkRunResult,
	TekMemoCloudClient,
	TekMemoCloudClientOptions,
	TekMemoCloudContextComposeInput,
	TekMemoCloudContextComposeResult,
	TekMemoCloudEvalRunInput,
	TekMemoCloudEvalRunResult,
	TekMemoCloudExportInput,
	TekMemoCloudExportResult,
	TekMemoCloudExtractionJobsInput,
	TekMemoCloudExtractionRunInput,
	TekMemoCloudExtractionRunResult,
	TekMemoCloudGraphEdge,
	TekMemoCloudGraphListInput,
	TekMemoCloudGraphNeighborsInput,
	TekMemoCloudGraphNode,
	TekMemoCloudGraphPathInput,
	TekMemoCloudHealthResult,
	TekMemoCloudProviderCredential,
	TekMemoCloudProviderInput,
	TekMemoCloudSnapshotInput,
	TekMemoCloudSnapshotResult,
	UpdateCoreMemoryInput,
	UpdateProviderInput,
} from "./types";
import {
	assertProjectId,
	compactQuery,
	validateApproveAgentSessionMemoryInput,
	validateCompleteAgentSessionInput,
	validateContextComposeInput,
	validateCreateAgentSessionEventInput,
	validateCreateAgentSessionInput,
	validateCreateCandidateInput,
	validateCreateNoteInput,
	validateDeleteProviderInput,
	validateDismissCandidateInput,
	validateExtractAgentSessionMemoryInput,
	validateExtractionRunInput,
	validateGetAgentSessionInput,
	validateGraphEdge,
	validateGraphListInput,
	validateGraphNode,
	validateListAgentSessionsInput,
	validateListCandidatesInput,
	validateListConflictsInput,
	validateListNotesInput,
	validatePromoteCandidateInput,
	validateProviderInput,
	validateRecallIndexInput,
	validateRecallQueryInput,
	validateResolveConflictInput,
	validateSyncPullInput,
	validateSyncPushInput,

	validateSyncStatusInput,
	validateUpdateCoreInput,
	validateUpdateProviderInput,
} from "./validation";

export function createTekMemoCloudClient(
	options: TekMemoCloudClientOptions,
): TekMemoCloudClient {
	const transport = new TekMemoCloudTransport(options);
	const defaultProjectId = options.defaultProjectId;

	const projectPath = (
		projectIdInput: string | undefined,
		suffix: string,
	): string => {
		const projectId = encodeURIComponent(
			assertProjectId(projectIdInput, defaultProjectId),
		);
		return `/projects/${projectId}${suffix}`;
	};

	return {
		health(signal) {
			return transport.request<TekMemoCloudHealthResult>({
				method: "GET",
				path: "/health",
				signal,
				requireApiKey: false,
			});
		},
		readiness(signal) {
			return transport.request<TekMemoCloudHealthResult>({
				method: "GET",
				path: "/readiness",
				signal,
				requireApiKey: false,
			});
		},
		memory: {
			readCore(input: ReadCoreMemoryInput = {}, signal?: AbortSignal) {
				return transport.request<CoreMemoryDocument>({
					method: "GET",
					path: projectPath(input.projectId, "/memory/core"),
					signal,
				});
			},
			updateCore(input: UpdateCoreMemoryInput, signal?: AbortSignal) {
				const normalized = validateUpdateCoreInput(input);
				return transport.request<CoreMemoryDocument>({
					method: "PUT",
					path: projectPath(normalized.projectId, "/memory/core"),
					body: { content: normalized.content },
					signal,
				});
			},
			listNotes(input: ListNotesInput = {}, signal?: AbortSignal) {
				const normalized = validateListNotesInput(input);
				return transport.request<Page<MemoryNote>>({
					method: "GET",
					path: projectPath(normalized.projectId, "/memory/notes"),
					query: compactQuery({
						limit: normalized.limit,
						cursor: normalized.cursor,
						kind: normalized.kind,
						tag: normalized.tag,
					}),
					signal,
				});
			},
			createNote(input: CreateNoteInput, signal?: AbortSignal) {
				const normalized = validateCreateNoteInput(input);
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<MemoryNote>({
					method: "POST",
					path: projectPath(normalized.projectId, "/memory/notes"),
					body,
					signal,
				});
			},
		},
		recall: {
			query(input: RecallQueryInput, signal?: AbortSignal) {
				const normalized = validateRecallQueryInput(input);
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<RecallQueryResult>({
					method: "POST",
					path: projectPath(normalized.projectId, "/recall/query"),
					body,
					signal,
				});
			},
			index(input: RecallIndexInput = {}, signal?: AbortSignal) {
				const normalized = validateRecallIndexInput(input);
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<RecallIndexResult>({
					method: "POST",
					path: projectPath(normalized.projectId, "/recall/index"),
					body,
					signal,
				});
			},
		},
		context: {
			compose(input: TekMemoCloudContextComposeInput, signal?: AbortSignal) {
				const normalized = validateContextComposeInput(input);
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<TekMemoCloudContextComposeResult>({
					method: "POST",
					path: projectPath(normalized.projectId, "/context/compose"),
					body,
					signal,
				});
			},
		},
		graph: {
			listNodes(input: TekMemoCloudGraphListInput = {}, signal?: AbortSignal) {
				const normalized = validateListNotesInput(input as ListNotesInput);
				return transport.request<Page<TekMemoCloudGraphNode>>({
					method: "GET",
					path: projectPath(normalized.projectId ?? "", "/graph/nodes"),
					query: compactQuery({
						limit: normalized.limit,
						cursor: normalized.cursor,
						status: (input as TekMemoCloudGraphListInput).status,
					}),
					signal,
				});
			},
			createNode(input: TekMemoCloudGraphNode, signal?: AbortSignal) {
				const normalized = validateGraphNode(input);
				const { projectId, ...body } = normalized as unknown as {
					projectId?: string;
					[key: string]: unknown;
				};
				return transport.request<TekMemoCloudGraphNode>({
					method: "POST",
					path: projectPath(projectId ?? "", "/graph/nodes"),
					body,
					signal,
				});
			},
			listEdges(input: TekMemoCloudGraphListInput = {}, signal?: AbortSignal) {
				const normalized = validateGraphListInput(input);
				return transport.request<Page<TekMemoCloudGraphEdge>>({
					method: "GET",
					path: projectPath(normalized.projectId ?? "", "/graph/edges"),
					query: compactQuery({
						limit: normalized.limit,
						cursor: normalized.cursor,
						status: input.status,
					}),
					signal,
				});
			},
			createEdge(input: TekMemoCloudGraphEdge, signal?: AbortSignal) {
				const normalized = validateGraphEdge(input);
				const { projectId, ...body } = normalized as unknown as {
					projectId?: string;
					[key: string]: unknown;
				};
				return transport.request<TekMemoCloudGraphEdge>({
					method: "POST",
					path: projectPath(projectId ?? "", "/graph/edges"),
					body,
					signal,
				});
			},
			neighbors(input: TekMemoCloudGraphNeighborsInput, signal?: AbortSignal) {
				const normalized = input;
				return transport.request<{
					nodes: TekMemoCloudGraphNode[];
					edges: TekMemoCloudGraphEdge[];
				}>({
					method: "POST",
					path: projectPath(normalized.projectId ?? "", "/graph/neighbors"),
					body: normalized,
					signal,
				});
			},
			path(input: TekMemoCloudGraphPathInput, signal?: AbortSignal) {
				const normalized = input;
				return transport.request<{
					nodes: TekMemoCloudGraphNode[];
					edges: TekMemoCloudGraphEdge[];
				}>({
					method: "POST",
					path: projectPath(normalized.projectId ?? "", "/graph/path"),
					body: normalized,
					signal,
				});
			},
		},
		extraction: {
			run(input: TekMemoCloudExtractionRunInput = {}, signal?: AbortSignal) {
				const normalized = validateExtractionRunInput(input);
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<TekMemoCloudExtractionRunResult>({
					method: "POST",
					path: projectPath(normalized.projectId ?? "", "/extraction/run"),
					body,
					signal,
				});
			},
			jobs(input: TekMemoCloudExtractionJobsInput = {}, signal?: AbortSignal) {
				const normalized = input;
				return transport.request<
					Page<{ jobId: string; status: string; createdAt?: string }>
				>({
					method: "GET",
					path: projectPath(normalized.projectId ?? "", "/extraction/jobs"),
					query: compactQuery({ limit: normalized.limit }),
					signal,
				});
			},
		},
		evals: {
			run(input: TekMemoCloudEvalRunInput = {}, signal?: AbortSignal) {
				const normalized = input;
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<TekMemoCloudEvalRunResult>({
					method: "POST",
					path: projectPath(normalized.projectId ?? "", "/evals/run"),
					body,
					signal,
				});
			},
		},
		benchmarks: {
			run(input: TekMemoCloudBenchmarkRunInput = {}, signal?: AbortSignal) {
				const normalized = input;
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<TekMemoCloudBenchmarkRunResult>({
					method: "POST",
					path: projectPath(normalized.projectId ?? "", "/benchmarks/run"),
					body,
					signal,
				});
			},
		},
		sync: {
			push(input: SyncPushInput, signal?: AbortSignal) {
				const normalized = validateSyncPushInput(input);
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<SyncPushResult>({
					method: "POST",
					path: projectPath(normalized.projectId, "/sync/push"),
					body,
					signal,
				});
			},
			pull(input: SyncPullInput, signal?: AbortSignal) {
				const normalized = validateSyncPullInput(input);
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<SyncPullResult>({
					method: "POST",
					path: projectPath(normalized.projectId, "/sync/pull"),
					body,
					signal,
				});
			},
			status(input: SyncStatusInput = {}, signal?: AbortSignal) {
				const normalized = validateSyncStatusInput(input);
				return transport.request<SyncStatusResult>({
					method: "GET",
					path: projectPath(normalized.projectId, "/sync/status"),
					query: compactQuery({ clientId: normalized.clientId }),
					signal,
				});
			},
		},
		exports: {
			create(input: TekMemoCloudExportInput = {}, signal?: AbortSignal) {
				const normalized = input;
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<TekMemoCloudExportResult>({
					method: "POST",
					path: projectPath(normalized.projectId ?? "", "/exports"),
					body,
					signal,
				});
			},
			downloadUrl(
				input: { exportId: string } & ProjectScopedInput,
				signal?: AbortSignal,
			) {
				const { exportId, projectId } = input;
				return transport.request<{ downloadUrl: string }>({
					method: "GET",
					path: projectPath(
						projectId ?? "",
						`/exports/${encodeURIComponent(exportId)}/download`,
					),
					signal,
				});
			},
		},
		snapshots: {
			create(input: TekMemoCloudSnapshotInput = {}, signal?: AbortSignal) {
				const normalized = input;
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<TekMemoCloudSnapshotResult>({
					method: "POST",
					path: projectPath(normalized.projectId ?? "", "/snapshots"),
					body,
					signal,
				});
			},
			downloadUrl(
				input: { snapshotId: string } & ProjectScopedInput,
				signal?: AbortSignal,
			) {
				const { snapshotId, projectId } = input;
				return transport.request<{ downloadUrl: string }>({
					method: "GET",
					path: projectPath(
						projectId ?? "",
						`/snapshots/${encodeURIComponent(snapshotId)}/download`,
					),
					signal,
				});
			},
		},
		providers: {
			list(input: ProjectScopedInput = {}, signal?: AbortSignal) {
				const normalized = input;
				return transport.request<TekMemoCloudProviderCredential[]>({
					method: "GET",
					path: projectPath(normalized.projectId ?? "", "/providers"),
					signal,
				});
			},
			create(input: TekMemoCloudProviderInput, signal?: AbortSignal) {
				const normalized = validateProviderInput(input);
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<TekMemoCloudProviderCredential>({
					method: "POST",
					path: projectPath(normalized.projectId ?? "", "/providers"),
					body,
					signal,
				});
			},
			update(input: UpdateProviderInput, signal?: AbortSignal) {
				const normalized = validateUpdateProviderInput(input);
				const { projectId: _projectId, credentialId, ...body } = normalized;
				return transport.request<TekMemoCloudProviderCredential>({
					method: "PATCH",
					path: projectPath(
						normalized.projectId ?? "",
						`/providers/${encodeURIComponent(credentialId)}`,
					),
					body,
					signal,
				});
			},
			delete(input: DeleteProviderInput, signal?: AbortSignal) {
				const normalized = validateDeleteProviderInput(input);
				const { projectId, credentialId } = normalized;
				return transport.request<{ ok: boolean }>({
					method: "DELETE",
					path: projectPath(
						projectId ?? "",
						`/providers/${encodeURIComponent(credentialId)}`,
					),
					signal,
				});
			},
			test(
				input: { credentialId: string } & ProjectScopedInput,
				signal?: AbortSignal,
			) {
				const { credentialId, projectId } = input;
				return transport.request<{ ok: boolean; message?: string }>({
					method: "POST",
					path: projectPath(
						projectId ?? "",
						`/providers/${encodeURIComponent(credentialId)}/test`,
					),
					signal,
				});
			},
		},
		candidates: {
			list(input: ListCandidatesInput = {}, signal?: AbortSignal) {
				const normalized = validateListCandidatesInput(input);
				return transport.request<CandidateListResult>({
					method: "GET",
					path: projectPath(normalized.projectId ?? "", "/candidates"),
					query: compactQuery({
						limit: normalized.limit,
						cursor: normalized.cursor,
						status: normalized.status,
						kind: normalized.kind,
					}),
					signal,
				});
			},
			create(input: CreateCandidateInput, signal?: AbortSignal) {
				const normalized = validateCreateCandidateInput(input);
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<MemoryCandidate>({
					method: "POST",
					path: projectPath(normalized.projectId, "/candidates"),
					body,
					signal,
				});
			},
			promote(input: PromoteCandidateInput, signal?: AbortSignal) {
				const normalized = validatePromoteCandidateInput(input);
				const { projectId: _projectId, candidateId, ...body } = normalized;
				return transport.request<CandidateActionResult>({
					method: "POST",
					path: projectPath(
						normalized.projectId,
						`/candidates/${encodeURIComponent(candidateId)}/promote`,
					),
					body,
					signal,
				});
			},
			dismiss(input: DismissCandidateInput, signal?: AbortSignal) {
				const normalized = validateDismissCandidateInput(input);
				const { projectId: _projectId, candidateId, ...body } = normalized;
				return transport.request<CandidateActionResult>({
					method: "POST",
					path: projectPath(
						normalized.projectId,
						`/candidates/${encodeURIComponent(candidateId)}/dismiss`,
					),
					body,
					signal,
				});
			},
		},
		conflicts: {
			list(input: ListConflictsInput = {}, signal?: AbortSignal) {
				const normalized = validateListConflictsInput(input);
				return transport.request<ConflictListResult>({
					method: "GET",
					path: projectPath(normalized.projectId ?? "", "/conflicts"),
					query: compactQuery({
						limit: normalized.limit,
						cursor: normalized.cursor,
						status: normalized.status,
						severity: normalized.severity,
					}),
					signal,
				});
			},
			resolve(input: ResolveConflictInput, signal?: AbortSignal) {
				const normalized = validateResolveConflictInput(input);
				const { projectId: _projectId, conflictId, ...body } = normalized;
				return transport.request<ConflictResolveResult>({
					method: "POST",
					path: projectPath(
						normalized.projectId,
						`/conflicts/${encodeURIComponent(conflictId)}/resolve`,
					),
					body,
					signal,
				});
			},
		},
		agentSessions: {
			create(input: CreateAgentSessionInput, signal?: AbortSignal) {
				const normalized = validateCreateAgentSessionInput(input);
				const { projectId: _projectId, ...body } = normalized;
				return transport.request<AgentSessionRecord>({
					method: "POST",
					path: projectPath(normalized.projectId, "/agent-sessions"),
					body,
					signal,
				});
			},
			list(input: ListAgentSessionsInput = {}, signal?: AbortSignal) {
				const normalized = validateListAgentSessionsInput(input);
				return transport.request<AgentSessionListResult>({
					method: "GET",
					path: projectPath(normalized.projectId ?? "", "/agent-sessions"),
					query: compactQuery({
						limit: normalized.limit,
						cursor: normalized.cursor,
						status: normalized.status,
						actorId: normalized.actorId,
					}),
					signal,
				});
			},
			get(input: GetAgentSessionInput, signal?: AbortSignal) {
				const normalized = validateGetAgentSessionInput(input);
				const { projectId, sessionId } = normalized;
				return transport.request<AgentSessionRecord>({
					method: "GET",
					path: projectPath(
						projectId ?? "",
						`/agent-sessions/${encodeURIComponent(sessionId)}`,
					),
					signal,
				});
			},
			addEvent(input: CreateAgentSessionEventInput, signal?: AbortSignal) {
				const normalized = validateCreateAgentSessionEventInput(input);
				const { projectId: _projectId, sessionId, ...body } = normalized;
				return transport.request<AgentSessionEvent>({
					method: "POST",
					path: projectPath(
						normalized.projectId,
						`/agent-sessions/${encodeURIComponent(sessionId)}/events`,
					),
					body,
					signal,
				});
			},
			extract(input: ExtractAgentSessionMemoryInput, signal?: AbortSignal) {
				const normalized = validateExtractAgentSessionMemoryInput(input);
				const { projectId: _projectId, sessionId, ...body } = normalized;
				return transport.request<AgentSessionExtraction>({
					method: "POST",
					path: projectPath(
						normalized.projectId,
						`/agent-sessions/${encodeURIComponent(sessionId)}/extract`,
					),
					body,
					signal,
				});
			},
			approveMemory(
				input: ApproveAgentSessionMemoryInput,
				signal?: AbortSignal,
			) {
				const normalized = validateApproveAgentSessionMemoryInput(input);
				const { projectId: _projectId, sessionId, ...body } = normalized;
				return transport.request<AgentSessionExtraction>({
					method: "POST",
					path: projectPath(
						normalized.projectId,
						`/agent-sessions/${encodeURIComponent(sessionId)}/approve-memory`,
					),
					body,
					signal,
				});
			},
			complete(input: CompleteAgentSessionInput, signal?: AbortSignal) {
				const normalized = validateCompleteAgentSessionInput(input);
				const { projectId: _projectId, sessionId, ...body } = normalized;
				return transport.request<AgentSessionRecord>({
					method: "POST",
					path: projectPath(
						normalized.projectId,
						`/agent-sessions/${encodeURIComponent(sessionId)}/complete`,
					),
					body,
					signal,
				});
			},
		},
	};
}

export function createTekMemoCloudClientFromEnv(
	env: Record<string, string | undefined> = defaultEnv(),
	options: Partial<Omit<TekMemoCloudClientOptions, "baseUrl" | "apiKey">> = {},
): TekMemoCloudClient {
	const baseUrl = env.TEKMEMO_CLOUD_URL ?? env.TEKMEMO_API_URL;
	if (!baseUrl) {
		throw new Error("TEKMEMO_CLOUD_URL or TEKMEMO_API_URL is required.");
	}
	return createTekMemoCloudClient({
		...options,
		baseUrl,
		apiKey: env.TEKMEMO_API_KEY,
		defaultProjectId: options.defaultProjectId ?? env.TEKMEMO_PROJECT_ID,
		defaultWorkspaceId: options.defaultWorkspaceId ?? env.TEKMEMO_WORKSPACE_ID,
	});
}

function defaultEnv(): Record<string, string | undefined> {
	if (process?.env) return process.env;
	return {};
}

export function createProjectScopedClient(
	client: TekMemoCloudClient,
	projectId: string,
): TekMemoCloudClient {
	assertProjectId(projectId);
	const withProject = <T extends ProjectScopedInput>(
		input?: T,
	): T & { projectId: string } => ({
		...(input ?? ({} as T)),
		projectId,
	});

	return {
		health: client.health.bind(client),
		readiness: client.readiness.bind(client),
		memory: {
			readCore(input, signal) {
				return client.memory.readCore(withProject(input), signal);
			},
			updateCore(input, signal) {
				return client.memory.updateCore(withProject(input), signal);
			},
			listNotes(input, signal) {
				return client.memory.listNotes(withProject(input), signal);
			},
			createNote(input, signal) {
				return client.memory.createNote(withProject(input), signal);
			},
		},
		recall: {
			query(input, signal) {
				return client.recall.query(withProject(input), signal);
			},
			index(input, signal) {
				return client.recall.index(withProject(input), signal);
			},
		},
		context: {
			compose(input, signal) {
				return client.context.compose(withProject(input), signal);
			},
		},
		graph: {
			listNodes(input, signal) {
				return client.graph.listNodes(withProject(input), signal);
			},
			createNode(input, signal) {
				return client.graph.createNode(input as TekMemoCloudGraphNode, signal);
			},
			listEdges(input, signal) {
				return client.graph.listEdges(withProject(input), signal);
			},
			createEdge(input, signal) {
				return client.graph.createEdge(input as TekMemoCloudGraphEdge, signal);
			},
			neighbors(input, signal) {
				return client.graph.neighbors(
					withProject(input) as TekMemoCloudGraphNeighborsInput,
					signal,
				);
			},
			path(input, signal) {
				return client.graph.path(
					withProject(input) as TekMemoCloudGraphPathInput,
					signal,
				);
			},
		},
		extraction: {
			run(input, signal) {
				return client.extraction.run(withProject(input), signal);
			},
			jobs(input, signal) {
				return client.extraction.jobs(withProject(input), signal);
			},
		},
		evals: {
			run(input, signal) {
				return client.evals.run(withProject(input), signal);
			},
		},
		benchmarks: {
			run(input, signal) {
				return client.benchmarks.run(withProject(input), signal);
			},
		},
		sync: {
			push(input, signal) {
				return client.sync.push(withProject(input), signal);
			},
			pull(input, signal) {
				return client.sync.pull(withProject(input), signal);
			},
			status(input, signal) {
				return client.sync.status(withProject(input), signal);
			},
		},
		exports: {
			create(input, signal) {
				return client.exports.create(withProject(input), signal);
			},
			downloadUrl(input, signal) {
				return client.exports.downloadUrl(
					input as { exportId: string } & ProjectScopedInput,
					signal,
				);
			},
		},
		snapshots: {
			create(input, signal) {
				return client.snapshots.create(withProject(input), signal);
			},
			downloadUrl(input, signal) {
				return client.snapshots.downloadUrl(
					input as { snapshotId: string } & ProjectScopedInput,
					signal,
				);
			},
		},
		providers: {
			list(input, signal) {
				return client.providers.list(withProject(input), signal);
			},
			create(input, signal) {
				return client.providers.create(
					input as TekMemoCloudProviderInput,
					signal,
				);
			},
			update(input, signal) {
				return client.providers.update(input as UpdateProviderInput, signal);
			},
			delete(input, signal) {
				return client.providers.delete(input as DeleteProviderInput, signal);
			},
			test(input, signal) {
				return client.providers.test(
					input as { credentialId: string } & ProjectScopedInput,
					signal,
				);
			},
		},
		candidates: {
			list(input, signal) {
				return client.candidates.list(withProject(input), signal);
			},
			create(input, signal) {
				return client.candidates.create(input as CreateCandidateInput, signal);
			},
			promote(input, signal) {
				return client.candidates.promote(
					input as PromoteCandidateInput,
					signal,
				);
			},
			dismiss(input, signal) {
				return client.candidates.dismiss(
					input as DismissCandidateInput,
					signal,
				);
			},
		},
		conflicts: {
			list(input, signal) {
				return client.conflicts.list(withProject(input), signal);
			},
			resolve(input, signal) {
				return client.conflicts.resolve(input as ResolveConflictInput, signal);
			},
		},
		agentSessions: {
			create(input, signal) {
				return client.agentSessions.create(withProject(input), signal);
			},
			list(input, signal) {
				return client.agentSessions.list(withProject(input), signal);
			},
			get(input, signal) {
				return client.agentSessions.get(input as GetAgentSessionInput, signal);
			},
			addEvent(input, signal) {
				return client.agentSessions.addEvent(withProject(input), signal);
			},
			extract(input, signal) {
				return client.agentSessions.extract(withProject(input), signal);
			},
			approveMemory(input, signal) {
				return client.agentSessions.approveMemory(withProject(input), signal);
			},
			complete(input, signal) {
				return client.agentSessions.complete(withProject(input), signal);
			},
		},
	};
}
