# Design Document

## Overview

Bu belge, Stok ve Satış Yönetim Sistemi'nin teknik tasarımını tanımlar. Sistem, kapı, pencere, panel ve aksesuar satışı yapan bir işletme için varyantlı ürün yönetimi, stok takibi, satış işlemleri, sipariş yönetimi ve raporlama işlevlerini sağlar.

## Architecture

### High-Level Architecture

Sistem, modern web teknolojileri kullanılarak geliştirilecek 3-katmanlı bir mimari yapıya sahiptir:

```
┌─────────────────────────────────────────────────────────┐
│                  Presentation Layer                      │
│  (Responsive Web UI - Desktop & Tablet Support)         │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Product    │  │    Sales     │  │   Reports    │ │
│  │  Management  │  │   Interface  │  │   Dashboard  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                   Business Logic Layer                   │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Product    │  │    Stock     │  │    Sales     │ │
│  │   Service    │  │   Service    │  │   Service    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    Order     │  │   Report     │  │     User     │ │
│  │   Service    │  │   Service    │  │   Service    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                     Data Layer                           │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Relational Database                     │  │
│  │  (Products, Variants, Stock, Sales, Orders)      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack Considerations

**Frontend:**
- Responsive web framework (React, Vue, or Angular)
- State management for cart and real-time stock updates
- Touch-optimized UI components for tablet support

**Backend:**
- RESTful API architecture
- Business logic layer for stock calculations and validations
- Transaction management for data integrity

**Database:**
- Relational database (PostgreSQL, MySQL, or SQL Server)
- Support for ACID transactions
- Indexing for fast product search and filtering

## Components and Interfaces

### Component Overview

Sistem 6 ana modülden oluşur:
1. Product Management Module
2. Stock Management Module
3. Sales Module
4. Order Module
5. Return Module
6. Report Module

## Data Models

### Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────────┐         ┌──────────────┐
│   Product   │────────<│ ProductVariant  │>────────│    Stock     │
└─────────────┘         └─────────────────┘         └──────────────┘
      │                         │                           │
      │                         │                           │
      │                         ↓                           ↓
      │                  ┌─────────────┐            ┌──────────────┐
      │                  │  SaleItem   │            │ StockEntry   │
      │                  └─────────────┘            └──────────────┘
      │                         │                           
      │                         ↓                    ┌──────────────┐
      │                  ┌─────────────┐            │  StockExit   │
      │                  │    Sale     │            └──────────────┘
      │                  └─────────────┘
      │                         │
      │                         ↓
      │                  ┌─────────────┐
      └─────────────────>│  Customer   │
                         └─────────────┘
                                │
                                ↓
                         ┌─────────────┐
                         │    Order    │
                         └─────────────┘
                                │
                         ┌──────┴──────┐
                         ↓             ↓
                  ┌─────────────┐ ┌──────────────────┐
                  │CustomOrder  │ │ReservationOrder  │
                  └─────────────┘ └──────────────────┘
```


### Core Entities

#### Product
Temel ürün bilgilerini tutar.

**Attributes:**
- `id` (UUID/Integer, Primary Key): Benzersiz ürün tanımlayıcısı
- `name` (String, 1-200 chars): Ürün adı
- `category` (Enum): Gate, Window, Panel, Accessory, Consumable
- `subcategory` (String, Optional): Interior_Gate, Exterior_Gate, Interior_Panel, vb.
- `brand` (String, 1-100 chars): Marka
- `created_at` (Timestamp): Oluşturulma zamanı
- `updated_at` (Timestamp): Güncellenme zamanı
- `created_by` (Foreign Key → User): Oluşturan kullanıcı
- `is_end_of_life` (Boolean): Ürün satıştan kaldırıldı mı?

**Business Rules:**
- Ürün silinmeden önce ilişkili Stock ve Sale kayıtları kontrol edilmelidir
- Her ürün en az bir variant'a sahip olmalıdır

#### ProductVariant
Bir ürünün renk, ölçü, tip kombinasyonlarını temsil eder.

