import express from 'express';
import { query, param } from 'express-validator';
import { prisma } from '../lib/prisma';
import { validate, getParam } from '../utils/helpers';

const router = express.Router();

// GET /api/reports/best-selling
router.get('/best-selling',
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  async (req, res, next) => {
    try {
      const { startDate, endDate, limit } = req.query;
      const topN = limit ? parseInt(limit as string) : 20;

      const saleWhere: any = {};
      if (startDate || endDate) {
        saleWhere.saleDate = {};
        if (startDate) saleWhere.saleDate.gte = new Date(startDate as string);
        if (endDate) saleWhere.saleDate.lte = new Date(endDate as string);
      }

      // Use groupBy to aggregate at the database level — avoids loading all rows into memory
      const grouped = await prisma.saleItem.groupBy({
        by: ['variantId'],
        where: Object.keys(saleWhere).length > 0 ? { sale: saleWhere } : undefined,
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: topN,
      });

      if (grouped.length === 0) return res.json([]);

      // Fetch variant details for the top N variants in a single query
      const variantIds = grouped.map(g => g.variantId);
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: {
          id: true, sku: true, color: true, dimension: true, type: true,
          product: { select: { name: true } }
        },
      });

      const variantMap = new Map(variants.map(v => [v.id, v]));

      const result = grouped.map(g => {
        const v = variantMap.get(g.variantId);
        return {
          variantId: g.variantId,
          sku: v?.sku ?? '',
          productName: v?.product.name ?? '',
          color: v?.color ?? null,
          dimension: v?.dimension ?? '',
          type: v?.type ?? null,
          totalQuantity: g._sum.quantity ?? 0,
          totalRevenue: g._sum.lineTotal ?? 0,
        };
      });

      res.json(result);
    } catch (error) { next(error); }
  }
);

// GET /api/reports/slow-moving
router.get('/slow-moving',
  query('category').optional().isString(),
  query('minDays').optional().isInt({ min: 0 }),
  validate,
  async (req, res, next) => {
    try {
      const { category, minDays } = req.query;

      const where: any = {};
      if (category) where.product = { category };

      const variants = await prisma.productVariant.findMany({
        where,
        include: {
          stock: true,
          product: true,
          stockEntries: { orderBy: { entryDate: 'desc' }, take: 1 }
        }
      });

      const slowMoving = variants
        .filter(v => v.stock && v.stock.quantity > 0)
        .map(v => {
          const lastEntry = v.stockEntries[0];
          const daysInStock = lastEntry
            ? Math.floor((Date.now() - lastEntry.entryDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          return {
            variantId: v.id,
            sku: v.sku,
            productName: v.product.name,
            category: v.product.category,
            color: v.color,
            dimension: v.dimension,
            quantity: v.stock!.quantity,
            daysInStock,
            lastEntryDate: lastEntry?.entryDate
          };
        })
        .filter(item => !minDays || item.daysInStock >= parseInt(minDays as string))
        .sort((a, b) => b.daysInStock - a.daysInStock);

      res.json(slowMoving);
    } catch (error) { next(error); }
  }
);

// GET /api/reports/monthly-sales
router.get('/monthly-sales',
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validate,
  async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      const where: any = {};
      if (startDate || endDate) {
        where.saleDate = {};
        if (startDate) where.saleDate.gte = new Date(startDate as string);
        if (endDate) where.saleDate.lte = new Date(endDate as string);
      }

      // Fetch sales with aggregated item quantities — avoids loading full item details
      const sales = await prisma.sale.findMany({
        where,
        select: {
          saleDate: true,
          totalAmount: true,
          _count: { select: { items: true } },
          items: { select: { quantity: true } },
        },
        orderBy: { saleDate: 'asc' }
      });

      const monthlyData = new Map<string, { month: string; transactionCount: number; totalQuantity: number; totalRevenue: number }>();
      for (const sale of sales) {
        const month = sale.saleDate.toISOString().substring(0, 7);
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { month, transactionCount: 0, totalQuantity: 0, totalRevenue: 0 });
        }
        const data = monthlyData.get(month)!;
        data.transactionCount += 1;
        data.totalRevenue += sale.totalAmount;
        data.totalQuantity += sale.items.reduce((sum, item) => sum + item.quantity, 0);
      }

      res.json(Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month)));
    } catch (error) { next(error); }
  }
);

