import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Routes
import productRoutes from './routes/products';
import stockRoutes from './routes/stock';
import salesRoutes from './routes/sales';
import orderRoutes from './routes/orders';
import returnRoutes from './routes/returns';
import reportRoutes from './routes/reports';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ngrok browser warning bypass
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);

// Serve frontend static files if built
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).json({ error: 'Not found' });
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

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
