-- Create organization groups table
CREATE TABLE IF NOT EXISTS "organization_groups" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add optional groupId to organizations
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "groupId" TEXT;

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "organization_groups"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Create user_organizations table
CREATE TABLE IF NOT EXISTS "user_organizations" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "user_organizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_organizations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_organizations_userId_orgId_key" ON "user_organizations" ("userId", "orgId");
CREATE INDEX IF NOT EXISTS "user_organizations_userId_idx" ON "user_organizations" ("userId");
CREATE INDEX IF NOT EXISTS "user_organizations_orgId_idx" ON "user_organizations" ("orgId");

-- Backfill existing assignments
INSERT INTO "user_organizations" ("id", "userId", "orgId", "role", "isDefault", "isActive")
SELECT
  md5(random()::text || clock_timestamp()::text),
  "id" AS "userId",
  "orgId",
  "role",
  TRUE AS "isDefault",
  TRUE AS "isActive"
FROM "users"
WHERE "orgId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "user_organizations" uo
    WHERE uo."userId" = "users"."id"
      AND uo."orgId" = "users"."orgId"
  );