**Attributes:**
- `id` (UUID/Integer, Primary Key): Benzersiz varyant tanımlayıcısı
- `product_id` (Foreign Key → Product): Bağlı olduğu ürün
- `color` (String, Optional): Renk (black, brown, grey, white, anthracite, vb.)
- `dimension` (String): Ölçü bilgisi (örn: "24x36", "72x80")
- `type` (String, Optional): Tip bilgisi (Oak_Big_Glass, Tilt_And_Turn, vb.)
- `material` (String, Optional): Malzeme (Aluminum_Black, PVC_White, vb.)
- `sale_price` (Decimal, 2 decimal places): Satış fiyatı
- `minimum_stock_level` (Integer, 0-999999): Minimum stok seviyesi
- `sku` (String, Unique): Stok kodu
- `created_at` (Timestamp): Oluşturulma zamanı


**Business Rules:**
- Aynı product_id için color, dimension, type, material kombinasyonu benzersiz olmalıdır
- Her varyant için ayrı stok takibi yapılır

#### Stock
Her varyant için anlık stok miktarını tutar (hesaplanmış değer).

**Attributes:**
- `id` (UUID/Integer, Primary Key): Benzersiz stok kaydı tanımlayıcısı
- `variant_id` (Foreign Key → ProductVariant, Unique): Varyant
- `quantity` (Integer, >= 0): Toplam stok miktarı
- `second_quality_quantity` (Integer, >= 0): İkinci kalite stok miktarı
- `last_updated` (Timestamp): Son güncellenme zamanı

**Business Rules:**
- Stok miktarı negatif olamaz
- Stok miktarı = (Toplam StockEntry) - (Toplam StockExit)
- İkinci kalite stok ayrı takip edilir

#### StockEntry
Depoya ürün giriş kayıtları.

**Attributes:**
- `id` (UUID/Integer, Primary Key): Benzersiz giriş kaydı
- `variant_id` (Foreign Key → ProductVariant): Varyant
- `quantity` (Integer, 1-999999): Giriş miktarı
- `entry_date` (Date): Giriş tarihi
- `is_second_quality` (Boolean): İkinci kalite mi?
- `notes` (Text, Optional): Notlar
- `created_at` (Timestamp): Kayıt zamanı
- `created_by` (Foreign Key → User): Kaydı oluşturan kullanıcı

**Business Rules:**
- Giriş yapıldığında Stock.quantity otomatik artırılır
- İkinci kalite girişler Stock.second_quality_quantity'yi artırır


#### StockExit
Depodan ürün çıkış kayıtları.

**Attributes:**
- `id` (UUID/Integer, Primary Key): Benzersiz çıkış kaydı
- `variant_id` (Foreign Key → ProductVariant): Varyant
- `quantity` (Integer, 1-999999): Çıkış miktarı
- `exit_date` (Date): Çıkış tarihi
- `reason` (Enum): Sale, Order_Fulfillment, Damage, Other
- `reference_id` (String, Optional): İlişkili Sale veya Order ID'si
- `notes` (Text, Optional): Notlar
- `created_at` (Timestamp): Kayıt zamanı
- `created_by` (Foreign Key → User): Kaydı oluşturan kullanıcı

**Business Rules:**
- Çıkış yapılmadan önce yeterli stok kontrolü yapılmalıdır
- Çıkış yapıldığında Stock.quantity otomatik azaltılır
- Transaction içinde gerçekleştirilmelidir (rollback desteği)

#### Customer
Müşteri bilgileri.

**Attributes:**
- `id` (UUID/Integer, Primary Key): Benzersiz müşteri tanımlayıcısı
- `name` (String, 1-200 chars): Müşteri adı
- `phone` (String, Optional): Telefon
- `email` (String, Optional): E-posta
- `address` (Text, Optional): Adres
- `created_at` (Timestamp): Kayıt zamanı
- `created_by` (Foreign Key → User): Kaydı oluşturan kullanıcı

#### Sale
Satış işlemi ana kaydı.

**Attributes:**
- `id` (UUID/Integer, Primary Key): Benzersiz satış tanımlayıcısı
- `customer_id` (Foreign Key → Customer): Müşteri
- `sale_date` (Timestamp): Satış tarihi
- `total_amount` (Decimal, 2 decimal places): Toplam tutar
- `notes` (Text, 0-1000 chars, Optional): Manuel notlar
- `created_at` (Timestamp): Kayıt zamanı
- `created_by` (Foreign Key → User): Satışı yapan kullanıcı


**Business Rules:**
- Satış oluşturulduğunda her SaleItem için StockExit kaydı oluşturulur
- Transaction içinde gerçekleştirilmelidir
- Stok yetersizse satış engellenmelidir

#### SaleItem
Satış detay kayıtları (satılan ürünler).

