import express from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../index';
import { validate, getParam } from '../utils/helpers';

const router = express.Router();

// GET /api/customers
router.get('/', async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
    res.json(customers);
  } catch (error) { next(error); }
});

// GET /api/customers/:id
router.get('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: getParam(req.params.id) } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) { next(error); }
});

// POST /api/customers
router.post('/',
  body('name').isString().isLength({ min: 1, max: 200 }),
  body('phone').optional().isString(),
  body('email').optional().isEmail(),
  body('address').optional().isString(),
  validate,
  async (req, res, next) => {
    try {
      const { name, phone, email, address } = req.body;
      const customer = await prisma.customer.create({ data: { name, phone, email, address } });
      res.status(201).json(customer);
    } catch (error) { next(error); }
  }
);

// PUT /api/customers/:id
router.put('/:id',
  param('id').isUUID(),
  body('name').optional().isString().isLength({ min: 1, max: 200 }),
  body('phone').optional().isString(),
  body('email').optional().isEmail(),
  body('address').optional().isString(),
  validate,
  async (req, res, next) => {
    try {
      const { name, phone, email, address } = req.body;
      const customer = await prisma.customer.update({
        where: { id: getParam(req.params.id) },
        data: {
          ...(name && { name }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(address !== undefined && { address })
        }
      });
      res.json(customer);
    } catch (error) { next(error); }
  }
);

// DELETE /api/customers/:id
router.delete('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const id = getParam(req.params.id);
    // Check if customer has sales or orders
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: { take: 1 },
        orders: { take: 1 },
        returns: { take: 1 }
      }
    });
    if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı' });

    if (customer.sales.length > 0 || customer.orders.length > 0 || customer.returns.length > 0) {
      return res.status(400).json({
        error: 'Bu müşteriye ait satış, sipariş veya iade kaydı bulunduğu için silinemez'
      });
    }

    await prisma.customer.delete({ where: { id } });
    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
