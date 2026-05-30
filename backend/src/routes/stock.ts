import express from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../lib/prisma';
import { validate, getParam } from '../utils/helpers';

const router = express.Router();

function getStockStatus(quantity: number, minimumLevel: number, isEndOfLife: boolean): string {
  if (isEndOfLife) return 'Discontinued';
  if (quantity === 0) return 'Out_Of_Stock';
  if (quantity <= minimumLevel) return 'Low';
  return 'Normal';
}

// GET /api/stock
router.get('/',
  query('category').optional().isString(),
  query('color').optional().isString(),
  query('dimension').optional().isString(),
  query('brand').optional().isString(),
  query('status').optional().isIn(['Normal', 'Low', 'Out_Of_Stock', 'Discontinued']),
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  validate,
  async (req, res, next) => {
    try {
      const { category, color, dimension, brand, status, search } = req.query;
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const where: any = {};
      if (color) where.color = color;
      if (dimension) where.dimension = { contains: dimension as string, mode: 'insensitive' };
      if (search) {
        where.OR = [
          { sku: { contains: search as string, mode: 'insensitive' } },
          { product: { name: { contains: search as string, mode: 'insensitive' } } },
        ];
      }

      const productWhere: any = {};
      if (category) productWhere.category = category;
      if (brand) productWhere.brand = brand;
      if (Object.keys(productWhere).length > 0) {
        where.product = { ...(where.product || {}), ...productWhere };
      }

      const variants = await prisma.productVariant.findMany({
        where,
        include: { stock: true, product: true },
        orderBy: { product: { name: 'asc' } }
      });

      const stockList = variants.map(variant => {
        const stockStatus = getStockStatus(
          variant.stock?.quantity || 0,
          variant.minimumStockLevel,
          variant.product.isEndOfLife
        );
        return {
          id: variant.id,
          sku: variant.sku,
          productName: variant.product.name,
          productCategory: variant.product.category,
          brand: variant.product.brand,
          color: variant.color,
          dimension: variant.dimension,
          type: variant.type,
          material: variant.material,
          quantity: variant.stock?.quantity || 0,
          secondQualityQty: variant.stock?.secondQualityQty || 0,
          minimumStockLevel: variant.minimumStockLevel,
          status: stockStatus,
          lastUpdated: variant.stock?.lastUpdated
        };
      });

      const filtered = status ? stockList.filter(item => item.status === status) : stockList;

      // If pagination params provided, return paginated response
      if (page !== undefined && limit !== undefined) {
        const total = filtered.length;
        const skip = (page - 1) * limit;
        const paginated = filtered.slice(skip, skip + limit);
        return res.json({
          data: paginated,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
      }

      res.json(filtered);
    } catch (error) { next(error); }
  }
);

// GET /api/stock/critical
router.get('/critical', async (req, res, next) => {
  try {
    const variants = await prisma.productVariant.findMany({
      include: { stock: true, product: true }
    });

    const criticalStock = variants
      .filter(v => {
        const qty = v.stock?.quantity || 0;
        return qty > 0 && qty <= v.minimumStockLevel && !v.product.isEndOfLife;
      })
      .map(v => ({
        id: v.id,
        sku: v.sku,
        productName: v.product.name,
        color: v.color,
        dimension: v.dimension,
        quantity: v.stock?.quantity || 0,
        minimumStockLevel: v.minimumStockLevel,
        status: 'Low'
      }));

    res.json(criticalStock);
  } catch (error) { next(error); }
});

// GET /api/stock/:variantId
router.get('/:variantId', param('variantId').isUUID(), validate, async (req, res, next) => {
  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: getParam(req.params.variantId) },
      include: { stock: true, product: true }
    });
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    const stockStatus = getStockStatus(
      variant.stock?.quantity || 0,
      variant.minimumStockLevel,
      variant.product.isEndOfLife
    );

    res.json({
      variantId: variant.id,
      sku: variant.sku,
      productName: variant.product.name,
      quantity: variant.stock?.quantity || 0,
      secondQualityQty: variant.stock?.secondQualityQty || 0,
      minimumStockLevel: variant.minimumStockLevel,
      status: stockStatus,
      lastUpdated: variant.stock?.lastUpdated
    });
  } catch (error) { next(error); }
});

