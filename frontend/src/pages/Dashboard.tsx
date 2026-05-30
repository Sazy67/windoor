import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../App';

const fmt = (v: number) =>
  v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Avatar({ name }: { name: string }) {
  const colors = ['bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500','bg-red-500'];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`w-8 h-8 rounded-full ${colors[idx]} flex items-center justify-center flex-shrink-0`}>
      <span className="text-white text-xs font-bold">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

interface KpiCardProps { label: string; value: string; sub: string; accent: string; bg: string; valueColor: string; icon: string; onClick?: () => void; }
function KpiCard({ label, value, sub, accent, bg, valueColor, icon, onClick }: KpiCardProps) {
  return (
    <div onClick={onClick} className={`${bg} border border-gray-100 rounded-xl p-4 border-l-4 ${accent} flex items-center justify-between gap-3 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${valueColor}`}>{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      <span className="text-3xl opacity-70 flex-shrink-0">{icon}</span>
    </div>
  );
}

interface AlertCardProps { label: string; count: number; sub: string; color: 'yellow'|'red'|'orange'|'blue'; icon: string; onClick: () => void; }
function AlertCard({ label, count, sub, color, icon, onClick }: AlertCardProps) {
  const styles = {
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-500', text: 'text-yellow-800' },
    red:    { bg: 'bg-red-50',    border: 'border-red-300',    badge: 'bg-red-500',    text: 'text-red-800'    },
    orange: { bg: 'bg-orange-50', border: 'border-orange-300', badge: 'bg-orange-500', text: 'text-orange-800' },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-300',   badge: 'bg-blue-500',   text: 'text-blue-800'   },
  }[color];
  return (
    <div onClick={onClick} className={`${styles.bg} border ${styles.border} rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between`}>
      <div>
        <p className={`text-sm font-semibold ${styles.text}`}>{icon} {label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
      <span className={`${styles.badge} text-white text-lg font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0`}>{count}</span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t, lang } = useLang();

  const { data: summary } = useQuery({ queryKey: ['dashboard-summary'], queryFn: () => reportApi.getDashboardSummary().then(r => r.data), refetchInterval: 30000 });
  const { data: recentSales, isLoading: loadingSales } = useQuery({ queryKey: ['recent-sales'], queryFn: () => reportApi.getRecentSales(8).then(r => r.data), refetchInterval: 30000 });
  const { data: stockValue } = useQuery({ queryKey: ['stockValue'], queryFn: () => reportApi.getStockValue().then(r => r.data) });

  const today = new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const maxCatQty = Math.max(1, ...(stockValue?.byCategory?.map((c: any) => c.totalQuantity) ?? []));
  const catColors = ['bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500','bg-pink-500'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{t.dashboard.title}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{today}</p>
        </div>
        <button onClick={() => navigate('/sales')} className="btn-primary px-5 py-2.5 text-sm font-semibold">{t.dashboard.newSale}</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={t.dashboard.today} value={fmt(summary?.salesToday?.total || 0)} sub={`${summary?.salesToday?.count || 0} ${t.dashboard.transactions}`} accent="border-green-500" bg="bg-green-50" valueColor="text-green-700" icon="💰" onClick={() => navigate('/sales/history')} />
        <KpiCard label={t.dashboard.thisWeek} value={fmt(summary?.salesThisWeek?.total || 0)} sub={`${summary?.salesThisWeek?.count || 0} ${t.dashboard.transactions}`} accent="border-blue-500" bg="bg-blue-50" valueColor="text-blue-700" icon="📅" onClick={() => navigate('/sales/history')} />
        <KpiCard label={t.dashboard.thisMonth} value={fmt(summary?.salesThisMonth?.total || 0)} sub={`${summary?.salesThisMonth?.count || 0} ${t.dashboard.transactions}`} accent="border-indigo-500" bg="bg-indigo-50" valueColor="text-indigo-700" icon="📊" onClick={() => navigate('/reports')} />
        <KpiCard label={t.dashboard.stockValue} value={fmt(summary?.totalStockValue || 0)} sub={`${(summary?.totalStockItems || 0).toLocaleString('tr-TR')} ${t.dashboard.items}`} accent="border-purple-500" bg="bg-purple-50" valueColor="text-purple-700" icon="💎" onClick={() => navigate('/stock')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">{t.dashboard.recentSales}</h2>
              <button onClick={() => navigate('/sales/history')} className="text-xs text-blue-600 hover:text-blue-700 font-medium">{t.dashboard.viewAll}</button>
            </div>
            <div className="divide-y max-h-72 overflow-y-auto">
              {loadingSales ? (
                <div className="px-5 py-10 text-center text-gray-400 text-sm">{t.common.loading}</div>
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
                            {item.variant.product.name}{item.variant.color ? ` · ${item.variant.color}` : ''}{` · ${item.variant.dimension}`}
                            <span className="text-gray-400 ml-1">×{item.quantity}</span>
                          </span>
                        ))}
                        {sale.items.length > 2 && <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">+{sale.items.length - 2}</span>}
                      </div>
                    </div>
                    <p className="font-bold text-green-600 text-sm flex-shrink-0">{fmt(sale.totalAmount)}</p>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-gray-400">
                  <p className="text-3xl mb-2">💰</p>
                  <p className="text-sm">{t.common.noData}</p>
                  <button onClick={() => navigate('/sales')} className="mt-2 text-sm text-blue-600 hover:underline">{t.dashboard.newSale} →</button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">🏆 {t.dashboard.topSelling}</h3>
                <button onClick={() => navigate('/reports')} className="text-xs text-blue-600 hover:text-blue-700 font-medium">{t.dashboard.report}</button>
              </div>
              <div className="divide-y">
                {summary?.topProductsThisMonth && summary.topProductsThisMonth.length > 0 ? (
                  summary.topProductsThisMonth.map((p: any, i: number) => (
                    <div key={i} className="px-5 py-2.5 flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i===0?'bg-yellow-400 text-white':i===1?'bg-gray-300 text-gray-700':i===2?'bg-orange-400 text-white':'bg-gray-100 text-gray-500'}`}>{i+1}</span>
                      <p className="text-sm text-gray-800 flex-1 truncate">{p.name}</p>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{p.qty} {t.dashboard.items}</p>
                        <p className="text-xs text-green-600">{fmt(p.revenue)}</p>
                      </div>
                    </div>
                  ))
                ) : <div className="px-5 py-6 text-center text-gray-400 text-sm">{t.dashboard.noSalesThisMonth}</div>}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900 text-sm">📦 {t.dashboard.categoryDist}</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                {stockValue?.byCategory && stockValue.byCategory.length > 0 ? (
                  stockValue.byCategory.sort((a: any, b: any) => b.totalQuantity - a.totalQuantity).map((cat: any, i: number) => (
                    <div key={cat.category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{cat.category}</span>
                        <span className="text-gray-500">{cat.totalQuantity} {t.dashboard.items}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div className={`${catColors[i % catColors.length]} h-2.5 rounded-full transition-all`} style={{ width: `${Math.max(4, (cat.totalQuantity / maxCatQty) * 100)}%` }} />
                      </div>
                    </div>
                  ))
                ) : <p className="text-sm text-gray-400 text-center py-4">{t.dashboard.noStockData}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.common.status}</h2>
            <AlertCard label={t.dashboard.criticalStock} count={summary?.criticalStockCount || 0} sub={t.dashboard.minLevel} color="yellow" icon="⚠️" onClick={() => navigate('/stock?status=Low')} />
            <AlertCard label={t.dashboard.outOfStock} count={summary?.outOfStockCount || 0} sub={t.dashboard.outOfStockVariants} color="red" icon="🔴" onClick={() => navigate('/stock?status=Out_Of_Stock')} />
            <AlertCard label={t.dashboard.activeOrders} count={summary?.activeOrders || 0} sub={`${summary?.customOrdersPending || 0} ${t.dashboard.production} · ${summary?.reservationsPending || 0} ${t.dashboard.reservation}`} color="orange" icon="📝" onClick={() => navigate('/orders')} />
            <AlertCard label={t.dashboard.totalCustomers} count={summary?.totalCustomers || 0} sub={t.dashboard.registeredCustomers} color="blue" icon="👤" onClick={() => navigate('/customers')} />
          </div>

          {summary?.criticalStockList && summary.criticalStockList.length > 0 && (
            <div className="bg-white border border-yellow-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100 flex items-center justify-between">
                <h3 className="font-semibold text-yellow-900 text-sm">⚠️ {t.dashboard.criticalStockDetail}</h3>
                <button onClick={() => navigate('/stock')} className="text-xs text-yellow-700 hover:underline font-medium">{t.dashboard.viewAll2}</button>
              </div>
              <div className="divide-y">
                {summary.criticalStockList.map((item: any) => (
                  <div key={item.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-yellow-50 cursor-pointer" onClick={() => navigate('/stock')}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-400">{[item.color, item.dimension].filter(Boolean).join(' · ')}</p>
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
