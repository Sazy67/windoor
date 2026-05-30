import express from 'express';
import { getLogs } from '../lib/logger';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// GET /api/logs — sadece admin
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  res.json(getLogs());
});

export default router;
