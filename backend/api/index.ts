import 'dotenv/config';
import { execSync } from 'child_process';
import app from '../src/app';

// Run migrations on first deploy
let migrated = false;
if (!migrated) {
  try {
    execSync('npx prisma migrate deploy', {
      cwd: __dirname + '/..',
      stdio: 'pipe',
      env: { ...process.env }
    });
    migrated = true;
    console.log('✅ Migrations applied');
  } catch (e: any) {
    console.error('Migration error:', e.stderr?.toString() || e.message);
  }
}

export default app;
