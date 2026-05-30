import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../App';

const formatCurrency = (v: number) =>
  v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

const formatDate = (d: string) =>
  new Date(d).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

export default function SalesHistory() {
  const navigate = useNavigate();
  const { t } = useLang();
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
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{t.nav.salesHistory}</h1>
          <p className="mt-1" style={{ color: 'var(--muted)' }}>{t.reports.totalTransactions}</p>
        </div>
        <button onClick={() => navigate('/sales')} className="btn-primary">
          + {t.dashboard.newSale.replace('💰 ', '')}
        </button>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>{t.reports.startDate}</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field w-auto" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>{t.reports.endDate}</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field w-auto" />
          </div>
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="btn-secondary text-sm">
              {t.common.clear}
            </button>
          )}
        </div>
      </div>

      {sales && sales.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.reports.totalTransactions}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{sales.length}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.reports.totalSoldQty}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{totalItems}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.reports.totalRevenue}</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>{t.common.loading}</div>
          ) : sales && sales.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.common.date}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.common.customer}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t.common.quantity}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.common.price}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.common.notes}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t.stock.detail}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sales.map(sale => (
                  <>
                    <tr key={sale.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(sale.saleDate)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{sale.customer?.name}</td>
                      <td className="px-4 py-3 text-center text-sm">{sale.items?.length || 0}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(sale.totalAmount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{sale.notes || '-'}</td>
                      <td className="px-4 py-3 text-center text-sm text-blue-600">{expandedSale === sale.id ? '▲' : '▼'}</td>
                    </tr>
                    {expandedSale === sale.id && (
                      <tr key={`${sale.id}-detail`}>
                        <td colSpan={6} className="px-4 py-0 bg-blue-50">
                          <div className="py-3 pl-4 border-l-4 border-blue-400">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t.common.name}</p>
                            <div className="space-y-1">
                              {sale.items?.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span className="text-gray-700">
                                    <span className="font-medium">{item.variant?.product?.name}</span>
                                    {item.variant?.color && <span className="text-gray-500"> · {item.variant.color}</span>}
                                    <span className="text-gray-500"> · {item.variant?.dimension}</span>
                                    <span className="ml-2 text-gray-400">×{item.quantity}</span>
                                  </span>
                                  <span className="font-medium text-gray-900">{formatCurrency(item.lineTotal)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between text-sm font-bold">
                              <span>{t.common.total}</span>
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
            <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>{t.common.noData}</div>
          )}
        </div>
      </div>
    </div>
  );
}
