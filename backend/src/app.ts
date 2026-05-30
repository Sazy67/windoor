import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import productRoutes from './routes/products';
import stockRoutes from './routes/stock';
import salesRoutes from './routes/sales';
import orderRoutes from './routes/orders';
import returnRoutes from './routes/returns';
import reportRoutes from './routes/reports';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';
import backupRoutes from './routes/backup';
import logsRoutes from './routes/logs';
import { authenticateToken, requireWriteAccess, requireAdmin } from './middleware/auth';

const app = express();

app.use(cors({
  origin: [
    'https://windoor-frontend.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public: sadece login
app.use('/api/users', userRoutes);

// Protected routes
app.use('/api/products',  authenticateToken, requireWriteAccess, productRoutes);
app.use('/api/stock',     authenticateToken, requireWriteAccess, stockRoutes);
app.use('/api/sales',     authenticateToken, requireWriteAccess, salesRoutes);
app.use('/api/orders',    authenticateToken, requireWriteAccess, orderRoutes);
app.use('/api/returns',   authenticateToken, requireWriteAccess, returnRoutes);
app.use('/api/reports',   authenticateToken, reportRoutes);
app.use('/api/customers', authenticateToken, requireWriteAccess, customerRoutes);
app.use('/api/backup',    authenticateToken, requireAdmin, backupRoutes);
app.use('/api/logs',      logsRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: { message: err.message || 'Internal Server Error' }
  });
});

export default app;
