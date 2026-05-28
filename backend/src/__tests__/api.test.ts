/**
 * Backend Integration Tests
 * Tests all major API endpoints using a real SQLite test database.
 *
 * Properties tested:
 * - Property 1: Stock Non-Negativity (Req 6, 20)
 * - Property 2: Transaction Atomicity (Req 9, 12, 13, 20)
 * - Property 3: Referential Integrity (Req 1, 20)
 * - Property 4: Stock Calculation Accuracy (Req 7, 20)
 * - Property 5: Price Consistency (Req 9)
 */

// IMPORTANT: Set DATABASE_URL to test DB BEFORE any Prisma imports
import path from 'path';
process.env.DATABASE_URL = `file:${path.resolve(__dirname, '../../prisma/test.db')}`;

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from './helpers/testApp';

const TEST_DATABASE_URL = `file:${path.resolve(__dirname, '../../prisma/test.db')}`;

const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DATABASE_URL } },
  log: [],
});

const app = createTestApp();

// ─── Helpers ────────────────────────────────────────────────────────────────

async function cleanDb() {
  await prisma.returnItem.deleteMany();
  await prisma.return.deleteMany();
  await prisma.reservationOrderItem.deleteMany();
  await prisma.reservationOrder.deleteMany();
  await prisma.customOrder.deleteMany();
  await prisma.order.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockExit.deleteMany();
  await prisma.stockEntry.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
}

async function seedBasicData() {
  const user = await prisma.user.create({
    data: { username: 'testuser', displayName: 'Test User' },
  });
  const customer = await prisma.customer.create({
    data: { name: 'Test Customer', phone: '555-0000' },
  });
  const product = await prisma.product.create({
    data: { name: 'Test Door', category: 'Gate', brand: 'TestBrand', createdById: user.id },
  });
  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      color: 'black',
      dimension: '80x200',
      salePrice: 500.0,
      minimumStockLevel: 5,
      sku: 'TEST-DOOR-BLK-80x200',
    },
  });
  const stock = await prisma.stock.create({
    data: { variantId: variant.id, quantity: 10 },
  });
  await prisma.stockEntry.create({
    data: { variantId: variant.id, quantity: 10, createdById: user.id },
  });
  return { user, customer, product, variant, stock };
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanDb();
});

// ─── Product CRUD (Req 1) ────────────────────────────────────────────────────

