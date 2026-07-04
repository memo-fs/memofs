-- Seed script for local development database (Cloudflare D1)

-- 1. Create a test user
INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
VALUES ('user_1', 'Test User', 'test@tekbreed.com', 1, 1783171427200, 1783171427200);

-- 2. Create a billing account for this user
INSERT INTO "accounts" (id, user_id, polar_customer_id, plan, max_hosted_storage_bytes, max_connectors, created_at, updated_at)
VALUES ('account_1', 'user_1', 'polar_cust_1', 'pro', 10000000000, 10, '2026-07-04 12:00:00', '2026-07-04 12:00:00');

-- 3. Create a team owned by the billing account
INSERT INTO "teams" (id, name, owner_account_id, created_at, updated_at)
VALUES ('team_1', 'Test Workspace', 'account_1', '2026-07-04 12:00:00', '2026-07-04 12:00:00');

-- 4. Add the billing account as the owner of the team
INSERT INTO "team_members" (id, team_id, account_id, role, accepted_at, created_at, updated_at)
VALUES ('membership_1', 'team_1', 'account_1', 'owner', '2026-07-04 12:00:00', '2026-07-04 12:00:00', '2026-07-04 12:00:00');

-- 5. Create a default project
INSERT INTO "projects" (id, account_id, team_id, name, is_default, total_storage_bytes, created_at, updated_at)
VALUES ('project_1', 'account_1', 'team_1', 'default-project', 1, 0, '2026-07-04 12:00:00', '2026-07-04 12:00:00');

-- 6. Insert an API key for sync testing
-- Raw key: tm_test_key_123456
-- Hashed key: sha256("test-salt:tm_test_key_123456") = 68bb215570db2b3e839e235d97f511202e88a0e36c28f0de20ef77732a30ef1d
INSERT INTO "api_keys" (id, account_id, key_hash, label, last_four, created_at)
VALUES ('key_1', 'account_1', '68bb215570db2b3e839e235d97f511202e88a0e36c28f0de20ef77732a30ef1d', 'dev-key', '3456', '2026-07-04 12:00:00');