**Attributes:**
- `id` (UUID/Integer, Primary Key): Benzersiz satış kalemi tanımlayıcısı
- `sale_id` (Foreign Key → Sale): Bağlı olduğu satış
- `variant_id` (Foreign Key → ProductVariant): Satılan varyant
- `quantity` (Integer, 1-9999): Adet
- `unit_price` (Decimal, 2 decimal places): Birim fiyat
- `line_total` (Decimal, 2 decimal places): Satır toplamı (quantity × unit_price)

**Business Rules:**
- line_total = quantity × unit_price
- unit_price satış anındaki ProductVariant.sale_price değeridir

#### Order
Sipariş ana kaydı (abstract).

**Attributes:**
- `id` (UUID/Integer, Primary Key): Benzersiz sipariş tanımlayıcısı
- `order_type` (Enum): Custom, Reservation
- `customer_id` (Foreign Key → Customer): Müşteri
- `order_date` (Timestamp): Sipariş tarihi
- `status` (String): Sipariş durumu
- `notes` (Text, 0-2000 chars, Optional): Manuel notlar
- `created_at` (Timestamp): Kayıt zamanı
- `created_by` (Foreign Key → User): Siparişi oluşturan kullanıcı

#### CustomOrder
Özel üretim siparişi.

**Attributes:**
- `id` (UUID/Integer, Primary Key): Benzersiz özel sipariş tanımlayıcısı
- `order_id` (Foreign Key → Order): Bağlı sipariş kaydı
- `product_type` (Enum): Gate, Window, Panel, Accessory, Consumable
- `dimensions` (String, 1-100 chars): Ölçüler
- `specifications` (Text): Özellikler
- `delivery_deadline` (Date): Teslim tarihi
- `status` (Enum): Order_Received, In_Production, Completed


**Business Rules:**
- Özel üretim siparişi stoktan düşmez
- Durum geçişleri: Order_Received → In_Production → Completed
- Teslim tarihi gelecekte olmalıdır

#### ReservationOrder
Stoktan rezervasyon siparişi.

**Attributes:**
- `id` (UUID/Integer, Primary Key): Benzersiz rezervasyon tanımlayıcısı
- `order_id` (Foreign Key → Order): Bağlı sipariş kaydı
- `status` (Enum): Reserved, Delivered

**Related Entity:**
- `ReservationOrderItem`: Rezerve edilen varyantlar ve miktarlar
  - `reservation_order_id` (Foreign Key)
  - `variant_id` (Foreign Key → ProductVariant)
  - `quantity` (Integer, 1-9999)

**Business Rules:**
- Rezervasyon oluşturulduğunda stoktan düşer (StockExit oluşturulur)
- Teslim edildiğinde durum Delivered'a güncellenir

#### Return
İade işlemi.

**Attributes:**
- `id` (UUID/Integer, Primary Key): Benzersiz iade tanımlayıcısı
- `customer_id` (Foreign Key → Customer): Müşteri
- `return_date` (Timestamp): İade tarihi
- `reason` (String, 1-500 chars): İade sebebi
- `created_at` (Timestamp): Kayıt zamanı
- `created_by` (Foreign Key → User): İadeyi kaydeden kullanıcı

**Related Entity:**
- `ReturnItem`: İade edilen ürünler
  - `return_id` (Foreign Key)
  - `variant_id` (Foreign Key → ProductVariant)
  - `quantity` (Integer, 1-999)
  - `is_second_quality` (Boolean)


**Business Rules:**
- İade yapıldığında StockEntry oluşturulur ve stok artar
- İkinci kalite iadeler ayrı takip edilir

#### User
Sistem kullanıcıları (gelecek yetkilendirme için).

**Attributes:**
- `id` (UUID/Integer, Primary Key): Benzersiz kullanıcı tanımlayıcısı
- `username` (String, Unique): Kullanıcı adı
- `display_name` (String): Görünen ad
- `role` (String, Optional): Rol (gelecek için)
- `is_active` (Boolean): Aktif mi?
- `created_at` (Timestamp): Kayıt zamanı

**Business Rules:**
- Tüm işlemler (Sale, Order, StockEntry, StockExit) created_by ile kullanıcıya bağlanır
- Gelecekte rol bazlı yetkilendirme için altyapı hazır

## Component Design

### 1. Product Management Module

**Responsibilities:**
- Ürün ve varyant CRUD işlemleri
- Varyant kombinasyonlarının yönetimi
- Fiyat güncelleme

