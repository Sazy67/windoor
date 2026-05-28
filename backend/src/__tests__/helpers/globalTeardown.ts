/**
 * Jest global teardown - runs once after all test suites.
 * Removes the test SQLite database.
 */
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.resolve(__dirname, '../../../prisma/test.db');

export default async function globalTeardown() {
  if (fs.existsSync(TEST_DB_PATH)) {
    try {
      fs.unlinkSync(TEST_DB_PATH);
      console.log('✅ Test database removed');
    } catch {
      // Ignore cleanup errors
    }
  }
}
