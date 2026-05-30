import dotenv from 'dotenv';
import { prisma } from './lib/prisma';
import app from './app';

dotenv.config();

const port = process.env.PORT || 3000;

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