**Key Operations:**
- `createProduct(productData)`: Yeni ürün oluşturma
- `createVariant(productId, variantData)`: Varyant ekleme
- `updateProduct(productId, updates)`: Ürün güncelleme
- `deleteProduct(productId)`: Ürün silme (referans kontrolü ile)
- `listProducts(filters)`: Ürün listeleme ve filtreleme
- `searchProducts(query)`: Ürün arama

**Validation Rules:**
- Kategori bazlı varyant kuralları kontrolü
- Fiyat pozitif olmalı
- Ölçü formatı kontrolü


### 2. Stock Management Module

**Responsibilities:**
- Stok giriş/çıkış işlemleri
- Anlık stok hesaplama
- Minimum stok uyarıları
- Stok durumu renk kodlaması

**Key Operations:**
- `recordStockEntry(variantId, quantity, isSecondQuality, notes)`: Stok girişi
- `recordStockExit(variantId, quantity, reason, notes)`: Stok çıkışı
- `getCurrentStock(variantId)`: Anlık stok sorgulama
- `getStockStatus(variantId)`: Stok durumu (Normal, Low, Out_Of_Stock, Discontinued)
- `getCriticalStockList()`: Kritik stok seviyesindeki ürünler
- `listStockWithFilters(filters)`: Filtrelenmiş stok listesi

**Business Logic:**
- Stok hesaplama: `SUM(StockEntry.quantity) - SUM(StockExit.quantity)`
- Durum belirleme:
  - `quantity > minimum_stock_level` → Normal (Yeşil)
  - `0 < quantity <= minimum_stock_level` → Low (Sarı)
  - `quantity = 0` → Out_Of_Stock (Kırmızı)
  - `is_end_of_life = true` → Discontinued (Siyah)

**Transaction Management:**
- Stok çıkışı transaction içinde yapılmalı
- Yetersiz stok durumunda rollback

### 3. Sales Module

**Responsibilities:**
- Satış işlemi yönetimi
- Sepet işlevselliği
- Stok düşme otomasyonu

**Key Operations:**
- `addToCart(variantId, quantity)`: Sepete ekleme
- `updateCartItem(cartItemId, quantity)`: Sepet güncelleme
- `removeFromCart(cartItemId)`: Sepetten çıkarma
- `calculateCartTotal()`: Sepet toplamı hesaplama
- `completeSale(customerId, cartItems, notes)`: Satışı tamamlama
- `getSaleHistory(filters)`: Satış geçmişi


**Sale Completion Flow:**
```
1. Validate customer information
2. Validate all cart items have sufficient stock
3. Begin database transaction
4. Create Sale record
5. For each cart item:
   a. Create SaleItem record
   b. Create StockExit record
   c. Update Stock quantity
6. Commit transaction
7. Clear cart
8. Return sale confirmation
```

**Error Handling:**
- Yetersiz stok → Hangi ürünlerde eksik olduğunu belirt
- Geçersiz varyant → Hata mesajı
- Transaction hatası → Rollback ve kullanıcıya bildir

### 4. Order Module

**Responsibilities:**
- Özel üretim siparişi yönetimi
- Rezervasyon siparişi yönetimi
- Sipariş durum takibi

**Key Operations:**
- `createCustomOrder(customerData, orderDetails)`: Özel üretim siparişi
- `createReservationOrder(customerId, cartItems, notes)`: Rezervasyon siparişi
- `updateOrderStatus(orderId, newStatus)`: Durum güncelleme
- `getOrdersByStatus(status)`: Duruma göre sipariş listesi
- `getOrderDetails(orderId)`: Sipariş detayları

**Custom Order Flow:**
```
1. Validate customer and order details
2. Validate delivery deadline (must be future date)
3. Create Order record (type: Custom)
4. Create CustomOrder record (status: Order_Received)
5. No stock deduction
6. Return order confirmation
```

**Reservation Order Flow:**
```
1. Validate customer information
2. Validate all items have sufficient stock
3. Begin database transaction
4. Create Order record (type: Reservation)
5. Create ReservationOrder record (status: Reserved)
6. For each item:
   a. Create ReservationOrderItem
   b. Create StockExit record (reason: Order_Fulfillment)
   c. Update Stock quantity
7. Commit transaction
8. Return order confirmation
```


### 5. Return Module

**Responsibilities:**
- İade işlemi yönetimi
- İkinci kalite ürün takibi
- Stok geri ekleme

