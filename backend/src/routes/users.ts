import express from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../lib/prisma';
import { validate, getParam } from '../utils/helpers';

const router = express.Router();

const userSelect = {
  id: true, username: true, displayName: true, role: true, isActive: true, createdAt: true
};

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ select: userSelect, orderBy: { createdAt: 'desc' } });
    res.json(users);
  } catch (error) { next(error); }
});

// GET /api/users/:id
router.get('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: getParam(req.params.id) },
      select: userSelect
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) { next(error); }
});

// POST /api/users
router.post('/',
  body('username').isString().isLength({ min: 3, max: 50 }),
  body('displayName').isString().isLength({ min: 1, max: 100 }),
  body('role').optional().isString(),
  validate,
  async (req, res, next) => {
    try {
      const { username, displayName, role } = req.body;
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) return res.status(400).json({ error: 'Username already exists' });

      const user = await prisma.user.create({
        data: { username, displayName, role },
        select: userSelect
      });
      res.status(201).json(user);
    } catch (error) { next(error); }
  }
);

// PUT /api/users/:id
router.put('/:id',
  param('id').isUUID(),
  body('displayName').optional().isString().isLength({ min: 1, max: 100 }),
  body('role').optional().isString(),
  body('isActive').optional().isBoolean(),
  validate,
  async (req, res, next) => {
    try {
      const { displayName, role, isActive } = req.body;
      const user = await prisma.user.update({
        where: { id: getParam(req.params.id) },
        data: {
          ...(displayName && { displayName }),
          ...(role !== undefined && { role }),
          ...(isActive !== undefined && { isActive })
        },
        select: userSelect
      });
      res.json(user);
    } catch (error) { next(error); }
  }
);

// POST /api/users/login
router.post('/login',
  body('username').isString(),
  validate,
  async (req, res, next) => {
    try {
      const { username } = req.body;
      let user = await prisma.user.findUnique({ where: { username }, select: userSelect });

      if (!user) {
        user = await prisma.user.create({
          data: { username, displayName: username, isActive: true },
          select: userSelect
        });
      }

      if (!user.isActive) return res.status(403).json({ error: 'User is not active' });
      res.json(user);
    } catch (error) { next(error); }
  }
);

export default router;
