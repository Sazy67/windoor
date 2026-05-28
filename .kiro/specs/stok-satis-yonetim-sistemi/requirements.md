# Requirements Document

## Introduction

Bu belge, kapı, pencere, panel ve aksesuar satışı yapan bir işletme için geliştirilecek kapsamlı stok ve satış yönetim sisteminin gereksinimlerini tanımlar. Sistem, ürün yönetimi, stok takibi, satış işlemleri, sipariş yönetimi ve raporlama işlevlerini içerir. Sistem, varyantlı ürün yapısını destekler ve hem masaüstü hem de tablet cihazlardan erişilebilir olacaktır.

## Glossary

- **System**: Stok ve Satış Yönetim Sistemi
- **Product**: Satışa sunulan kapı, pencere, panel veya aksesuar
- **Variant**: Bir ürünün renk, ölçü, tip gibi özelliklerine göre farklı versiyonu
- **Stock**: Depoda mevcut olan ürün miktarı
- **Stock_Entry**: Depoya ürün girişi işlemi
- **Stock_Exit**: Depodan ürün çıkışı işlemi
- **Sale**: Müşteriye ürün satışı ve stoktan düşme işlemi
- **Order**: Müşteri siparişi (özel üretim veya rezervasyon)
- **Custom_Order**: Özel üretim siparişi
- **Reservation_Order**: Stoktan rezervasyon siparişi
- **Customer**: Ürün satın alan veya sipariş veren müşteri
- **Minimum_Stock_Level**: Ürün için tanımlanan minimum stok seviyesi
- **Critical_Stock**: Stok seviyesinin minimum seviyeye yaklaştığı durum
- **End_Of_Life**: Artık satılmayacak ürün durumu
- **Return**: Müşteriden geri alınan ürün
- **Second_Quality**: Hatalı veya kusurlu olarak işaretlenen ürün
- **Cart**: Satış ekranında seçilen ürünlerin geçici listesi
- **Report**: Satış, stok veya ürün performansı hakkında özet bilgi
- **User**: Sistemi kullanan personel
- **Authorization**: Kullanıcı yetkilendirme mekanizması (gelecek geliştirme için)

## Requirements

### Requirement 1: Ürün Tanımlama ve Yönetimi

**User Story:** As a store manager, I want to define products with their properties, so that I can manage inventory accurately.

#### Acceptance Criteria

1. THE System SHALL allow creation of a Product with name, category, dimensions, color, brand, and sale price
2. THE System SHALL support the following product categories: Gate, Window, Panel, Accessory, Consumable
3. THE System SHALL store multiple Variants for each Product based on color, dimension, and type combinations
4. WHEN a Product is created, THE System SHALL assign a unique identifier to the Product
5. THE System SHALL allow updating Product properties including name, category, dimensions, color, brand, and sale price
6. THE System SHALL allow deletion of a Product only if no Stock or Sale records reference it

### Requirement 2: Kapı (Gate) Ürün Varyantları

**User Story:** As a store manager, I want to define gate products with their specific variants, so that I can track different gate types accurately.

#### Acceptance Criteria

1. THE System SHALL support two gate subcategories: Interior_Gate and Exterior_Gate
2. WHERE Product category is Interior_Gate, THE System SHALL support colors: black, brown, grey, white, anthracite
3. WHERE Product category is Exterior_Gate, THE System SHALL support types: Oak_Big_Glass, Black_White_Small_Glass, Black_No_Glass, Black_Brown_Small_Glass, Grey_Long_Glass, Black_Brown_No_Glass, Old_Door_45x84
4. THE System SHALL store dimension information for each Gate Variant
5. THE System SHALL create unique Stock records for each Gate Variant combination

### Requirement 3: Pencere (Window) Ürün Varyantları

**User Story:** As a store manager, I want to define window products with their specific variants, so that I can track different window types accurately.

#### Acceptance Criteria

