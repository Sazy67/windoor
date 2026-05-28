/**
 * Jest global setup - runs once before all test suites.
 * Creates the test SQLite database by running Prisma migrations.
 */
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.resolve(__dirname, '../../../prisma/test.db');
const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

export default async function globalSetup() {
  // Remove old test DB if it exists
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Run migrations against test DB
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../../..'),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });

  console.log('✅ Test database created at', TEST_DB_PATH);
}
