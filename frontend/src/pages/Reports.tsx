import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../lib/api';

type ReportType = 'best-selling' | 'slow-moving' | 'monthly-sales';

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('best-selling');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const { data: bestSelling, isLoading: loadingBest } = useQuery({
    queryKey: ['report-best-selling', startDate, endDate],
    queryFn: () => reportApi.getBestSelling({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }).then(res => res.data),
    enabled: reportType === 'best-selling',
  });

  const { data: slowMoving, isLoading: loadingSlow } = useQuery({
    queryKey: ['report-slow-moving', filterCategory],
    queryFn: () => reportApi.getSlowMoving({
      category: filterCategory || undefined,
    }).then(res => res.data),
    enabled: reportType === 'slow-moving',
  });

  const { data: monthlySales, isLoading: loadingMonthly } = useQuery({
    queryKey: ['report-monthly', startDate, endDate],
    queryFn: () => reportApi.getMonthlySales({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }).then(res => res.data),
    enabled: reportType === 'monthly-sales',
  });

  const categories = ['Gate', 'Window', 'Panel', 'Accessory', 'Consumable'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Raporlar</h1>
        <p className="text-gray-600 mt-1">Satış ve stok analizleri</p>
      </div>

      {/* Report Type Selector */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { value: 'best-selling', label: '🏆 En Çok Satan' },
          { value: 'slow-moving', label: '📦 Stokta Bekleyen' },
          { value: 'monthly-sales', label: '📅 Aylık Satış' },
        ].map(r => (
          <button key={r.value} onClick={() => setReportType(r.value as ReportType)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              reportType === r.value ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          {(reportType === 'best-selling' || reportType === 'monthly-sales') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="input-field w-auto" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="input-field w-auto" />
              </div>
            </>
          )}
          {reportType === 'slow-moving' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="input-field w-auto">
                <option value="">Tümü</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Best Selling Report */}
      {reportType === 'best-selling' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">En Çok Satan Ürünler</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Renk / Ölçü</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Satılan Adet</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam Gelir</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingBest ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Yükleniyor...</td></tr>
                ) : bestSelling && bestSelling.length > 0 ? (
                  bestSelling.map((item: any, index: number) => (
                    <tr key={item.variantId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-bold text-gray-400">#{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.color && `${item.color} - `}{item.dimension}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{item.totalQuantity}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary-600">
                        {item.totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Veri bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slow Moving Report */}
      {reportType === 'slow-moving' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Stokta Bekleyen Ürünler</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Renk / Ölçü</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stok</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stokta Gün</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingSlow ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Yükleniyor...</td></tr>
                ) : slowMoving && slowMoving.length > 0 ? (
                  slowMoving.map((item: any) => (
                    <tr key={item.variantId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.color && `${item.color} - `}{item.dimension}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${item.daysInStock > 90 ? 'text-red-600' : item.daysInStock > 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {item.daysInStock} gün
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Veri bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Sales Report */}
      {reportType === 'monthly-sales' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          {monthlySales && monthlySales.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card text-center">
                <p className="text-sm text-gray-600">Toplam İşlem</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {monthlySales.reduce((s: number, m: any) => s + m.transactionCount, 0)}
                </p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-gray-600">Toplam Satılan Adet</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {monthlySales.reduce((s: number, m: any) => s + m.totalQuantity, 0)}
                </p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-gray-600">Toplam Gelir</p>
                <p className="text-3xl font-bold text-primary-600 mt-1">
                  {monthlySales.reduce((s: number, m: any) => s + m.totalRevenue, 0)
                    .toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </p>
              </div>
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Aylık Satış Raporu</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ay</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlem Sayısı</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Satılan Adet</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam Gelir</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loadingMonthly ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Yükleniyor...</td></tr>
                  ) : monthlySales && monthlySales.length > 0 ? (
                    monthlySales.map((item: any) => (
                      <tr key={item.month} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{item.month}</td>
                        <td className="px-4 py-3 text-right">{item.transactionCount}</td>
                        <td className="px-4 py-3 text-right">{item.totalQuantity}</td>
                        <td className="px-4 py-3 text-right font-semibold text-primary-600">
                          {item.totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Veri bulunamadı</td></tr>
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