**Key Operations:**
- `processReturn(customerId, returnItems, reason)`: İade işleme
- `getReturnHistory(filters)`: İade geçmişi

**Return Flow:**
```
1. Validate customer and return items
2. Begin database transaction
3. Create Return record
4. For each return item:
   a. Create ReturnItem record
   b. Create StockEntry record
   c. If is_second_quality:
      - Update Stock.second_quality_quantity
   d. Else:
      - Update Stock.quantity
5. Commit transaction
6. Return confirmation
```

### 6. Report Module

**Responsibilities:**
- Satış raporları
- Stok raporları
- Performans analizleri

**Key Operations:**
- `getBestSellingProducts(dateRange)`: En çok satan ürünler
- `getSlowMovingStock(category)`: Stokta bekleyen ürünler
- `getMonthlySalesReport(startDate, endDate)`: Aylık satış raporu
- `getStockValueReport()`: Stok değer raporu

**Best Selling Products Report:**
```sql
SELECT 
  pv.id, 
  p.name, 
  pv.color, 
  pv.dimension,
  SUM(si.quantity) as total_sold,
  SUM(si.line_total) as total_revenue
FROM SaleItem si
JOIN ProductVariant pv ON si.variant_id = pv.id
JOIN Product p ON pv.product_id = p.id
JOIN Sale s ON si.sale_id = s.id
WHERE s.sale_date BETWEEN :start_date AND :end_date
GROUP BY pv.id, p.name, pv.color, pv.dimension
ORDER BY total_sold DESC
```


**Slow Moving Stock Report:**
```sql
SELECT 
  pv.id,
  p.name,
  pv.color,
  pv.dimension,
  s.quantity as current_stock,
  DATEDIFF(CURRENT_DATE, MAX(se.entry_date)) as days_in_stock
FROM Stock s
JOIN ProductVariant pv ON s.variant_id = pv.id
JOIN Product p ON pv.product_id = p.id
LEFT JOIN StockEntry se ON se.variant_id = pv.id
WHERE s.quantity > 0
GROUP BY pv.id, p.name, pv.color, pv.dimension, s.quantity
ORDER BY days_in_stock DESC
```

**Monthly Sales Report:**
```sql
SELECT 
  DATE_FORMAT(s.sale_date, '%Y-%m') as month,
  COUNT(s.id) as transaction_count,
  SUM(si.quantity) as total_quantity,
  SUM(s.total_amount) as total_revenue
FROM Sale s
JOIN SaleItem si ON si.sale_id = s.id
WHERE s.sale_date BETWEEN :start_date AND :end_date
GROUP BY DATE_FORMAT(s.sale_date, '%Y-%m')
ORDER BY month
```

## User Interface Design