describe('Product CRUD (Req 1)', () => {
  let userId: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: { username: 'produser', displayName: 'Prod User' },
    });
    userId = user.id;
  });

  test('POST /api/products - creates a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'Interior Door', category: 'Gate', brand: 'Acme', createdById: userId });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Interior Door');
    expect(res.body.category).toBe('Gate');
    expect(res.body.id).toBeDefined();
  });

  test('GET /api/products - lists products', async () => {
    await prisma.product.create({
      data: { name: 'Window A', category: 'Window', brand: 'WinBrand', createdById: userId },
    });
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/products/:id - returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/products/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  test('PUT /api/products/:id - updates product name', async () => {
    const product = await prisma.product.create({
      data: { name: 'Old Name', category: 'Gate', brand: 'B', createdById: userId },
    });
    const res = await request(app)
      .put(`/api/products/${product.id}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });

  test('DELETE /api/products/:id - deletes product with no stock or sales', async () => {
    const product = await prisma.product.create({
      data: { name: 'Deletable', category: 'Accessory', brand: 'B', createdById: userId },
    });
    const res = await request(app).delete(`/api/products/${product.id}`);
    expect(res.status).toBe(204);
  });

  /**
   * Property 3: Referential Integrity (Req 1, 20)
   * Cannot delete a product that has sales records.
   * Validates: Requirements 1, 20
   */
  test('Property 3 - DELETE /api/products/:id - blocked when product has sales', async () => {
    const { product, variant, customer, user } = await seedBasicData();

    // Create a sale for this product
    await prisma.sale.create({
      data: {
        customerId: customer.id,
        totalAmount: 500,
        createdById: user.id,
        items: {
          create: [{ variantId: variant.id, quantity: 1, unitPrice: 500, lineTotal: 500 }],
        },
      },
    });

    const res = await request(app).delete(`/api/products/${product.id}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot delete/i);
  });

  /**
   * Property 3: Referential Integrity - cannot delete product with stock
   * Validates: Requirements 1, 20
   */
  test('Property 3 - DELETE /api/products/:id - blocked when product has stock', async () => {
    const { product } = await seedBasicData();
    const res = await request(app).delete(`/api/products/${product.id}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot delete/i);
  });
});

// ─── Stock Entry/Exit (Req 5, 6) ────────────────────────────────────────────

describe('Stock Entry/Exit (Req 5, 6)', () => {
  test('POST /api/stock/entry - increases stock quantity', async () => {
    const { variant, user } = await seedBasicData();
    const before = await prisma.stock.findUnique({ where: { variantId: variant.id } });

    const res = await request(app)
      .post('/api/stock/entry')
      .send({ variantId: variant.id, quantity: 5, createdById: user.id });

    expect(res.status).toBe(201);
    const after = await prisma.stock.findUnique({ where: { variantId: variant.id } });
    expect(after!.quantity).toBe((before!.quantity) + 5);
  });

  test('POST /api/stock/exit - decreases stock quantity', async () => {
    const { variant, user } = await seedBasicData();

    const res = await request(app)
      .post('/api/stock/exit')
      .send({ variantId: variant.id, quantity: 3, reason: 'Damage', createdById: user.id });

    expect(res.status).toBe(201);
    const after = await prisma.stock.findUnique({ where: { variantId: variant.id } });
    expect(after!.quantity).toBe(7); // 10 - 3
  });

  /**
   * Property 1: Stock Non-Negativity (Req 6, 20)
   * Stock exit should fail when requested quantity exceeds available stock.
   * Validates: Requirements 6, 20
   */
  test('Property 1 - POST /api/stock/exit - fails when insufficient stock', async () => {
    const { variant, user } = await seedBasicData();

    const res = await request(app)
      .post('/api/stock/exit')
      .send({ variantId: variant.id, quantity: 999, reason: 'Damage', createdById: user.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient stock/i);

    // Stock must remain unchanged
    const stock = await prisma.stock.findUnique({ where: { variantId: variant.id } });
    expect(stock!.quantity).toBe(10);
  });

  /**
   * Property 1: Stock Non-Negativity - exact boundary
   * Validates: Requirements 6, 20
   */
  test('Property 1 - POST /api/stock/exit - fails when quantity equals stock + 1', async () => {
    const { variant, user } = await seedBasicData();

    const res = await request(app)
      .post('/api/stock/exit')
      .send({ variantId: variant.id, quantity: 11, reason: 'Other', createdById: user.id });

    expect(res.status).toBe(400);
    const stock = await prisma.stock.findUnique({ where: { variantId: variant.id } });
    expect(stock!.quantity).toBe(10); // unchanged
  });

  /**
   * Property 1: Stock Non-Negativity - exact stock amount succeeds
   * Validates: Requirements 6, 20
   */
  test('Property 1 - POST /api/stock/exit - succeeds when quantity equals available stock', async () => {
    const { variant, user } = await seedBasicData();

    const res = await request(app)
      .post('/api/stock/exit')
      .send({ variantId: variant.id, quantity: 10, reason: 'Damage', createdById: user.id });

    expect(res.status).toBe(201);
    const stock = await prisma.stock.findUnique({ where: { variantId: variant.id } });
    expect(stock!.quantity).toBe(0);
  });
});

// ─── Stock Calculation Accuracy (Req 7, Property 4) ─────────────────────────

describe('Stock Calculation Accuracy (Req 7, Property 4)', () => {
  /**
   * Property 4: Stock = SUM(entries) - SUM(exits)
   * Validates: Requirements 7, 20
   */
  test('Property 4 - stock quantity equals entries minus exits', async () => {
    const { variant, user } = await seedBasicData();
    // Initial: 10 units from seed

    // Add 5 more
    await request(app)
      .post('/api/stock/entry')
      .send({ variantId: variant.id, quantity: 5, createdById: user.id });

    // Remove 3
    await request(app)
      .post('/api/stock/exit')
      .send({ variantId: variant.id, quantity: 3, reason: 'Damage', createdById: user.id });

    // Remove 2 more
    await request(app)
      .post('/api/stock/exit')
      .send({ variantId: variant.id, quantity: 2, reason: 'Other', createdById: user.id });

    // Expected: 10 + 5 - 3 - 2 = 10
    const stock = await prisma.stock.findUnique({ where: { variantId: variant.id } });
    const entries = await prisma.stockEntry.findMany({ where: { variantId: variant.id } });
    const exits = await prisma.stockExit.findMany({ where: { variantId: variant.id } });

    const sumEntries = entries.reduce((s, e) => s + e.quantity, 0);
    const sumExits = exits.reduce((s, e) => s + e.quantity, 0);

    expect(stock!.quantity).toBe(sumEntries - sumExits);
    expect(stock!.quantity).toBe(10);
  });

  test('GET /api/stock/:variantId - returns correct stock info', async () => {
    const { variant } = await seedBasicData();
    const res = await request(app).get(`/api/stock/${variant.id}`);
    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(10);
    expect(res.body.variantId).toBe(variant.id);
  });

  test('GET /api/stock - lists all stock items', async () => {
    await seedBasicData();
    const res = await request(app).get('/api/stock');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Sales (Req 9, Property 2, 5) ───────────────────────────────────────────

describe('Sales Creation and Stock Deduction (Req 9)', () => {
  test('POST /api/sales - creates sale and deducts stock', async () => {
    const { variant, customer, user } = await seedBasicData();

    const res = await request(app)
      .post('/api/sales')
      .send({
        customerId: customer.id,
        items: [{ variantId: variant.id, quantity: 3 }],
        createdById: user.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(3);

    // Stock should be reduced
    const stock = await prisma.stock.findUnique({ where: { variantId: variant.id } });
    expect(stock!.quantity).toBe(7); // 10 - 3
  });

  /**
   * Property 5: Price Consistency (Req 9)
   * Sale items record the correct price from ProductVariant.salePrice.
   * Validates: Requirements 9
   */
  test('Property 5 - sale items record correct unit price', async () => {
    const { variant, customer, user } = await seedBasicData();

    const res = await request(app)
      .post('/api/sales')
      .send({
        customerId: customer.id,
        items: [{ variantId: variant.id, quantity: 2 }],
        createdById: user.id,
      });

    expect(res.status).toBe(201);
    const saleItem = res.body.items[0];
    expect(saleItem.unitPrice).toBe(500.0); // matches variant.salePrice
    expect(saleItem.lineTotal).toBe(1000.0); // 2 × 500
    expect(res.body.totalAmount).toBe(1000.0);
  });

  /**
   * Property 1: Stock Non-Negativity via Sales
   * Sale should fail when stock is insufficient.
   * Validates: Requirements 9, 20
   */
  test('Property 1 - POST /api/sales - fails when insufficient stock', async () => {
    const { variant, customer, user } = await seedBasicData();

    const res = await request(app)
      .post('/api/sales')
      .send({
        customerId: customer.id,
        items: [{ variantId: variant.id, quantity: 100 }],
        createdById: user.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient stock/i);

    // Stock must remain unchanged
    const stock = await prisma.stock.findUnique({ where: { variantId: variant.id } });
    expect(stock!.quantity).toBe(10);
  });

  /**
   * Property 2: Transaction Atomicity for Sales
   * If one item has insufficient stock, the entire sale is rejected.
   * Validates: Requirements 9, 20
   */
  test('Property 2 - POST /api/sales - atomic: all-or-nothing on insufficient stock', async () => {
    const { variant, customer, user, product } = await seedBasicData();

    // Create a second variant with 0 stock
    const variant2 = await prisma.productVariant.create({
      data: {
        productId: product.id,
        color: 'white',
        dimension: '80x200',
        salePrice: 300.0,
        minimumStockLevel: 2,
        sku: 'TEST-DOOR-WHT-80x200',
      },
    });
    await prisma.stock.create({ data: { variantId: variant2.id, quantity: 0 } });

    const res = await request(app)
      .post('/api/sales')
      .send({
        customerId: customer.id,
        items: [
          { variantId: variant.id, quantity: 2 },   // sufficient
          { variantId: variant2.id, quantity: 1 },  // insufficient
        ],
        createdById: user.id,
      });

    expect(res.status).toBe(400);

    // First variant stock must remain unchanged (transaction rolled back)
    const stock1 = await prisma.stock.findUnique({ where: { variantId: variant.id } });
    expect(stock1!.quantity).toBe(10);

    // No sale record should exist
    const sales = await prisma.sale.findMany({ where: { customerId: customer.id } });
    expect(sales).toHaveLength(0);
  });

  test('GET /api/sales - lists sales', async () => {
    const { variant, customer, user } = await seedBasicData();
    await request(app)
      .post('/api/sales')
      .send({ customerId: customer.id, items: [{ variantId: variant.id, quantity: 1 }], createdById: user.id });

    const res = await request(app).get('/api/sales');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Return Processing (Req 13, Property 2) ─────────────────────────────────

describe('Return Processing and Stock Restoration (Req 13)', () => {
  /**
   * Property 2: Transaction Atomicity for Returns
   * Return creates StockEntry and increases stock atomically.
   * Validates: Requirements 13, 20
   */
  test('POST /api/returns - restores stock and creates stock entry', async () => {
    const { variant, customer, user } = await seedBasicData();

    const res = await request(app)
      .post('/api/returns')
      .send({
        customerId: customer.id,
        items: [{ variantId: variant.id, quantity: 2, isSecondQuality: false }],
        reason: 'Defective product',
        createdById: user.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();

    // Stock should increase
    const stock = await prisma.stock.findUnique({ where: { variantId: variant.id } });
    expect(stock!.quantity).toBe(12); // 10 + 2

    // StockEntry should be created
    const entries = await prisma.stockEntry.findMany({ where: { variantId: variant.id } });
    expect(entries.length).toBeGreaterThanOrEqual(2); // original + return
  });

  test('POST /api/returns - second quality return goes to secondQualityQty', async () => {
    const { variant, customer, user } = await seedBasicData();

    const res = await request(app)
      .post('/api/returns')
      .send({
        customerId: customer.id,
        items: [{ variantId: variant.id, quantity: 1, isSecondQuality: true }],
        reason: 'Damaged',
        createdById: user.id,
      });

    expect(res.status).toBe(201);

    // Regular stock unchanged, second quality increased
    const stock = await prisma.stock.findUnique({ where: { variantId: variant.id } });
    expect(stock!.quantity).toBe(10); // unchanged
    expect(stock!.secondQualityQty).toBe(1);
  });

  test('GET /api/returns - lists returns', async () => {
    const { variant, customer, user } = await seedBasicData();
    await request(app)
      .post('/api/returns')
      .send({
        customerId: customer.id,
        items: [{ variantId: variant.id, quantity: 1 }],
        reason: 'Test return',
        createdById: user.id,
      });

    const res = await request(app).get('/api/returns');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Reservation Orders (Req 12, Property 2) ────────────────────────────────

describe('Reservation Orders (Req 12)', () => {
  /**
   * Property 2: Transaction Atomicity for Reservation Orders
   * Reservation deducts stock atomically.
   * Validates: Requirements 12, 20
   */
  test('POST /api/orders/reservation - creates order and deducts stock', async () => {
    const { variant, customer, user } = await seedBasicData();

    const res = await request(app)
      .post('/api/orders/reservation')
      .send({
        customerId: customer.id,
        items: [{ variantId: variant.id, quantity: 4 }],
        createdById: user.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.orderType).toBe('Reservation');
    expect(res.body.status).toBe('Reserved');

    // Stock should be reduced
    const stock = await prisma.stock.findUnique({ where: { variantId: variant.id } });
    expect(stock!.quantity).toBe(6); // 10 - 4
  });

  test('POST /api/orders/reservation - fails when insufficient stock', async () => {
    const { variant, customer, user } = await seedBasicData();

    const res = await request(app)
      .post('/api/orders/reservation')
      .send({
        customerId: customer.id,
        items: [{ variantId: variant.id, quantity: 50 }],
        createdById: user.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient stock/i);

    // Stock unchanged
    const stock = await prisma.stock.findUnique({ where: { variantId: variant.id } });
    expect(stock!.quantity).toBe(10);
  });

  test('POST /api/orders/custom - creates custom order without stock deduction', async () => {
    const { customer, user } = await seedBasicData();
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/orders/custom')
      .send({
        customerId: customer.id,
        productType: 'Gate',
        dimensions: '90x210',
        specifications: 'Custom oak door',
        deliveryDeadline: futureDate,
        createdById: user.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.orderType).toBe('Custom');
    expect(res.body.status).toBe('Order_Received');
  });
});

// ─── Reports (Req 14, 15, 16) ────────────────────────────────────────────────

describe('Report Endpoints (Req 14, 15, 16)', () => {
  test('GET /api/reports/best-selling - returns array', async () => {
    const { variant, customer, user } = await seedBasicData();
    await request(app)
      .post('/api/sales')
      .send({ customerId: customer.id, items: [{ variantId: variant.id, quantity: 2 }], createdById: user.id });

    const res = await request(app).get('/api/reports/best-selling');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].totalQuantity).toBe(2);
    expect(res.body[0].totalRevenue).toBe(1000);
  });

  test('GET /api/reports/slow-moving - returns items with stock > 0', async () => {
    await seedBasicData();
    const res = await request(app).get('/api/reports/slow-moving');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].quantity).toBeGreaterThan(0);
  });

  test('GET /api/reports/monthly-sales - returns monthly aggregation', async () => {
    const { variant, customer, user } = await seedBasicData();
    await request(app)
      .post('/api/sales')
      .send({ customerId: customer.id, items: [{ variantId: variant.id, quantity: 1 }], createdById: user.id });

    const res = await request(app).get('/api/reports/monthly-sales');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('month');
    expect(res.body[0]).toHaveProperty('transactionCount');
    expect(res.body[0]).toHaveProperty('totalRevenue');
    expect(res.body[0]).toHaveProperty('totalQuantity');
  });

  test('GET /api/reports/stock-value - returns stock value summary', async () => {
    await seedBasicData();
    const res = await request(app).get('/api/reports/stock-value');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalValue');
    expect(res.body).toHaveProperty('totalItems');
    expect(res.body.totalItems).toBeGreaterThanOrEqual(10);
  });

  test('GET /api/reports/dashboard-summary - returns dashboard data', async () => {
    await seedBasicData();
    const res = await request(app).get('/api/reports/dashboard-summary');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('salesThisMonth');
    expect(res.body).toHaveProperty('totalStockItems');
    expect(res.body).toHaveProperty('criticalStockCount');
  });
});

// ─── Critical Stock (Req 8) ──────────────────────────────────────────────────

describe('Critical Stock (Req 8)', () => {
  test('GET /api/stock/critical - returns variants at or below minimum level', async () => {
    const { variant, user } = await seedBasicData();
    // Reduce stock to below minimum (minimumStockLevel = 5, current = 10)
    await request(app)
      .post('/api/stock/exit')
      .send({ variantId: variant.id, quantity: 7, reason: 'Damage', createdById: user.id });
    // Now stock = 3, which is <= minimumStockLevel (5)

    const res = await request(app).get('/api/stock/critical');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((item: any) => item.id === variant.id);
    expect(found).toBeDefined();
    expect(found.status).toBe('Low');
  });
});