// GET /api/reports/stock-value
router.get('/stock-value', async (req, res, next) => {
  try {
    const variants = await prisma.productVariant.findMany({
      include: { stock: true, product: true }
    });

    let totalValue = 0;
    let totalItems = 0;
    const byCategory = new Map();

    for (const variant of variants) {
      if (!variant.stock) continue;
      const value = variant.stock.quantity * variant.salePrice;
      totalValue += value;
      totalItems += variant.stock.quantity;

      const category = variant.product.category;
      if (!byCategory.has(category)) {
        byCategory.set(category, { category, totalQuantity: 0, totalValue: 0 });
      }
      const catData = byCategory.get(category);
      catData.totalQuantity += variant.stock.quantity;
      catData.totalValue += value;
    }

    res.json({ totalValue, totalItems, byCategory: Array.from(byCategory.values()) });
  } catch (error) { next(error); }
});

// GET /api/reports/recent-sales - Son satışlar (dashboard için)
router.get('/recent-sales',
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validate,
  async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const sales = await prisma.sale.findMany({
        take: limit,
        orderBy: { saleDate: 'desc' },
        include: {
          customer: true,
          items: {
            include: {
              variant: { include: { product: true } }
            }
          },
          createdBy: { select: { displayName: true } }
        }
      });

      res.json(sales);
    } catch (error) { next(error); }
  }
);

// GET /api/reports/dashboard-summary - Dashboard özet
router.get('/dashboard-summary', async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalSalesMonth,
      totalSalesToday,
      totalSalesWeek,
      activeOrders,
      customOrdersPending,
      reservationsPending,
      stockValue,
      allVariantsWithStock,
      outOfStockCount,
      totalCustomers,
      topSelling
    ] = await Promise.all([
      // Bu ay satış
      prisma.sale.aggregate({
        where: { saleDate: { gte: startOfMonth } },
        _sum: { totalAmount: true },
        _count: true
      }),
      // Bugün satış
      prisma.sale.aggregate({
        where: { saleDate: { gte: startOfToday } },
        _sum: { totalAmount: true },
        _count: true
      }),
      // Bu hafta satış
      prisma.sale.aggregate({
        where: { saleDate: { gte: startOfWeek } },
        _sum: { totalAmount: true },
        _count: true
      }),
      // Aktif siparişler (toplam)
      prisma.order.count({
        where: { status: { in: ['Order_Received', 'In_Production', 'Reserved'] } }
      }),
      // Özel üretim bekleyen
      prisma.customOrder.count({
        where: { status: { in: ['Order_Received', 'In_Production'] } }
      }),
      // Rezervasyon bekleyen
      prisma.reservationOrder.count({
        where: { status: 'Reserved' }
      }),
      // Stok toplam adet
      prisma.stock.aggregate({ _sum: { quantity: true } }),
      // Tüm varyantlar (kritik stok + stok değeri hesabı için — tek sorgu)
      prisma.productVariant.findMany({
        where: { product: { isEndOfLife: false } },
        select: {
          id: true,
          color: true,
          dimension: true,
          salePrice: true,
          minimumStockLevel: true,
          stock: { select: { quantity: true } },
          product: { select: { name: true, isEndOfLife: true } }
        },
        orderBy: { minimumStockLevel: 'desc' }
      }),
      // Stok yok
      prisma.stock.count({ where: { quantity: 0 } }),
      // Toplam müşteri
      prisma.customer.count(),
      // En çok satan (bu ay) — only select needed fields
      prisma.saleItem.findMany({
        where: { sale: { saleDate: { gte: startOfMonth } } },
        select: {
          variantId: true,
          quantity: true,
          lineTotal: true,
          variant: {
            select: {
              color: true,
              dimension: true,
              product: { select: { name: true } }
            }
          }
        }
      })
    ]);

    // Kritik stok hesapla + stok değeri — tek döngü
    let totalStockValue = 0;
    const criticalVariants: Array<{ id: string; productName: string; color: string | null; dimension: string; quantity: number; minimumStockLevel: number }> = [];
    let criticalCount = 0;

    for (const v of allVariantsWithStock) {
      const qty = v.stock?.quantity || 0;
      totalStockValue += qty * v.salePrice;
      if (qty > 0 && qty <= v.minimumStockLevel) {
        criticalCount++;
        if (criticalVariants.length < 5) {
          criticalVariants.push({
            id: v.id,
            productName: v.product.name,
            color: v.color,
            dimension: v.dimension,
            quantity: qty,
            minimumStockLevel: v.minimumStockLevel
          });
        }
      }
    }

    // En çok satan bu ay
    const topMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const item of topSelling) {
      const key = item.variantId;
      if (!topMap.has(key)) {
        topMap.set(key, {
          name: `${item.variant.product.name}${item.variant.color ? ' · ' + item.variant.color : ''} · ${item.variant.dimension}`,
          qty: 0,
          revenue: 0
        });
      }
      const d = topMap.get(key)!;
      d.qty += item.quantity;
      d.revenue += item.lineTotal;
    }
    const topProducts = Array.from(topMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    res.json({
      salesThisMonth: { total: totalSalesMonth._sum.totalAmount || 0, count: totalSalesMonth._count },
      salesToday: { total: totalSalesToday._sum.totalAmount || 0, count: totalSalesToday._count },
      salesThisWeek: { total: totalSalesWeek._sum.totalAmount || 0, count: totalSalesWeek._count },
      activeOrders,
      customOrdersPending,
      reservationsPending,
      totalStockItems: stockValue._sum.quantity || 0,
      totalStockValue,
      criticalStockCount: criticalCount,
      outOfStockCount,
      totalCustomers,
      criticalStockList: criticalVariants,
      topProductsThisMonth: topProducts
    });
  } catch (error) { next(error); }
});