1. THE System SHALL support window types: Sliding, Folding, French, Regular, Fixed, Tilt_And_Turn
2. THE System SHALL support window colors: Black, White, Black_Outside_White_Inside
3. WHERE window type is Tilt_And_Turn, THE System SHALL support dimensions: 24x36, 24x48, 24x60, 24x60_grids, 28x48, 28x54, 28x60, 30x54, 30x60, 32x54, 32x60, 36x48, 36x60, 32x62
4. WHERE window type is Fixed, THE System SHALL support dimensions: 24x36, 24x60, 36x36, 36x58, 48x48, 60x60
5. WHERE window type is Sliding_Regular_Double_Patio_Door, THE System SHALL support material types: Aluminum_Black, PVC_Black_White
6. WHERE window type is Sliding_Regular_Double_Patio_Door AND material is Aluminum_Black, THE System SHALL support dimensions: 72x80, 96x80
7. WHERE window type is Sliding_Regular_Double_Patio_Door AND material is PVC_Black_White, THE System SHALL support dimensions: 72x80, 96x80
8. WHERE window type is French_Door, THE System SHALL support materials: Aluminum_Black, PVC_White with dimension 72x80
9. THE System SHALL create unique Stock records for each Window Variant combination

### Requirement 4: Panel ve Aksesuar Ürün Varyantları

**User Story:** As a store manager, I want to define panel and accessory products, so that I can track all product types in inventory.

#### Acceptance Criteria

1. THE System SHALL support panel subcategories: Interior_Panel and Exterior_Panel
2. WHERE Product category is Interior_Panel, THE System SHALL support types: Acoustic and PVC
3. WHERE Interior_Panel type is Acoustic, THE System SHALL support dimension 2x9
4. WHERE Interior_Panel type is PVC, THE System SHALL support dimension 4x9
5. THE System SHALL support accessory types: Door_Handle, Window_Handle, Hinge, Mosquito_Net, Blind
6. THE System SHALL support consumable type: PVC_Adhesive
7. THE System SHALL create unique Stock records for each Panel and Accessory Variant

### Requirement 5: Stok Giriş İşlemi

**User Story:** As a warehouse staff, I want to record product entries, so that I can increase inventory levels.

#### Acceptance Criteria

1. THE System SHALL allow creation of a Stock_Entry with Product Variant, quantity, and entry date
2. WHEN a Stock_Entry is created, THE System SHALL increase the Stock quantity for the specified Product Variant
3. THE System SHALL record the timestamp of each Stock_Entry
4. THE System SHALL allow marking Stock_Entry as Second_Quality for defective products
5. WHERE Stock_Entry is marked as Second_Quality, THE System SHALL track it separately from regular Stock

### Requirement 6: Stok Çıkış İşlemi

**User Story:** As a warehouse staff, I want to record product exits, so that I can decrease inventory levels.

#### Acceptance Criteria

1. THE System SHALL allow creation of a Stock_Exit with Product Variant, quantity, and exit date
2. WHEN a Stock_Exit is created, THE System SHALL decrease the Stock quantity for the specified Product Variant
3. IF Stock quantity is insufficient for Stock_Exit, THEN THE System SHALL prevent the Stock_Exit and display an error message
4. THE System SHALL record the timestamp of each Stock_Exit
5. THE System SHALL record the reason for Stock_Exit: Sale, Order_Fulfillment, Damage, or Other

### Requirement 7: Anlık Stok Görüntüleme

**User Story:** As a store manager, I want to view current stock levels, so that I can make informed decisions about inventory.

#### Acceptance Criteria

1. THE System SHALL display current Stock quantity for each Product Variant
2. THE System SHALL calculate Stock quantity as sum of Stock_Entry minus sum of Stock_Exit for each Product Variant
3. THE System SHALL display Stock status with color coding based on stock level
4. WHERE Stock quantity is above Minimum_Stock_Level, THE System SHALL display status in green
5. WHERE Stock quantity is at or below Minimum_Stock_Level AND above zero, THE System SHALL display status in yellow
6. WHERE Stock quantity is zero, THE System SHALL display status in red
7. WHERE Product is marked as End_Of_Life, THE System SHALL display status in black
8. THE System SHALL allow filtering Stock view by category, color, dimension, or brand

### Requirement 8: Minimum Stok Uyarısı

**User Story:** As a store manager, I want to receive alerts for low stock, so that I can reorder products in time.

#### Acceptance Criteria

