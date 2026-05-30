import 'dotenv/config';
import { execSync } from 'child_process';
import app from '../src/app';

// Run migrations on cold start in production
if (process.env.NODE_ENV === 'production') {
  try {
    execSync('npx prisma migrate deploy', {
      cwd: __dirname + '/..',
      stdio: 'inherit',
    });
  } catch (e) {
    console.error('Migration failed:', e);
  }
}

export default app;