// GET /api/reports/variant-movements/:variantId - Stok hareketleri
router.get('/variant-movements/:variantId',
  param('variantId').isUUID(),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  validate,
  async (req, res, next) => {
    try {
      const variantId = getParam(req.params.variantId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const [variant, entries, exits] = await Promise.all([
        prisma.productVariant.findUnique({
          where: { id: variantId },
          include: { stock: true, product: true }
        }),
        prisma.stockEntry.findMany({
          where: { variantId },
          include: {
            createdBy: { select: { displayName: true } },
            // ReturnItem üzerinden iade kaydına ve müşteriye ulaş
            variant: {
              select: {
                returnItems: {
                  select: {
                    return: { select: { customer: { select: { name: true } }, id: true } }
                  }
                }
              }
            }
          },
          orderBy: { entryDate: 'desc' },
          take: limit
        }),
        prisma.stockExit.findMany({
          where: { variantId },
          include: { createdBy: { select: { displayName: true } } },
          orderBy: { exitDate: 'desc' },
          take: limit
        })
      ]);

      if (!variant) return res.status(404).json({ error: 'Variant not found' });

      // Çıkışlardaki referenceId'leri topla — Sale ve Order ID'leri
      const saleIds = exits.filter(e => e.reason === 'Sale' && e.referenceId).map(e => e.referenceId!);
      const orderIds = exits.filter(e => e.reason === 'Order_Fulfillment' && e.referenceId).map(e => e.referenceId!);

      // Sale ve Order kayıtlarını müşteri adıyla birlikte tek sorguda çek
      const [sales, orders] = await Promise.all([
        saleIds.length > 0
          ? prisma.sale.findMany({
              where: { id: { in: saleIds } },
              select: { id: true, customer: { select: { name: true } } }
            })
          : Promise.resolve([]),
        orderIds.length > 0
          ? prisma.order.findMany({
              where: { id: { in: orderIds } },
              select: { id: true, customer: { select: { name: true } } }
            })
          : Promise.resolve([]),
      ]);

      const saleMap = new Map(sales.map(s => [s.id, s.customer.name]));
      const orderMap = new Map(orders.map(o => [o.id, o.customer.name]));

      // Giriş kayıtları için iade müşteri eşlemesi
      // StockEntry'nin hangi Return'e ait olduğunu bulmak için
      // Return → ReturnItem → variantId + returnDate yaklaşımı yerine
      // doğrudan Return tablosunu entry tarihleriyle eşleştiriyoruz
      const entryIds = entries.map(e => e.id);
      // ReturnItem'lar üzerinden bu varyanta ait iadeleri çek
      const returnItems = await prisma.returnItem.findMany({
        where: { variantId },
        include: {
          return: { select: { id: true, customer: { select: { name: true } }, returnDate: true } }
        }
      });
      // returnDate → customerName eşlemesi (aynı tarihte birden fazla iade olabilir, ilkini al)
      const returnDateMap = new Map<string, string>();
      for (const ri of returnItems) {
        const key = ri.return.returnDate.toISOString();
        if (!returnDateMap.has(key)) {
          returnDateMap.set(key, ri.return.customer.name);
        }
      }

      // Merge and sort movements
      const movements = [
        ...entries.map(e => {
          // İade girişleri için müşteri adını bul (tarih eşleşmesiyle)
          const customerName = returnDateMap.get(e.entryDate.toISOString()) || null;
          return {
            id: e.id,
            date: e.entryDate,
            type: 'entry' as const,
            quantity: e.quantity,
            isSecondQuality: e.isSecondQuality,
            operation: e.isSecondQuality ? 'İkinci Kalite Giriş' : (customerName ? 'İade' : 'Stok Girişi'),
            customerName,
            notes: e.notes,
            user: e.createdBy.displayName
          };
        }),
        ...exits.map(e => {
          const OPERATION_LABELS: Record<string, string> = {
            Sale: 'Satış',
            Order_Fulfillment: 'Sipariş Rezervasyonu',
            Damage: 'Hasar',
            Other: 'Diğer',
          };
          let customerName: string | null = null;
          if (e.reason === 'Sale' && e.referenceId) {
            customerName = saleMap.get(e.referenceId) || null;
          } else if (e.reason === 'Order_Fulfillment' && e.referenceId) {
            customerName = orderMap.get(e.referenceId) || null;
          }
          return {
            id: e.id,
            date: e.exitDate,
            type: 'exit' as const,
            quantity: e.quantity,
            isSecondQuality: false,
            operation: OPERATION_LABELS[e.reason] || e.reason,
            referenceId: e.referenceId,
            customerName,
            notes: e.notes,
            user: e.createdBy.displayName
          };
        })
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
       .slice(0, limit);

      res.json({
        variant: {
          id: variant.id,
          sku: variant.sku,
          productName: variant.product.name,
          color: variant.color,
          dimension: variant.dimension,
          currentStock: variant.stock?.quantity || 0,
          secondQualityStock: variant.stock?.secondQualityQty || 0
        },
        movements
      });
    } catch (error) { next(error); }
  }
);

// GET /api/reports/customer-history/:customerId - Müşteri satış geçmişi
router.get('/customer-history/:customerId',
  param('customerId').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const customerId = getParam(req.params.customerId);

      const [customer, sales, orders] = await Promise.all([
        prisma.customer.findUnique({ where: { id: customerId } }),
        prisma.sale.findMany({
          where: { customerId },
          include: {
            items: { include: { variant: { include: { product: true } } } }
          },
          orderBy: { saleDate: 'desc' }
        }),
        prisma.order.findMany({
          where: { customerId },
          include: { customOrder: true, reservationOrder: { include: { items: { include: { variant: { include: { product: true } } } } } } },
          orderBy: { orderDate: 'desc' }
        })
      ]);

      if (!customer) return res.status(404).json({ error: 'Customer not found' });

      const totalSpent = sales.reduce((sum, s) => sum + s.totalAmount, 0);

      res.json({ customer, sales, orders, totalSpent });
    } catch (error) { next(error); }
  }
);

export default router;
