-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "brand" TEXT NOT NULL,
    "isEndOfLife" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Product_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "color" TEXT,
    "dimension" TEXT NOT NULL,
    "type" TEXT,
    "material" TEXT,
    "salePrice" REAL NOT NULL,
    "minimumStockLevel" INTEGER NOT NULL DEFAULT 10,
    "sku" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "secondQualityQty" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME NOT NULL,
    CONSTRAINT "Stock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSecondQuality" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "StockEntry_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockExit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "exitDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "StockExit_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockExit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "lineTotal" REAL NOT NULL,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderType" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "dimensions" TEXT NOT NULL,
    "specifications" TEXT,
    "deliveryDeadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "CustomOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "ReservationOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationOrderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "ReservationOrderItem_reservationOrderId_fkey" FOREIGN KEY ("reservationOrderId") REFERENCES "ReservationOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationOrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Return" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "returnDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Return_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Return_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isSecondQuality" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReturnItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_sku_idx" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_color_dimension_type_material_key" ON "ProductVariant"("productId", "color", "dimension", "type", "material");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_variantId_key" ON "Stock"("variantId");

-- CreateIndex
CREATE INDEX "Stock_variantId_idx" ON "Stock"("variantId");

-- CreateIndex
CREATE INDEX "StockEntry_variantId_idx" ON "StockEntry"("variantId");

-- CreateIndex
CREATE INDEX "StockEntry_entryDate_idx" ON "StockEntry"("entryDate");

-- CreateIndex
CREATE INDEX "StockExit_variantId_idx" ON "StockExit"("variantId");

-- CreateIndex
CREATE INDEX "StockExit_exitDate_idx" ON "StockExit"("exitDate");

-- CreateIndex
CREATE INDEX "StockExit_reason_idx" ON "StockExit"("reason");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");

-- CreateIndex
CREATE INDEX "Sale_saleDate_idx" ON "Sale"("saleDate");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_variantId_idx" ON "SaleItem"("variantId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_orderType_idx" ON "Order"("orderType");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CustomOrder_orderId_key" ON "CustomOrder"("orderId");

-- CreateIndex
CREATE INDEX "CustomOrder_status_idx" ON "CustomOrder"("status");

-- CreateIndex
CREATE INDEX "CustomOrder_deliveryDeadline_idx" ON "CustomOrder"("deliveryDeadline");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationOrder_orderId_key" ON "ReservationOrder"("orderId");

-- CreateIndex
CREATE INDEX "ReservationOrder_status_idx" ON "ReservationOrder"("status");

-- CreateIndex
CREATE INDEX "ReservationOrderItem_reservationOrderId_idx" ON "ReservationOrderItem"("reservationOrderId");

-- CreateIndex
CREATE INDEX "ReservationOrderItem_variantId_idx" ON "ReservationOrderItem"("variantId");

-- CreateIndex
CREATE INDEX "Return_customerId_idx" ON "Return"("customerId");

-- CreateIndex
CREATE INDEX "Return_returnDate_idx" ON "Return"("returnDate");

-- CreateIndex
CREATE INDEX "ReturnItem_returnId_idx" ON "ReturnItem"("returnId");

-- CreateIndex
CREATE INDEX "ReturnItem_variantId_idx" ON "ReturnItem"("variantId");