### Sales Screen Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                     SATIŞ EKRANI                                 │
├──────────────────────────────┬──────────────────────────────────┤
│   SOL PANEL: ÜRÜN ARAMA      │   SAĞ PANEL: SEPET               │
│                              │                                  │
│  ┌────────────────────────┐ │  Müşteri: [____________]         │
│  │ Ürün Ara: [_________] │ │                                  │
│  └────────────────────────┘ │  ┌────────────────────────────┐ │
│                              │  │ Ürün    Adet  Fiyat  Toplam│ │
│  Filtreler:                  │  ├────────────────────────────┤ │
│  □ Kapı  □ Pencere          │  │ Kapı... 2     500₺   1000₺ │ │
│  □ Panel □ Aksesuar         │  │ Penc... 1     800₺    800₺ │ │
│                              │  │                            │ │
│  ┌────────────────────────┐ │  └────────────────────────────┘ │
│  │ • Kapı İç Siyah 80x200│ │                                  │
│  │ • Pencere 24x36 Beyaz │ │  Toplam: 1800₺                   │
│  │ • Panel Akustik 2x9   │ │                                  │
│  │ • Kapı Kulpu Krom     │ │  Notlar:                         │
│  │ ...                   │ │  [________________________]      │
│  └────────────────────────┘ │  [________________________]      │
│                              │                                  │
│                              │  [    SAT    ] [SİPARİŞ OLUŞTUR]│
└──────────────────────────────┴──────────────────────────────────┘
```


### UI Components

**ProductSearchPanel:**
- Search input with real-time filtering
- Category filters (checkbox group)
- Product list with variant display
- Click to select and add to cart

**CartPanel:**
- Customer name input
- Cart items table (editable quantities)
- Line totals and grand total
- Notes textarea
- Action buttons (SAT, SİPARİŞ OLUŞTUR)

**StockDisplayPanel:**
- Product variant list with color-coded status
- Filters: category, color, dimension, brand
- Stock quantity display
- Minimum stock level indicator

**ReportDashboard:**
- Date range selector
- Report type selector
- Data visualization (charts/tables)
- Export functionality

### Responsive Design

**Desktop (>1024px):**
- Two-column layout for sales screen
- Full-width tables for reports
- Sidebar navigation

**Tablet (768-1023px):**
- Collapsible panels for sales screen
- Touch-optimized buttons (min 44px)
- Swipe gestures for navigation
- Optimized table layouts

## Security & Authorization

### Current Implementation
- User tracking: All operations logged with created_by
- Audit trail: Timestamps on all records

### Future Authorization Support
- Role-based access control (RBAC) ready
- User entity with role field
- UI components support conditional rendering
- API endpoints ready for permission checks

**Planned Roles:**
- Admin: Full access
- Manager: Product, stock, reports
- Sales: Sales, orders, customer management
- Warehouse: Stock entry/exit only

## Data Integrity & Validation

### Database Constraints
- Foreign key constraints on all relationships
- Unique constraints on variant combinations
- Check constraints: stock >= 0, prices > 0
- NOT NULL constraints on required fields

### Application-Level Validation
- Input sanitization
- Business rule validation before database operations
- Transaction management for multi-step operations
- Rollback on any failure in transaction

### Error Handling Strategy
- Descriptive error messages for users
- Detailed logging for debugging
- Graceful degradation
- Transaction rollback on failures

## Error Handling

### Error Handling Strategy
- Descriptive error messages for users
- Detailed logging for debugging
- Graceful degradation
- Transaction rollback on failures

### Common Error Scenarios
- Yetersiz stok → Hangi ürünlerde eksik olduğunu belirt
- Geçersiz varyant → Hata mesajı
- Transaction hatası → Rollback ve kullanıcıya bildir
- Validation hatası → Detaylı alan bazlı hata mesajları

## Correctness Properties

### Property 1: Stock Non-Negativity
**Validates: Requirements 6, 20**

Stock quantity must never become negative. The system SHALL reject any StockExit operation that would result in negative stock.

### Property 2: Transaction Atomicity
**Validates: Requirements 9, 12, 13, 20**

All multi-step operations (Sale, ReservationOrder, Return) must complete atomically or rollback entirely.

### Property 3: Referential Integrity
**Validates: Requirements 1, 20**

All foreign key relationships must remain valid. Deletion of referenced entities must be prevented.

### Property 4: Stock Calculation Accuracy
**Validates: Requirements 7, 20**

Stock quantity must always equal: SUM(StockEntry.quantity) - SUM(StockExit.quantity)

### Property 5: Price Consistency
**Validates: Requirements 9**

Sale prices recorded in SaleItem must match ProductVariant.sale_price at the time of sale.

## Performance Considerations

### Database Optimization
- Indexes on frequently queried fields:
  - Product.name, Product.category
  - ProductVariant.sku
  - Sale.sale_date, Sale.customer_id
  - Stock.variant_id
- Composite indexes for variant uniqueness
- Query optimization for reports

### Caching Strategy
- Product catalog caching
- Stock levels caching (with invalidation on updates)
- Report results caching (time-based expiration)

### Search Optimization
- Full-text search on product names
- Debounced search input (500ms)
- Paginated results for large datasets

## Deployment Architecture

### Application Layers
```
┌─────────────────────────────────────┐
│      Load Balancer (Optional)       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Web Server / API Server        │
│   (Node.js / .NET / Java / Python)  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Database Server                │
│   (PostgreSQL / MySQL / SQL Server) │
└─────────────────────────────────────┘
```

### Backup Strategy
- Daily automated database backups
- Transaction log backups (for point-in-time recovery)
- Backup retention: 30 days minimum

## Testing Strategy

### Unit Tests
- Business logic validation
- Calculation accuracy (stock, totals)
- Data validation rules

### Integration Tests
- API endpoint testing
- Database transaction testing
- Stock update workflows

### UI Tests
- Sales workflow end-to-end
- Responsive design validation
- Touch interaction testing (tablet)

### Performance Tests
- Concurrent user simulation
- Large dataset handling
- Report generation performance
