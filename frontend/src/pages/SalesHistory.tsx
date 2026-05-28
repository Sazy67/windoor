import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (v: number) =>
  v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

const formatDate = (d: string) =>
  new Date(d).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

export default function SalesHistory() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', startDate, endDate],
    queryFn: () => salesApi.getSales({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }).then(res => res.data),
  });

  const totalRevenue = sales?.reduce((sum, s) => sum + s.totalAmount, 0) || 0;
  const totalItems = sales?.reduce((sum, s) =>
    sum + (s.items?.reduce((is, i) => is + i.quantity, 0) || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Satış Geçmişi</h1>
          <p className="text-gray-600 mt-1">Tüm satış kayıtları</p>
        </div>
        <button onClick={() => navigate('/sales')} className="btn-primary">
          + Yeni Satış
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="input-field w-auto" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="input-field w-auto" />
          </div>
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }}
              className="btn-secondary text-sm">
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      {sales && sales.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-sm text-gray-500">Toplam Satış</p>
            <p className="text-2xl font-bold text-gray-900">{sales.length}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">Toplam Adet</p>
            <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">Toplam Gelir</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      )}

      {/* Sales List */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
          ) : sales && sales.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ürün Sayısı</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notlar</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sales.map(sale => (
                  <>
                    <tr key={sale.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {sale.customer?.name}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {sale.items?.length || 0} kalem
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {sale.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-blue-600">
                        {expandedSale === sale.id ? '▲' : '▼'}
                      </td>
                    </tr>
                    {expandedSale === sale.id && (
                      <tr key={`${sale.id}-detail`}>
                        <td colSpan={6} className="px-4 py-0 bg-blue-50">
                          <div className="py-3 pl-4 border-l-4 border-blue-400">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Satılan Ürünler</p>
                            <div className="space-y-1">
                              {sale.items?.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span className="text-gray-700">
                                    <span className="font-medium">{item.variant?.product?.name}</span>
                                    {item.variant?.color && <span className="text-gray-500"> · {item.variant.color}</span>}
                                    <span className="text-gray-500"> · {item.variant?.dimension}</span>
                                    <span className="ml-2 text-gray-400">×{item.quantity}</span>
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {formatCurrency(item.lineTotal)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between text-sm font-bold">
                              <span>Toplam</span>
                              <span className="text-green-600">{formatCurrency(sale.totalAmount)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              Satış kaydı bulunamadı
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