// POST /api/stock/entry
router.post('/entry',
  body('variantId').isUUID(),
  body('quantity').isInt({ min: 1, max: 999999 }),
  body('isSecondQuality').optional().isBoolean(),
  body('notes').optional().isString().isLength({ max: 1000 }),
  body('createdById').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const { variantId, quantity, isSecondQuality, notes, createdById } = req.body;

      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { stock: true }
      });
      if (!variant) return res.status(404).json({ error: 'Variant not found' });

      const result = await prisma.$transaction(async (tx) => {
        const entry = await tx.stockEntry.create({
          data: { variantId, quantity, isSecondQuality: isSecondQuality || false, notes, createdById }
        });

        const updateData = isSecondQuality
          ? { secondQualityQty: { increment: quantity } }
          : { quantity: { increment: quantity } };

        await tx.stock.upsert({
          where: { variantId },
          update: updateData,
          create: {
            variantId,
            quantity: isSecondQuality ? 0 : quantity,
            secondQualityQty: isSecondQuality ? quantity : 0
          }
        });
        return entry;
      });

      res.status(201).json(result);
    } catch (error) { next(error); }
  }
);

// POST /api/stock/exit
router.post('/exit',
  body('variantId').isUUID(),
  body('quantity').isInt({ min: 1, max: 999999 }),
  body('reason').isIn(['Sale', 'Order_Fulfillment', 'Damage', 'Other']),
  body('referenceId').optional().isString(),
  body('notes').optional().isString().isLength({ max: 1000 }),
  body('createdById').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const { variantId, quantity, reason, referenceId, notes, createdById } = req.body;

      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { stock: true }
      });
      if (!variant) return res.status(404).json({ error: 'Variant not found' });

      const currentStock = variant.stock?.quantity || 0;
      if (currentStock < quantity) {
        return res.status(400).json({
          error: 'Insufficient stock',
          details: { requested: quantity, available: currentStock, variantId }
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const exit = await tx.stockExit.create({
          data: { variantId, quantity, reason, referenceId, notes, createdById }
        });
        await tx.stock.update({
          where: { variantId },
          data: { quantity: { decrement: quantity } }
        });
        return exit;
      });

      res.status(201).json(result);
    } catch (error) { next(error); }
  }
);

// DELETE /api/stock/entry/:id - Stok giriş kaydını sil
router.delete('/entry/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const id = getParam(req.params.id);
    const entry = await prisma.stockEntry.findUnique({ where: { id } });
    if (!entry) return res.status(404).json({ error: 'Stok giriş kaydı bulunamadı' });

    await prisma.$transaction(async (tx) => {
      await tx.stockEntry.delete({ where: { id } });
      const updateData = entry.isSecondQuality
        ? { secondQualityQty: { decrement: entry.quantity } }
        : { quantity: { decrement: entry.quantity } };
      await tx.stock.update({ where: { variantId: entry.variantId }, data: updateData });
    });

    res.status(204).send();
  } catch (error) { next(error); }
});

// DELETE /api/stock/exit/:id - Stok çıkış kaydını sil
router.delete('/exit/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const id = getParam(req.params.id);
    const exit = await prisma.stockExit.findUnique({ where: { id } });
    if (!exit) return res.status(404).json({ error: 'Stok çıkış kaydı bulunamadı' });

    // Sadece manuel çıkışlar silinebilir (Damage, Other)
    if (exit.reason === 'Sale' || exit.reason === 'Order_Fulfillment') {
      return res.status(400).json({ error: 'Satış veya sipariş kaynaklı çıkışlar silinemez' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockExit.delete({ where: { id } });
      await tx.stock.update({
        where: { variantId: exit.variantId },
        data: { quantity: { increment: exit.quantity } }
      });
    });

    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
