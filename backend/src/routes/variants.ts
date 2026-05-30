import express from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../lib/prisma';
import { validate, getParam } from '../utils/helpers';

const router = express.Router();

// POST /api/products/:productId/variants
router.post('/:productId/variants',
  param('productId').isUUID(),
  body('color').optional().isString(),
  body('dimension').isString().isLength({ min: 1, max: 100 }),
  body('type').optional().isString(),
  body('material').optional().isString(),
  body('salePrice').isFloat({ min: 0.01 }),
  body('minimumStockLevel').optional().isInt({ min: 0, max: 999999 }),
  body('sku').isString(),
  validate,
  async (req, res, next) => {
    try {
      const productId = getParam(req.params.productId);
      const { color, dimension, type, material, salePrice, minimumStockLevel, sku } = req.body;

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const existing = await prisma.productVariant.findFirst({
        where: {
          productId,
          color: color || null,
          dimension,
          type: type || null,
          material: material || null
        }
      });
      if (existing) return res.status(400).json({ error: 'Variant with this combination already exists' });

      const variant = await prisma.productVariant.create({
        data: {
          productId,
          color,
          dimension,
          type,
          material,
          salePrice,
          minimumStockLevel: minimumStockLevel || 10,
          sku,
          stock: { create: { quantity: 0, secondQualityQty: 0 } }
        },
        include: { stock: true, product: true }
      });
      res.status(201).json(variant);
    } catch (error) { next(error); }
  }
);

// PUT /api/variants/:id
router.put('/variants/:id',
  param('id').isUUID(),
  body('color').optional().isString(),
  body('dimension').optional().isString().isLength({ min: 1, max: 100 }),
  body('type').optional().isString(),
  body('material').optional().isString(),
  body('salePrice').optional().isFloat({ min: 0.01 }),
  body('minimumStockLevel').optional().isInt({ min: 0, max: 999999 }),
  validate,
  async (req, res, next) => {
    try {
      const id = getParam(req.params.id);
      const { color, dimension, type, material, salePrice, minimumStockLevel } = req.body;
      const variant = await prisma.productVariant.update({
        where: { id },
        data: {
          ...(color !== undefined && { color }),
          ...(dimension && { dimension }),
          ...(type !== undefined && { type }),
          ...(material !== undefined && { material }),
          ...(salePrice && { salePrice }),
          ...(minimumStockLevel !== undefined && { minimumStockLevel })
        },
        include: { stock: true, product: true }
      });
      res.json(variant);
    } catch (error) { next(error); }
  }
);

// DELETE /api/variants/:id
router.delete('/variants/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const id = getParam(req.params.id);
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: { stock: true, saleItems: true }
    });
    if (!variant) return res.status(404).json({ error: 'Variant not found' });
    if (variant.stock && variant.stock.quantity > 0) {
      return res.status(400).json({ error: 'Cannot delete variant with existing stock' });
    }
    if (variant.saleItems.length > 0) {
      return res.status(400).json({ error: 'Cannot delete variant with sales records' });
    }
    await prisma.productVariant.delete({ where: { id } });
    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
