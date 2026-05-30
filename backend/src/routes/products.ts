import express from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../lib/prisma';
import variantRoutes from './variants';
import { validate, getParam } from '../utils/helpers';

const router = express.Router();

// Mount variant routes
router.use('/', variantRoutes);

// GET /api/products
router.get('/',
  query('search').optional().isString(),
  query('category').optional().isString(),
  query('brand').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  validate,
  async (req, res, next) => {
    try {
      const { search, category, brand } = req.query;
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const where: any = {};
      if (search) where.name = { contains: search as string };
      if (category) where.category = category;
      if (brand) where.brand = brand;

      // If pagination params provided, return paginated response
      if (page !== undefined && limit !== undefined) {
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
          prisma.product.findMany({
            where,
            include: {
              variants: { include: { stock: true } },
              createdBy: { select: { id: true, displayName: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          prisma.product.count({ where }),
        ]);
        return res.json({
          data: products,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          variants: { include: { stock: true } },
          createdBy: { select: { id: true, displayName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(products);
    } catch (error) { next(error); }
  }
);

// GET /api/products/:id
router.get('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: getParam(req.params.id) },
      include: {
        variants: { include: { stock: true } },
        createdBy: { select: { id: true, displayName: true } }
      }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) { next(error); }
});

// POST /api/products
router.post('/',
  body('name').isString().isLength({ min: 1, max: 200 }),
  body('category').isIn(['Gate', 'Window', 'Panel', 'Accessory', 'Consumable']),
  body('subcategory').optional().isString(),
  body('brand').isString().isLength({ min: 1, max: 100 }),
  body('createdById').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const { name, category, subcategory, brand, createdById } = req.body;
      const product = await prisma.product.create({
        data: { name, category, subcategory, brand, createdById },
        include: { variants: true }
      });
      res.status(201).json(product);
    } catch (error) { next(error); }
  }
);

// PUT /api/products/:id
router.put('/:id',
  param('id').isUUID(),
  body('name').optional().isString().isLength({ min: 1, max: 200 }),
  body('category').optional().isIn(['Gate', 'Window', 'Panel', 'Accessory', 'Consumable']),
  body('subcategory').optional().isString(),
  body('brand').optional().isString().isLength({ min: 1, max: 100 }),
  body('isEndOfLife').optional().isBoolean(),
  validate,
  async (req, res, next) => {
    try {
      const { name, category, subcategory, brand, isEndOfLife } = req.body;
      const product = await prisma.product.update({
        where: { id: getParam(req.params.id) },
        data: {
          ...(name && { name }),
          ...(category && { category }),
          ...(subcategory !== undefined && { subcategory }),
          ...(brand && { brand }),
          ...(isEndOfLife !== undefined && { isEndOfLife })
        },
        include: { variants: { include: { stock: true } } }
      });
      res.json(product);
    } catch (error) { next(error); }
  }
);

// DELETE /api/products/:id
router.delete('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: getParam(req.params.id) },
      include: {
        variants: { include: { stock: true, saleItems: true } }
      }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const hasStock = product.variants.some((v: any) => v.stock && v.stock.quantity > 0);
    const hasSales = product.variants.some((v: any) => v.saleItems.length > 0);

    if (hasStock || hasSales) {
      return res.status(400).json({ error: 'Cannot delete product with existing stock or sales records' });
    }

    await prisma.product.delete({ where: { id: getParam(req.params.id) } });
    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
