import express from 'express';
import { body, param } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { validate, getParam } from '../utils/helpers';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'windoor-dev-secret';

const userSelect = {
  id: true, username: true, displayName: true,
  role: true, isActive: true, createdAt: true,
};

// POST /api/users/login — public
router.post('/login',
  body('username').isString().isLength({ min: 1 }),
  body('password').isString().isLength({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const user = await prisma.user.findUnique({ where: { username } });

      if (!user) return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
      if (!user.isActive) return res.status(403).json({ error: 'Hesap devre dışı' });

      if (!user.password) {
        // İlk giriş: şifreyi set et
        const hashed = await bcrypt.hash(password, 10);
        await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
      } else {
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id, username: user.username,
          displayName: user.displayName, role: user.role, isActive: user.isActive,
        },
      });
    } catch (error) { next(error); }
  }
);

// GET /api/users — admin only
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ select: userSelect, orderBy: { createdAt: 'asc' } });
    res.json(users);
  } catch (error) { next(error); }
});

// POST /api/users — admin only
router.post('/',
  authenticateToken, requireAdmin,
  body('username').isString().isLength({ min: 2, max: 50 }),
  body('displayName').isString().isLength({ min: 1, max: 100 }),
  body('password').isString().isLength({ min: 6 }),
  body('role').isIn(['admin', 'user']),
  validate,
  async (req, res, next) => {
    try {
      const { username, displayName, password, role } = req.body;
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) return res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış' });
      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { username, displayName, password: hashed, role },
        select: userSelect,
      });
      res.status(201).json(user);
    } catch (error) { next(error); }
  }
);

// PUT /api/users/:id — admin only
router.put('/:id',
  authenticateToken, requireAdmin,
  param('id').isUUID(),
  body('displayName').optional().isString().isLength({ min: 1, max: 100 }),
  body('password').optional().isString().isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'user']),
  body('isActive').optional().isBoolean(),
  validate,
  async (req, res, next) => {
    try {
      const { displayName, password, role, isActive } = req.body;
      const data: any = {};
      if (displayName !== undefined) data.displayName = displayName;
      if (role !== undefined) data.role = role;
      if (isActive !== undefined) data.isActive = isActive;
      if (password) data.password = await bcrypt.hash(password, 10);
      const user = await prisma.user.update({
        where: { id: getParam(req.params.id) },
        data,
        select: userSelect,
      });
      res.json(user);
    } catch (error) { next(error); }
  }
);

// DELETE /api/users/:id — admin only
router.delete('/:id',
  authenticateToken, requireAdmin,
  param('id').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const id = getParam(req.params.id);
      if (id === req.user!.id) return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
      await prisma.user.delete({ where: { id } });
      res.status(204).send();
    } catch (error) { next(error); }
  }
);

export default router;
