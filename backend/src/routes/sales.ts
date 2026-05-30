import express from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../lib/prisma';
import { validate, getParam } from '../utils/helpers';
import { addLog } from '../lib/logger';

const router = express.Router();

// GET /api/sales
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
        where.saleDate = {};
        if (startDate) where.saleDate.gte = new Date(startDate as string);
        if (endDate) where.saleDate.lte = new Date(endDate as string);
      }

      const sales = await prisma.sale.findMany({
        where,
        include: {
          customer: true,
          items: { include: { variant: { include: { product: true } } } },
          createdBy: { select: { id: true, displayName: true } }
        },
        orderBy: { saleDate: 'desc' }
      });
      res.json(sales);
    } catch (error) { next(error); }
  }
);

// GET /api/sales/:id
router.get('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: getParam(req.params.id) },
      include: {
        customer: true,
        items: { include: { variant: { include: { product: true } } } },
        createdBy: { select: { id: true, displayName: true } }
      }
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (error) { next(error); }
});

// POST /api/sales
router.post('/',
  body('customerId').isUUID(),
  body('items').isArray({ min: 1, max: 100 }),
  body('items.*.variantId').isUUID(),
  body('items.*.quantity').isInt({ min: 1, max: 9999 }),
  body('notes').optional().isString().isLength({ max: 1000 }),
  body('createdById').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const { customerId, items, notes, createdById } = req.body;

      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(404).json({ error: 'Customer not found' });

      const variantIds = items.map((item: any) => item.variantId);
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { stock: true }
      });

      if (variants.length !== variantIds.length) {
        return res.status(400).json({ error: 'One or more variants not found' });
      }

      const insufficientStock = [];
      for (const item of items) {
        const variant = variants.find((v: any) => v.id === item.variantId);
        const available = variant?.stock?.quantity || 0;
        if (available < item.quantity) {
          insufficientStock.push({ variantId: item.variantId, sku: variant?.sku, requested: item.quantity, available });
        }
      }
      if (insufficientStock.length > 0) {
        return res.status(400).json({ error: 'Insufficient stock for one or more items', details: insufficientStock });
      }

      let totalAmount = 0;
      const saleItems = items.map((item: any) => {
        const variant = variants.find((v: any) => v.id === item.variantId)!;
        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : variant.salePrice;
        const lineTotal = item.quantity * unitPrice;
        totalAmount += lineTotal;
        return { variantId: item.variantId, quantity: item.quantity, unitPrice, lineTotal };
      });

      const sale = await prisma.$transaction(async (tx) => {
        const newSale = await tx.sale.create({
          data: {
            customerId, totalAmount, notes, createdById,
            items: { create: saleItems }
          },
          include: {
            items: { include: { variant: { include: { product: true } } } },
            customer: true
          }
        });

        for (const item of items) {
          await tx.stockExit.create({
            data: { variantId: item.variantId, quantity: item.quantity, reason: 'Sale', referenceId: newSale.id, createdById }
          });
          await tx.stock.update({
            where: { variantId: item.variantId },
            data: { quantity: { decrement: item.quantity } }
          });
        }
        return newSale;
      });

      addLog({
        timestamp: new Date().toISOString(),
        action: 'Satış',
        user: req.user?.username || '-',
        detail: `${customer.name} · ${sale.items.length} ürün · ${totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`,
        status: 'ok',
      });

      res.status(201).json(sale);
    } catch (error) { next(error); }
  }
);

export default router;
