import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../lib/api';
import { useLang } from '../App';

type ReportType = 'best-selling' | 'slow-moving' | 'monthly-sales';

const fmt = (v: number) => v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

export default function Reports() {
  const { t } = useLang();
  const [reportType, setReportType] = useState<ReportType>('best-selling');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const { data: bestSelling, isLoading: loadingBest } = useQuery({
    queryKey: ['report-best-selling', startDate, endDate],
    queryFn: () => reportApi.getBestSelling({ startDate: startDate || undefined, endDate: endDate || undefined }).then(res => res.data),
    enabled: reportType === 'best-selling',
  });

  const { data: slowMoving, isLoading: loadingSlow } = useQuery({
    queryKey: ['report-slow-moving', filterCategory],
    queryFn: () => reportApi.getSlowMoving({ category: filterCategory || undefined }).then(res => res.data),
    enabled: reportType === 'slow-moving',
  });

  const { data: monthlySales, isLoading: loadingMonthly } = useQuery({
    queryKey: ['report-monthly', startDate, endDate],
    queryFn: () => reportApi.getMonthlySales({ startDate: startDate || undefined, endDate: endDate || undefined }).then(res => res.data),
    enabled: reportType === 'monthly-sales',
  });

  const categories = ['Gate', 'Window', 'Panel', 'Accessory', 'Consumable'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{t.reports.title}</h1>
        <p className="mt-1" style={{ color: 'var(--muted)' }}>{t.reports.subtitle}</p>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { value: 'best-selling', label: t.reports.bestSelling },
          { value: 'slow-moving', label: t.reports.slowMoving },
          { value: 'monthly-sales', label: t.reports.monthlySales },
        ].map(r => (
          <button key={r.value} onClick={() => setReportType(r.value as ReportType)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${reportType === r.value ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          {(reportType === 'best-selling' || reportType === 'monthly-sales') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>{t.reports.startDate}</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field w-auto" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>{t.reports.endDate}</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field w-auto" />
              </div>
            </>
          )}
          {reportType === 'slow-moving' && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>{t.common.category}</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field w-auto">
                <option value="">{t.reports.allCategories}</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {reportType === 'best-selling' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b"><h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{t.reports.bestSellingTitle}</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.reports.rank}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.reports.product}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.reports.colorDimension}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.reports.soldQty}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.reports.revenue}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingBest ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">{t.common.loading}</td></tr>
                ) : bestSelling && bestSelling.length > 0 ? (
                  bestSelling.map((item: any, index: number) => (
                    <tr key={item.variantId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-bold text-gray-400">#{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.color && `${item.color} - `}{item.dimension}</td>
                      <td className="px-4 py-3 text-right font-semibold">{item.totalQuantity}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">{fmt(item.totalRevenue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">{t.reports.noData}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'slow-moving' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b"><h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{t.reports.slowMovingTitle}</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.reports.product}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.common.category}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.reports.colorDimension}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.reports.stockQty}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.reports.daysInStock}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingSlow ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">{t.common.loading}</td></tr>
                ) : slowMoving && slowMoving.length > 0 ? (
                  slowMoving.map((item: any) => (
                    <tr key={item.variantId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.color && `${item.color} - `}{item.dimension}</td>
                      <td className="px-4 py-3 text-right font-semibold">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${item.daysInStock > 90 ? 'text-red-600' : item.daysInStock > 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {item.daysInStock} {t.reports.daysInStock.toLowerCase().includes('day') ? 'days' : 'gün'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">{t.reports.noData}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'monthly-sales' && (
        <div className="space-y-4">
          {monthlySales && monthlySales.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card text-center">
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.reports.totalTransactions}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text)' }}>{monthlySales.reduce((s: number, m: any) => s + m.transactionCount, 0)}</p>
              </div>
              <div className="card text-center">
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.reports.totalSoldQty}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text)' }}>{monthlySales.reduce((s: number, m: any) => s + m.totalQuantity, 0)}</p>
              </div>
              <div className="card text-center">
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.reports.totalRevenue}</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{fmt(monthlySales.reduce((s: number, m: any) => s + m.totalRevenue, 0))}</p>
              </div>
            </div>
          )}
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b"><h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{t.reports.monthlySalesTitle}</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.reports.month}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.reports.transactions}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.reports.totalQty}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.reports.totalRevenue}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loadingMonthly ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">{t.common.loading}</td></tr>
                  ) : monthlySales && monthlySales.length > 0 ? (
                    monthlySales.map((item: any) => (
                      <tr key={item.month} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{item.month}</td>
                        <td className="px-4 py-3 text-right">{item.transactionCount}</td>
                        <td className="px-4 py-3 text-right">{item.totalQuantity}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">{fmt(item.totalRevenue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">{t.reports.noData}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
