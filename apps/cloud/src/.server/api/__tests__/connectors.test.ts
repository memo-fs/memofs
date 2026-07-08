import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "../../../../tests/utils/db";
import type { Database } from "../../db";
import { accounts, apiKeys, connectors, projects } from "../../db/schema";
import { encryptToken, hashApiKey } from "../../utils";
import { createApi } from "..";

const SALT = "test-salt";
const ENCRYPTION_KEY = "test-encryption-key-must-be-long-enough-32-bytes";
const RAW_KEY = "tm_connector_test_key_123456";

let db: Database;

beforeEach(async () => {
	db = await createTestDb();
	vi.mock("../../db", () => ({
		getDB: () => db,
	}));
});

afterEach(async () => {
	vi.restoreAllMocks();
	// biome-ignore lint/suspicious/noExplicitAny: drizzle client is untyped
	await (db as any).$client.close?.();
});

function testApp() {
	return createApi();
}

describe("Connectors API - Secret Resolution", () => {
	it("resolves and decrypts the connector secret for authorized project owner", async () => {
		// 1. Seed database
		await db.insert(accounts).values({
			id: "acc_1",
			plan: "free",
			maxConnectors: 5,
			maxHostedStorageBytes: 10000,
		});

		const keyHash = await hashApiKey(RAW_KEY, SALT);
		await db.insert(apiKeys).values({
			id: "key_1",
			accountId: "acc_1",
			keyHash,
			label: "Test API Key",
		});

		await db.insert(projects).values({
			id: "proj_1",
			accountId: "acc_1",
			name: "Test Project",
		});

		const secretRef = "tmc_ref_abc123";
		const encryptedSecret = await encryptToken(
			"notion-secret-token",
			ENCRYPTION_KEY,
		);

		await db.insert(connectors).values({
			id: "conn_1",
			projectId: "proj_1",
			type: "notion",
			name: "My Notion",
			secretRef,
			encryptedSecret,
		});

		// 2. Make request using testApp()
		const res = await testApp().request(
			"/v1/projects/proj_1/connectors/secret?ref=tmc_ref_abc123",
			{
				headers: {
					Authorization: `Bearer ${RAW_KEY}`,
				},
			},
			{
				API_KEY_SALT: SALT,
				ENCRYPTION_KEY,
			} as unknown as Env,
		);

		// 3. Assertions
		expect(res.status).toBe(200);
		const body = (await res.json()) as { data: { secret: string } };
		expect(body.data.secret).toBe("notion-secret-token");
	});

	it("returns 401 unauthorized if Bearer token is missing or invalid", async () => {
		const res = await testApp().request(
			"/v1/projects/proj_1/connectors/secret?ref=tmc_ref_abc123",
			{},
			{
				API_KEY_SALT: SALT,
				ENCRYPTION_KEY,
			} as unknown as Env,
		);
		expect(res.status).toBe(401);
	});

	it("returns 404 if project is missing or owned by another account", async () => {
		// Seed database with account and project owned by another account
		await db.insert(accounts).values({
			id: "acc_owner",
			plan: "free",
			maxConnectors: 5,
			maxHostedStorageBytes: 10000,
		});
		await db.insert(accounts).values({
			id: "acc_other",
			plan: "free",
			maxConnectors: 5,
			maxHostedStorageBytes: 10000,
		});

		const keyHash = await hashApiKey(RAW_KEY, SALT);
		await db.insert(apiKeys).values({
			id: "key_other",
			accountId: "acc_other",
			keyHash,
			label: "Other API Key",
		});

		await db.insert(projects).values({
			id: "proj_owner",
			accountId: "acc_owner",
			name: "Owner Project",
		});

		const res = await testApp().request(
			"/v1/projects/proj_owner/connectors/secret?ref=tmc_ref_abc123",
			{
				headers: {
					Authorization: `Bearer ${RAW_KEY}`,
				},
			},
			{
				API_KEY_SALT: SALT,
				ENCRYPTION_KEY,
			} as unknown as Env,
		);
		expect(res.status).toBe(403); // PermissionError surfaces as 403
	});

	it("returns 404 if secret ref is missing/incorrect", async () => {
		await db.insert(accounts).values({
			id: "acc_1",
			plan: "free",
			maxConnectors: 5,
			maxHostedStorageBytes: 10000,
		});

		const keyHash = await hashApiKey(RAW_KEY, SALT);
		await db.insert(apiKeys).values({
			id: "key_1",
			accountId: "acc_1",
			keyHash,
			label: "Test API Key",
		});

		await db.insert(projects).values({
			id: "proj_1",
			accountId: "acc_1",
			name: "Test Project",
		});

		const res = await testApp().request(
			"/v1/projects/proj_1/connectors/secret?ref=wrong_ref",
			{
				headers: {
					Authorization: `Bearer ${RAW_KEY}`,
				},
			},
			{
				API_KEY_SALT: SALT,
				ENCRYPTION_KEY,
			} as unknown as Env,
		);
		expect(res.status).toBe(404);
	});
});