1. THE System SHALL allow setting a Minimum_Stock_Level for each Product Variant
2. WHEN Stock quantity reaches or falls below Minimum_Stock_Level, THE System SHALL mark the Product Variant as Critical_Stock
3. THE System SHALL display a list of all Product Variants in Critical_Stock status
4. THE System SHALL highlight Critical_Stock items in yellow on stock displays

### Requirement 9: Satış İşlemi

**User Story:** As a sales staff, I want to record sales transactions, so that I can complete customer purchases and update inventory.

#### Acceptance Criteria

1. THE System SHALL allow creation of a Sale with Customer name, selected Product Variants, quantities, total price, date, and optional notes
2. WHEN a Sale is created, THE System SHALL create Stock_Exit records for each Product Variant in the Sale
3. THE System SHALL calculate total price as sum of (quantity × sale price) for each Product Variant in the Sale
4. THE System SHALL record the timestamp of each Sale
5. THE System SHALL allow adding manual notes to a Sale record
6. WHEN a Sale is completed, THE System SHALL decrease Stock quantity for all Product Variants in the Sale

### Requirement 10: Satış Ekranı ve Sepet İşlevselliği

**User Story:** As a sales staff, I want to use an intuitive sales interface, so that I can quickly process customer purchases.

#### Acceptance Criteria

1. THE System SHALL display a product search interface on the left side of the sales screen
2. WHEN a User types a product name, THE System SHALL display a filtered list of matching Products
3. WHEN a User selects a Product from the list, THE System SHALL display available Variants for selection
4. WHEN a User selects a Variant, THE System SHALL add it to the Cart on the right side of the screen
5. THE System SHALL display Cart contents with Product Variant name, quantity, unit price, and line total
6. THE System SHALL calculate and display Cart total as sum of all line totals
7. THE System SHALL provide a "SAT" button that creates a Sale and decreases Stock
8. THE System SHALL provide a "SİPARİŞ OLUŞTUR" button that creates an Order without decreasing Stock immediately
9. THE System SHALL allow adjusting quantity for each item in the Cart
10. THE System SHALL allow removing items from the Cart

### Requirement 11: Özel Üretim Siparişi

**User Story:** As a sales staff, I want to create custom production orders, so that I can fulfill customer requests for made-to-order products.

#### Acceptance Criteria

1. THE System SHALL allow creation of a Custom_Order with Customer name, Product type, dimensions, delivery deadline, and status
2. THE System SHALL support Custom_Order statuses: Order_Received, In_Production, Completed
3. WHEN a Custom_Order is created, THE System SHALL set initial status to Order_Received
4. THE System SHALL allow updating Custom_Order status to In_Production or Completed
5. THE System SHALL display delivery deadline for each Custom_Order
6. THE System SHALL allow adding manual notes to a Custom_Order
7. WHEN a Custom_Order status is set to Completed, THE System SHALL not decrease Stock quantity

### Requirement 12: Rezervasyon Siparişi

**User Story:** As a sales staff, I want to create reservation orders for stock items, so that I can reserve products for customers who made advance payments.

#### Acceptance Criteria

1. THE System SHALL allow creation of a Reservation_Order with Customer name, Product Variants, quantities, and reservation date
2. WHEN a Reservation_Order is created, THE System SHALL create Stock_Exit records for reserved Product Variants
3. WHEN a Reservation_Order is created, THE System SHALL decrease Stock quantity for all Product Variants in the order
4. THE System SHALL allow adding manual notes to a Reservation_Order
5. THE System SHALL track Reservation_Order status: Reserved, Delivered
6. WHEN a Reservation_Order is delivered, THE System SHALL update status to Delivered

### Requirement 13: İade İşlemi

**User Story:** As a sales staff, I want to process product returns, so that I can add returned items back to inventory.

#### Acceptance Criteria

1. THE System SHALL allow creation of a Return with Customer name, Product Variants, quantities, return date, and reason
2. WHEN a Return is created, THE System SHALL create Stock_Entry records for returned Product Variants
3. WHEN a Return is created, THE System SHALL increase Stock quantity for all Product Variants in the Return
4. THE System SHALL allow marking Return items as Second_Quality if they are defective
5. WHERE Return items are marked as Second_Quality, THE System SHALL add them to Second_Quality Stock

