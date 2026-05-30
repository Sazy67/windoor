import express from 'express';
import { prisma } from '../lib/prisma';

const router = express.Router();

// GET /api/backup — tüm veritabanını JSON olarak indir
router.get('/', async (req, res, next) => {
  try {
    const [
      users,
      customers,
      products,
      variants,
      stock,
      stockEntries,
      stockExits,
      sales,
      saleItems,
      orders,
      customOrders,
      reservationOrders,
      reservationOrderItems,
      returns,
      returnItems,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.customer.findMany(),
      prisma.product.findMany(),
      prisma.productVariant.findMany(),
      prisma.stock.findMany(),
      prisma.stockEntry.findMany(),
      prisma.stockExit.findMany(),
      prisma.sale.findMany(),
      prisma.saleItem.findMany(),
      prisma.order.findMany(),
      prisma.customOrder.findMany(),
      prisma.reservationOrder.findMany(),
      prisma.reservationOrderItem.findMany(),
      prisma.return.findMany(),
      prisma.returnItem.findMany(),
    ]);

    const backup = {
      meta: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        tables: {
          users: users.length,
          customers: customers.length,
          products: products.length,
          variants: variants.length,
          stock: stock.length,
          stockEntries: stockEntries.length,
          stockExits: stockExits.length,
          sales: sales.length,
          saleItems: saleItems.length,
          orders: orders.length,
          customOrders: customOrders.length,
          reservationOrders: reservationOrders.length,
          reservationOrderItems: reservationOrderItems.length,
          returns: returns.length,
          returnItems: returnItems.length,
        },
      },
      data: {
        users,
        customers,
        products,
        variants,
        stock,
        stockEntries,
        stockExits,
        sales,
        saleItems,
        orders,
        customOrders,
        reservationOrders,
        reservationOrderItems,
        returns,
        returnItems,
      },
    };

    const filename = `windoor-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (error) {
    next(error);
  }
});

export default router;
