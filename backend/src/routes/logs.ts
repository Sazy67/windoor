import express from 'express';
import { getLogs } from '../lib/logger';

const router = express.Router();

const LOG_PASSWORD = process.env.LOG_PASSWORD || 'windoor-log-2024';

// POST /api/logs/auth — log şifresi ile token al
router.post('/auth', (req, res) => {
  const { password } = req.body;
  if (password !== LOG_PASSWORD) {
    return res.status(401).json({ error: 'Hatalı şifre' });
  }
  // Basit token: şifrenin base64'ü — sadece log sayfası için
  const token = Buffer.from(LOG_PASSWORD).toString('base64');
  res.json({ token });
});

// GET /api/logs — log token ile
router.get('/', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const validToken = Buffer.from(LOG_PASSWORD).toString('base64');

  if (!token || token !== validToken) {
    return res.status(401).json({ error: 'Yetkisiz erişim' });
  }

  res.json(getLogs());
});

export default router;