### Requirement 14: En Çok Satan Ürünler Raporu

**User Story:** As a store manager, I want to view best-selling products, so that I can optimize inventory and marketing strategies.

#### Acceptance Criteria

1. THE System SHALL generate a report of Product Variants sorted by total quantity sold
2. THE System SHALL allow filtering the report by date range
3. THE System SHALL display Product Variant name, total quantity sold, and total revenue for each item
4. THE System SHALL calculate total quantity sold as sum of quantities from all Sale records for each Product Variant
5. THE System SHALL calculate total revenue as sum of (quantity × sale price) from all Sale records for each Product Variant

### Requirement 15: Stokta Bekleyen Ürünler Raporu

**User Story:** As a store manager, I want to view products waiting in stock, so that I can identify slow-moving inventory.

#### Acceptance Criteria

1. THE System SHALL generate a report of Product Variants with current Stock quantity greater than zero
2. THE System SHALL display Product Variant name, current Stock quantity, and days in stock
3. THE System SHALL calculate days in stock as difference between current date and most recent Stock_Entry date
4. THE System SHALL allow sorting the report by Stock quantity or days in stock
5. THE System SHALL allow filtering the report by category

### Requirement 16: Aylık Satış Raporu

**User Story:** As a store manager, I want to view monthly sales reports, so that I can track business performance over time.

#### Acceptance Criteria

1. THE System SHALL generate a monthly sales report showing total sales quantity and revenue for each month
2. THE System SHALL allow selecting a date range for the report
3. THE System SHALL display month, total quantity sold, total revenue, and number of transactions
4. THE System SHALL calculate total quantity sold as sum of all Sale quantities in the month
5. THE System SHALL calculate total revenue as sum of all Sale totals in the month
6. THE System SHALL calculate number of transactions as count of all Sale records in the month

### Requirement 17: Çoklu Cihaz Desteği

**User Story:** As a User, I want to access the system from desktop and tablet devices, so that I can work flexibly.

#### Acceptance Criteria

1. THE System SHALL provide a responsive user interface that adapts to desktop screen sizes
2. THE System SHALL provide a responsive user interface that adapts to tablet screen sizes
3. THE System SHALL maintain full functionality on both desktop and tablet devices
4. THE System SHALL optimize touch interactions for tablet devices
5. THE System SHALL maintain consistent data across all devices accessing the System

### Requirement 18: Gelecek Yetkilendirme Desteği

**User Story:** As a system administrator, I want the system architecture to support future authorization features, so that I can control user access when needed.

#### Acceptance Criteria

1. THE System SHALL implement a User entity with unique identifier
2. THE System SHALL associate each Sale, Order, Stock_Entry, and Stock_Exit with the User who created it
3. THE System SHALL design data structures to accommodate future role-based access control
4. THE System SHALL design user interface to accommodate future permission-based feature visibility

### Requirement 19: Ürün Arama ve Filtreleme

**User Story:** As a User, I want to search and filter products efficiently, so that I can quickly find the items I need.

#### Acceptance Criteria

1. WHEN a User enters text in the product search field, THE System SHALL filter Products by name containing the search text
2. THE System SHALL display search results within 500 milliseconds of user input
3. THE System SHALL allow filtering Products by category
4. THE System SHALL allow filtering Products by color
5. THE System SHALL allow filtering Products by dimension
6. THE System SHALL allow filtering Products by brand
7. THE System SHALL display the count of matching Products for each filter applied

### Requirement 20: Veri Bütünlüğü ve Tutarlılık

**User Story:** As a system administrator, I want the system to maintain data integrity, so that inventory records remain accurate.

#### Acceptance Criteria

1. THE System SHALL ensure Stock quantity cannot become negative
2. THE System SHALL ensure all Sale records reference valid Product Variants
3. THE System SHALL ensure all Order records reference valid Customers
4. THE System SHALL maintain referential integrity between Stock_Entry, Stock_Exit, and Product Variant records
5. IF a data operation would violate integrity constraints, THEN THE System SHALL reject the operation and display an error message
6. THE System SHALL log all Stock changes with timestamp and User information for audit purposes
