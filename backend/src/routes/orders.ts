import express from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../lib/prisma';
import { validate, getParam } from '../utils/helpers';
import { addLog, getIP } from '../lib/logger';

const router = express.Router();

const orderInclude = {
  customer: true,
  customOrder: true,
  reservationOrder: {
    include: {
      items: { include: { variant: { include: { product: true } } } }
    }
  },
  createdBy: { select: { id: true, displayName: true } }
};

// GET /api/orders
router.get('/',
  query('orderType').optional().isIn(['Custom', 'Reservation']),
  query('status').optional().isString(),
  query('customerId').optional().isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const { orderType, status, customerId } = req.query;
      const where: any = {};
      if (orderType) where.orderType = orderType;
      if (status) where.status = status;
      if (customerId) where.customerId = customerId;

      const orders = await prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { orderDate: 'desc' }
      });
      res.json(orders);
    } catch (error) { next(error); }
  }
);

// GET /api/orders/:id
router.get('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: getParam(req.params.id) },
      include: orderInclude
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) { next(error); }
});

// POST /api/orders/custom
router.post('/custom',
  body('customerId').isUUID(),
  body('productType').isIn(['Gate', 'Window', 'Panel', 'Accessory', 'Consumable']),
  body('dimensions').isString().isLength({ min: 1, max: 100 }),
  body('specifications').optional().isString(),
  body('deliveryDeadline').isISO8601(),
  body('notes').optional().isString().isLength({ max: 2000 }),
  body('createdById').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const { customerId, productType, dimensions, specifications, deliveryDeadline, notes, createdById } = req.body;

      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(404).json({ error: 'Customer not found' });

      const deadline = new Date(deliveryDeadline);
      if (deadline <= new Date()) {
        return res.status(400).json({ error: 'Delivery deadline must be in the future' });
      }

      const order = await prisma.order.create({
        data: {
          orderType: 'Custom',
          customerId,
          status: 'Order_Received',
          notes,
          createdById,
          customOrder: {
            create: { productType, dimensions, specifications, deliveryDeadline: deadline, status: 'Order_Received' }
          }
        },
        include: orderInclude
      });
      addLog({
        timestamp: new Date().toISOString(),
        action: 'Özel Üretim Siparişi',
        user: req.user?.username || '-',
        detail: `${customer.name} · ${productType} · ${dimensions}`,
        ip: getIP(req),
        status: 'ok',
      });
      res.status(201).json(order);
    } catch (error) { next(error); }
  }
);

// POST /api/orders/reservation
router.post('/reservation',
  body('customerId').isUUID(),
  body('items').isArray({ min: 1, max: 100 }),
  body('items.*.variantId').isUUID(),
  body('items.*.quantity').isInt({ min: 1, max: 9999 }),
  body('notes').optional().isString().isLength({ max: 2000 }),
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

      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            orderType: 'Reservation',
            customerId,
            status: 'Reserved',
            notes,
            createdById,
            reservationOrder: {
              create: {
                status: 'Reserved',
                items: { create: items.map((item: any) => ({ variantId: item.variantId, quantity: item.quantity })) }
              }
            }
          },
          include: orderInclude
        });

        for (const item of items) {
          await tx.stockExit.create({
            data: { variantId: item.variantId, quantity: item.quantity, reason: 'Order_Fulfillment', referenceId: newOrder.id, createdById }
          });
          await tx.stock.update({
            where: { variantId: item.variantId },
            data: { quantity: { decrement: item.quantity } }
          });
        }
        return newOrder;
      });

      addLog({
        timestamp: new Date().toISOString(),
        action: 'Rezervasyon Siparişi',
        user: req.user?.username || '-',
        detail: `${customer.name} · ${items.length} ürün`,
        ip: getIP(req),
        status: 'ok',
      });
      res.status(201).json(order);
    } catch (error) { next(error); }
  }
);

// PUT /api/orders/:id/status
router.put('/:id/status',
  param('id').isUUID(),
  body('status').isString(),
  validate,
  async (req, res, next) => {
    try {
      const { status } = req.body;
      const orderId = getParam(req.params.id);

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customOrder: true, reservationOrder: true }
      });
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const updated = await prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({ where: { id: orderId }, data: { status } });
        if (order.customOrder) {
          await tx.customOrder.update({ where: { orderId }, data: { status } });
        }
        if (order.reservationOrder) {
          await tx.reservationOrder.update({ where: { orderId }, data: { status } });
        }
        return updatedOrder;
      });

      res.json(updated);
    } catch (error) { next(error); }
  }
);

// POST /api/orders/:id/deliver - Rezervasyonu teslim et ve satış kaydı oluştur
router.post('/:id/deliver',
  param('id').isUUID(),
  body('createdById').isUUID(),
  body('notes').optional().isString().isLength({ max: 1000 }),
  validate,
  async (req, res, next) => {
    try {
      const orderId = getParam(req.params.id);
      const { createdById, notes } = req.body;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          reservationOrder: {
            include: {
              items: { include: { variant: true } }
            }
          }
        }
      });

      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.orderType !== 'Reservation') {
        return res.status(400).json({ error: 'Only reservation orders can be delivered' });
      }
      if (!order.reservationOrder) {
        return res.status(400).json({ error: 'Reservation order not found' });
      }
      if (order.status === 'Delivered') {
        return res.status(400).json({ error: 'Order already delivered' });
      }

      const items = order.reservationOrder.items;

      // Satış tutarını hesapla
      let totalAmount = 0;
      const saleItems = items.map((item: any) => {
        const lineTotal = item.quantity * item.variant.salePrice;
        totalAmount += lineTotal;
        return {
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.variant.salePrice,
          lineTotal
        };
      });

      // Transaction: Satış oluştur + sipariş durumunu güncelle
      const result = await prisma.$transaction(async (tx) => {
        // Satış kaydı oluştur
        const sale = await tx.sale.create({
          data: {
            customerId: order.customerId,
            totalAmount,
            notes: notes || `Rezervasyon teslimi - Sipariş #${orderId.slice(0, 8)}`,
            createdById,
            items: { create: saleItems }
          },
          include: {
            customer: true,
            items: { include: { variant: { include: { product: true } } } }
          }
        });

        // Sipariş durumunu güncelle
        await tx.order.update({ where: { id: orderId }, data: { status: 'Delivered' } });
        await tx.reservationOrder.update({ where: { orderId }, data: { status: 'Delivered' } });

        return { sale, orderId };
      });

      addLog({
        timestamp: new Date().toISOString(),
        action: 'Rezervasyon Teslimi',
        user: req.user?.username || '-',
        detail: `${order.customer.name} · ${result.sale.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`,
        ip: getIP(req),
        status: 'ok',
      });
      res.status(201).json(result);
    } catch (error) { next(error); }
  }
);

export default router;
