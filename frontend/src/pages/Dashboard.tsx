import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const fmt = (v: number) =>
  v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

/** Müşteri adından renkli avatar baş harfi */
function Avatar({ name }: { name: string }) {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`w-8 h-8 rounded-full ${colors[idx]} flex items-center justify-center flex-shrink-0`}>
      <span className="text-white text-xs font-bold">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

/** Üst KPI kartı — sol kenarda renkli şerit */
interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  accent: string;   // Tailwind border-l rengi, örn: 'border-green-500'
  bg: string;       // Tailwind bg rengi, örn: 'bg-green-50'
  valueColor: string;
  icon: string;
  onClick?: () => void;
}

function KpiCard({ label, value, sub, accent, bg, valueColor, icon, onClick }: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={`${bg} border border-gray-100 rounded-xl p-4 border-l-4 ${accent} flex items-center justify-between gap-3 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${valueColor}`}>{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      <span className="text-3xl opacity-70 flex-shrink-0">{icon}</span>
    </div>
  );
}

/** Uyarı badge kartı */
interface AlertCardProps {
  label: string;
  count: number;
  sub: string;
  color: 'yellow' | 'red' | 'orange' | 'blue';
  icon: string;
  onClick: () => void;
}

function AlertCard({ label, count, sub, color, icon, onClick }: AlertCardProps) {
  const styles = {
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-500', text: 'text-yellow-800' },
    red:    { bg: 'bg-red-50',    border: 'border-red-300',    badge: 'bg-red-500',    text: 'text-red-800'    },
    orange: { bg: 'bg-orange-50', border: 'border-orange-300', badge: 'bg-orange-500', text: 'text-orange-800' },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-300',   badge: 'bg-blue-500',   text: 'text-blue-800'   },
  }[color];

  return (
    <div
      onClick={onClick}
      className={`${styles.bg} border ${styles.border} rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between`}
    >
      <div>
        <p className={`text-sm font-semibold ${styles.text}`}>{icon} {label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
      <span className={`${styles.badge} text-white text-lg font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0`}>
        {count}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => reportApi.getDashboardSummary().then(res => res.data),
    refetchInterval: 30000,
  });

  const { data: recentSales, isLoading: loadingSales } = useQuery({
    queryKey: ['recent-sales'],
    queryFn: () => reportApi.getRecentSales(8).then(res => res.data),
    refetchInterval: 30000,
  });

  const { data: stockValue } = useQuery({
    queryKey: ['stockValue'],
    queryFn: () => reportApi.getStockValue().then(res => res.data),
  });

  const today = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const maxCatQty = Math.max(
    1,
    ...(stockValue?.byCategory?.map((c: any) => c.totalQuantity) ?? [])
  );

  const catColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">{today}</p>
        </div>
        <button
          onClick={() => navigate('/sales')}
          className="btn-primary px-5 py-2.5 text-sm font-semibold"
        >
          💰 Yeni Satış
        </button>
      </div>

      {/* ── KPI KARTLARI ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Bugün"
          value={fmt(summary?.salesToday?.total || 0)}
          sub={`${summary?.salesToday?.count || 0} işlem`}
          accent="border-green-500"
          bg="bg-green-50"
          valueColor="text-green-700"
          icon="💰"
          onClick={() => navigate('/sales/history')}
        />
        <KpiCard
          label="Bu Hafta"
          value={fmt(summary?.salesThisWeek?.total || 0)}
          sub={`${summary?.salesThisWeek?.count || 0} işlem`}
          accent="border-blue-500"
          bg="bg-blue-50"
          valueColor="text-blue-700"
          icon="📅"
          onClick={() => navigate('/sales/history')}
        />
        <KpiCard
          label="Bu Ay"
          value={fmt(summary?.salesThisMonth?.total || 0)}
          sub={`${summary?.salesThisMonth?.count || 0} işlem`}
          accent="border-indigo-500"
          bg="bg-indigo-50"
          valueColor="text-indigo-700"
          icon="📊"
          onClick={() => navigate('/reports')}
        />
        <KpiCard
          label="Stok Değeri"
          value={fmt(summary?.totalStockValue || 0)}
          sub={`${(summary?.totalStockItems || 0).toLocaleString('tr-TR')} adet`}
          accent="border-purple-500"
          bg="bg-purple-50"
          valueColor="text-purple-700"
          icon="💎"
          onClick={() => navigate('/stock')}
        />
      </div>

      {/* ── ANA İÇERİK ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SOL + ORTA: Son Satışlar (2/3) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Son Satışlar */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">Son Satışlar</h2>
              <button
                onClick={() => navigate('/sales/history')}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Tümünü Gör →
              </button>
            </div>
            <div className="divide-y max-h-72 overflow-y-auto">
              {loadingSales ? (
                <div className="px-5 py-10 text-center text-gray-400 text-sm">Yükleniyor...</div>
              ) : recentSales && recentSales.length > 0 ? (
                recentSales.map((sale: any) => (
                  <div key={sale.id} className="px-5 py-3 hover:bg-gray-50 flex items-center gap-3">
                    <Avatar name={sale.customer.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{sale.customer.name}</p>
                        <span className="text-xs text-gray-400">{fmtDate(sale.saleDate)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {sale.items.slice(0, 2).map((item: any) => (
                          <span key={item.id} className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                            {item.variant.product.name}
                            {item.variant.color ? ` · ${item.variant.color}` : ''}
                            {` · ${item.variant.dimension}`}
                            <span className="text-gray-400 ml-1">×{item.quantity}</span>
                          </span>
                        ))}
                        {sale.items.length > 2 && (
                          <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                            +{sale.items.length - 2} daha
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="font-bold text-green-600 text-sm flex-shrink-0">{fmt(sale.totalAmount)}</p>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-gray-400">
                  <p className="text-3xl mb-2">💰</p>
                  <p className="text-sm">Henüz satış kaydı yok</p>
                  <button onClick={() => navigate('/sales')}
                    className="mt-2 text-sm text-blue-600 hover:underline">
                    İlk satışı yap →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Alt satır: En çok satanlar + Kategori dağılımı */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* En Çok Satanlar */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">🏆 Bu Ay En Çok Satanlar</h3>
                <button onClick={() => navigate('/reports')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Rapor →
                </button>
              </div>
              <div className="divide-y">
                {summary?.topProductsThisMonth && summary.topProductsThisMonth.length > 0 ? (
                  summary.topProductsThisMonth.map((p: any, i: number) => (
                    <div key={i} className="px-5 py-2.5 flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? 'bg-yellow-400 text-white' :
                        i === 1 ? 'bg-gray-300 text-gray-700' :
                        i === 2 ? 'bg-orange-400 text-white' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {i + 1}
                      </span>
                      <p className="text-sm text-gray-800 flex-1 truncate">{p.name}</p>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{p.qty} adet</p>
                        <p className="text-xs text-green-600">{fmt(p.revenue)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-6 text-center text-gray-400 text-sm">Bu ay satış yok</div>
                )}
              </div>
            </div>

            {/* Kategori Dağılımı */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900 text-sm">📦 Kategori Dağılımı</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                {stockValue?.byCategory && stockValue.byCategory.length > 0 ? (
                  stockValue.byCategory
                    .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
                    .map((cat: any, i: number) => (
                      <div key={cat.category}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700">{cat.category}</span>
                          <span className="text-gray-500">{cat.totalQuantity} adet</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div
                            className={`${catColors[i % catColors.length]} h-2.5 rounded-full transition-all`}
                            style={{ width: `${Math.max(4, (cat.totalQuantity / maxCatQty) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">Stok verisi yok</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ KOLON: Uyarılar + Kritik Stok (1/3) */}
        <div className="space-y-4">

          {/* Uyarı Kartları */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Durum</h2>

            <AlertCard
              label="Kritik Stok"
              count={summary?.criticalStockCount || 0}
              sub="minimum seviyede ürün"
              color="yellow"
              icon="⚠️"
              onClick={() => navigate('/stock?status=Low')}
            />
            <AlertCard
              label="Stok Tükendi"
              count={summary?.outOfStockCount || 0}
              sub="stoksuz varyant"
              color="red"
              icon="🔴"
              onClick={() => navigate('/stock?status=Out_Of_Stock')}
            />
            <AlertCard
              label="Aktif Sipariş"
              count={summary?.activeOrders || 0}
              sub={`${summary?.customOrdersPending || 0} üretim · ${summary?.reservationsPending || 0} rezervasyon`}
              color="orange"
              icon="📝"
              onClick={() => navigate('/orders')}
            />
            <AlertCard
              label="Toplam Müşteri"
              count={summary?.totalCustomers || 0}
              sub="kayıtlı müşteri"
              color="blue"
              icon="👤"
              onClick={() => navigate('/customers')}
            />
          </div>

          {/* Kritik Stok Listesi */}
          {summary?.criticalStockList && summary.criticalStockList.length > 0 && (
            <div className="bg-white border border-yellow-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100 flex items-center justify-between">
                <h3 className="font-semibold text-yellow-900 text-sm">⚠️ Kritik Stok Detayı</h3>
                <button onClick={() => navigate('/stock')}
                  className="text-xs text-yellow-700 hover:underline font-medium">
                  Tümü →
                </button>
              </div>
              <div className="divide-y">
                {summary.criticalStockList.map((item: any) => (
                  <div
                    key={item.id}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-yellow-50 cursor-pointer"
                    onClick={() => navigate('/stock')}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-400">
                        {[item.color, item.dimension].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-bold text-yellow-700">{item.quantity}</p>
                      <p className="text-xs text-gray-400">min {item.minimumStockLevel}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
