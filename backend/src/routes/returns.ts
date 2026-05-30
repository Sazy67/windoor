import express from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../lib/prisma';
import { validate, getParam } from '../utils/helpers';
import { addLog } from '../lib/logger';

const router = express.Router();

const returnInclude = {
  customer: true,
  items: { include: { variant: { include: { product: true } } } },
  createdBy: { select: { id: true, displayName: true } }
};

// GET /api/returns
router.get('/',
  query('customerId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validate,
  async (req, res, next) => {
    try {
      const { customerId, startDate, endDate } = req.query;
      const where: any = {};
      if (customerId) where.customerId = customerId;
      if (startDate || endDate) {
        where.returnDate = {};
        if (startDate) where.returnDate.gte = new Date(startDate as string);
        if (endDate) where.returnDate.lte = new Date(endDate as string);
      }

      const returns = await prisma.return.findMany({
        where,
        include: returnInclude,
        orderBy: { returnDate: 'desc' }
      });
      res.json(returns);
    } catch (error) { next(error); }
  }
);

// GET /api/returns/:id
router.get('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const returnRecord = await prisma.return.findUnique({
      where: { id: getParam(req.params.id) },
      include: returnInclude
    });
    if (!returnRecord) return res.status(404).json({ error: 'Return not found' });
    res.json(returnRecord);
  } catch (error) { next(error); }
});

// POST /api/returns
router.post('/',
  body('customerId').isUUID(),
  body('items').isArray({ min: 1, max: 100 }),
  body('items.*.variantId').isUUID(),
  body('items.*.quantity').isInt({ min: 1, max: 999 }),
  body('items.*.isSecondQuality').optional().isBoolean(),
  body('reason').isString().isLength({ min: 1, max: 500 }),
  body('createdById').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const { customerId, items, reason, createdById } = req.body;

      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(404).json({ error: 'Customer not found' });

      const variantIds = items.map((item: any) => item.variantId);
      const variants = await prisma.productVariant.findMany({ where: { id: { in: variantIds } } });
      if (variants.length !== variantIds.length) {
        return res.status(400).json({ error: 'One or more variants not found' });
      }

      const returnRecord = await prisma.$transaction(async (tx) => {
        const newReturn = await tx.return.create({
          data: {
            customerId, reason, createdById,
            items: {
              create: items.map((item: any) => ({
                variantId: item.variantId,
                quantity: item.quantity,
                isSecondQuality: item.isSecondQuality || false
              }))
            }
          },
          include: returnInclude
        });

        for (const item of items) {
          await tx.stockEntry.create({
            data: {
              variantId: item.variantId,
              quantity: item.quantity,
              isSecondQuality: item.isSecondQuality || false,
              notes: `İade: ${reason}`,
              createdById
            }
          });

          const updateData = item.isSecondQuality
            ? { secondQualityQty: { increment: item.quantity } }
            : { quantity: { increment: item.quantity } };

          await tx.stock.update({ where: { variantId: item.variantId }, data: updateData });
        }
        return newReturn;
      });

      addLog({
        timestamp: new Date().toISOString(),
        action: 'İade',
        user: req.user?.username || '-',
        detail: `${customer.name} · ${items.length} ürün · ${reason}`,
        status: 'ok',
      });
      res.status(201).json(returnRecord);
    } catch (error) { next(error); }
  }
);

export default router;
