# Windoor - Stok ve Satış Yönetim Sistemi

Kapı, pencere, panel ve aksesuar satışı yapan işletmeler için kapsamlı stok ve satış yönetim sistemi.

## Özellikler

- ✅ Varyantlı ürün yönetimi (renk, ölçü, tip, malzeme)
- ✅ Stok takibi (giriş, çıkış, anlık durum)
- ✅ Renk kodlu stok durumu (Yeşil/Sarı/Kırmızı/Siyah)
- ✅ İkinci kalite ürün takibi
- ✅ Satış yönetimi (sepet arayüzü - SAT / SİPARİŞ OLUŞTUR)
- ✅ Sipariş yönetimi (özel üretim + rezervasyon)
- ✅ İade yönetimi
- ✅ Raporlama (en çok satan, stokta bekleyen, aylık satış)
- ✅ Responsive tasarım (masaüstü + tablet)
- ✅ Kullanıcı takibi (gelecek yetkilendirme için altyapı)

## Hızlı Başlangıç

### Gereksinimler
- Node.js 18+
- npm 9+

### 1. Bağımlılıkları Yükle
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Veritabanını Oluştur
```bash
cd backend
npx prisma migrate dev
npm run db:seed
```

### 3. Uygulamayı Başlat

**Backend** (Terminal 1):
```bash
cd backend
npm run dev
```

**Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- Varsayılan kullanıcı: **admin**

## Proje Yapısı

```
windoor/
├── backend/
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   │   ├── products.ts
│   │   │   ├── variants.ts
│   │   │   ├── stock.ts
│   │   │   ├── sales.ts
│   │   │   ├── orders.ts
│   │   │   ├── returns.ts
│   │   │   ├── reports.ts
│   │   │   ├── customers.ts
│   │   │   └── users.ts
│   │   ├── utils/
│   │   │   └── helpers.ts
│   │   └── index.ts
│   └── prisma/
│       ├── schema.prisma   # Veritabanı şeması
│       └── seed.ts         # Örnek veriler
├── frontend/
│   └── src/
│       ├── components/
│       │   └── Layout.tsx
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Login.tsx
│       │   ├── Products.tsx
│       │   ├── Stock.tsx
│       │   ├── Sales.tsx
│       │   ├── Orders.tsx
│       │   ├── Returns.tsx
│       │   └── Reports.tsx
│       └── lib/
│           └── api.ts      # API client
└── .kiro/specs/            # Proje gereksinimleri ve tasarım
```

## API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | /api/products | Ürün listesi |
| POST | /api/products | Yeni ürün |
| POST | /api/products/:id/variants | Varyant ekle |
| GET | /api/stock | Stok listesi |
| GET | /api/stock/critical | Kritik stok |
| POST | /api/stock/entry | Stok girişi |
| POST | /api/stock/exit | Stok çıkışı |
| POST | /api/sales | Satış oluştur |
| GET | /api/sales | Satış listesi |
| POST | /api/orders/custom | Özel üretim siparişi |
| POST | /api/orders/reservation | Rezervasyon siparişi |
| PUT | /api/orders/:id/status | Sipariş durumu güncelle |
| POST | /api/returns | İade kaydet |
| GET | /api/reports/best-selling | En çok satanlar |
| GET | /api/reports/slow-moving | Stokta bekleyenler |
| GET | /api/reports/monthly-sales | Aylık satış |
| GET | /api/reports/stock-value | Stok değeri |

## Teknoloji Stack

**Backend:** Node.js · Express · TypeScript · Prisma ORM · SQLite

**Frontend:** React · TypeScript · Vite · Tailwind CSS · React Query · React Router
