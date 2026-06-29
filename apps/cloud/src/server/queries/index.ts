/**
 * Dashboard query-layer barrel.
 *
 * Single import surface for dashboard loaders/actions:
 *   `import { listProjectsForAccount, createApiKey } from "~/server/queries";`
 *
 * Re-exports the pure `(db, …)` query + mutation functions and their read-model
 * types. Everything here is Hono/Worker-agnostic and unit-tested with the
 * in-memory `createTestDb()` harness.
 */

// Role enums are the SSOT for the plan/membership/invitation unions, declared on
// the schema tables. Re-exported here so dashboard routes import everything from
// one barrel (`~/server/queries`) rather than reaching into `~/db/schema`.
export type { InvitationRole } from "../../db/schema";
export type { AccountView } from "./account";
export {
	getAccountForUser,
	getAccountUsage,
} from "./account";
export type { CreatedApiKey } from "./api-keys";
export {
	createApiKey,
	generateRawKey,
	listApiKeysForAccount,
	revokeApiKey,
} from "./api-keys";
export {
	applyPlanToAccount,
	getAccountById,
	getAccountByPolarCustomerId,
	isPlanMetadataValue,
	PLAN_METADATA_VALUES,
	setPolarCustomerId,
} from "./billing";
export {
	deleteProject,
	getProjectForAccount,
	listProjectCursorHistory,
	listProjectFiles,
	listProjectsForAccount,
	recentSyncActivity,
} from "./projects";
export type {
	CreatedInvitation,
	PendingInvitationView,
	TeamMembership,
	TeamMemberView,
	TeamMutationErrorCode,
	TeamSummary,
} from "./teams";
export {
	acceptInvitation,
	accessibleTeamIds,
	assertCanAdmin,
	canWriteProject,
	createInvitation,
	getAccountIdByPolarCustomerId,
	getInvitationByToken,
	getMembership,
	getPersonalTeam,
	hashToken,
	isAcceptedMember,
	listPendingInvitations,
	listTeamMembers,
	listTeamsForAccount,
	removeTeamMember,
	resolveSeatsUsed,
	revokeInvitation,
	TeamMutationError,
	updateMemberRole,
} from "./teams";
export type {
	ApiKeyView,
	CursorHistoryView,
	ProjectFileView,
	ProjectSummary,
	SyncActivity,
} from "./types";
