-- Add password field to User (nullable for safe migration of existing records)
ALTER TABLE "User" ADD COLUMN "password" TEXT;

-- Set role default to 'user' and update existing null roles to 'admin' for existing users
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';
UPDATE "User" SET "role" = 'admin' WHERE "role" IS NULL;
ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL;
