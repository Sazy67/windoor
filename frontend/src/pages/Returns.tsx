import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockApi, customerApi } from '../lib/api';
import type { StockItem, Customer } from '../lib/api';
import { useLang, useAuth } from '../App';

interface ReturnItem { variantId: string; variantLabel: string; quantity: number; isSecondQuality: boolean; }

const fmtDate = (d: string) => new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Returns() {
  const queryClient = useQueryClient();
  const { t } = useLang();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<'new' | 'history'>('new');
  const [custSearch, setCustSearch] = useState('');
  const [custSelected, setCustSelected] = useState<Customer | null>(null);
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDrop, setShowProductDrop] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedVariantLabel, setSelectedVariantLabel] = useState('');
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [addQty, setAddQty] = useState(1);
  const [addSecondQuality, setAddSecondQuality] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const { data: stockList } = useQuery({ queryKey: ['stock'], queryFn: () => stockApi.getStock().then(res => res.data) });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => customerApi.getCustomers().then(res => res.data) });
  const { data: returnHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['returns'],
    queryFn: async () => { const res = await fetch('/api/returns'); return res.json(); },
    enabled: tab === 'history',
  });

  const filteredCust = useMemo(() => !custSearch.trim() ? (customers || []) : (customers || []).filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.phone?.includes(custSearch)), [customers, custSearch]);
  const filteredProducts = useMemo(() => {
    if (!stockList) return [];
    const q = productSearch.toLowerCase();
    if (!q) return stockList;
    return stockList.filter(item => item.productName.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q) || (item.color || '').toLowerCase().includes(q) || item.dimension.toLowerCase().includes(q));
  }, [stockList, productSearch]);

  const returnMutation = useMutation({
    mutationFn: async (data: any) => {
      let customerId: string;
      if (custSelected) { customerId = custSelected.id; }
      else { const res = await customerApi.createCustomer({ name: custSearch.trim() }); queryClient.invalidateQueries({ queryKey: ['customers'] }); customerId = res.data.id; }
      const response = await fetch('/api/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId, items: data.items, reason: data.reason, createdById: data.createdById }) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Return failed'); }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] }); queryClient.invalidateQueries({ queryKey: ['returns'] });
      setCustSearch(''); setCustSelected(null); setReason(''); setItems([]);
      setSuccess(t.returns.successSave); setTimeout(() => setSuccess(''), 4000);
    },
    onError: (err: any) => setError(err.message || t.returns.errorFailed),
  });

  const addItem = () => {
    if (!selectedVariantId) return;
    const existing = items.find(i => i.variantId === selectedVariantId && i.isSecondQuality === addSecondQuality);
    if (existing) setItems(items.map(i => i.variantId === selectedVariantId && i.isSecondQuality === addSecondQuality ? { ...i, quantity: i.quantity + addQty } : i));
    else setItems([...items, { variantId: selectedVariantId, variantLabel: selectedVariantLabel, quantity: addQty, isSecondQuality: addSecondQuality }]);
    setSelectedVariantId(''); setSelectedVariantLabel(''); setProductSearch(''); setAddQty(1); setAddSecondQuality(false);
  };

  const handleSubmit = () => {
    setError('');
    if (!custSearch.trim() && !custSelected) { setError(t.returns.errorCustomerRequired); return; }
    if (!reason.trim()) { setError(t.returns.errorReasonRequired); return; }
    if (items.length === 0) { setError(t.returns.errorProductRequired); return; }
    returnMutation.mutate({ items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity, isSecondQuality: i.isSecondQuality })), reason, createdById: user.id });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{t.returns.title}</h1>
        <p className="mt-1" style={{ color: 'var(--muted)' }}>{t.returns.subtitle}</p>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['new', 'history'] as const).filter(k => isAdmin || k !== 'new').map(tabKey => (
          <button key={tabKey} onClick={() => setTab(tabKey as 'new' | 'history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === tabKey ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
            {tabKey === 'new' ? t.returns.newReturn : t.returns.history}
          </button>
        ))}
      </div>

      {success && <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">✅ {success}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between"><span>❌ {error}</span><button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button></div>}

      {tab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{t.returns.returnInfo}</h2>
            <div className="relative">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>
                {t.common.customer} * {custSelected && <span className="text-xs text-green-600">{t.stock.selected}</span>}
              </label>
              <div className="flex gap-2">
                <input type="text" value={custSelected ? custSelected.name : custSearch}
                  onChange={e => { setCustSelected(null); setCustSearch(e.target.value); setShowCustDrop(true); }}
                  onFocus={() => setShowCustDrop(true)}
                  className={`input-field flex-1 ${custSelected ? 'bg-green-50 border-green-300' : ''}`}
                  placeholder={t.sales.customerPlaceholder} />
                {custSelected && <button onClick={() => { setCustSelected(null); setCustSearch(''); }} className="px-3 border border-gray-300 rounded-lg text-gray-400 hover:text-gray-600">✕</button>}
              </div>
              {showCustDrop && !custSelected && custSearch.trim() && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredCust.slice(0, 6).map(c => (
                    <div key={c.id} onClick={() => { setCustSelected(c); setCustSearch(''); setShowCustDrop(false); }} className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm">
                      <p className="font-medium">{c.name}</p>
                      {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    </div>
                  ))}
                  <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">{t.sales.newCustomerNote}</div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>{t.returns.returnReason}</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} className="input-field" rows={3} placeholder={t.returns.reasonPlaceholder} />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-2)' }}>{t.returns.addProduct}</h3>
              <div className="relative mb-3">
                <input type="text" placeholder={t.stock.searchProduct}
                  value={selectedVariantId ? selectedVariantLabel : productSearch}
                  onChange={e => { setSelectedVariantId(''); setSelectedVariantLabel(''); setProductSearch(e.target.value); setShowProductDrop(true); }}
                  onFocus={() => setShowProductDrop(true)}
                  className={`input-field ${selectedVariantId ? 'bg-green-50 border-green-300' : ''}`} />
                {selectedVariantId && <button onClick={() => { setSelectedVariantId(''); setSelectedVariantLabel(''); setProductSearch(''); }} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">✕</button>}
                {showProductDrop && !selectedVariantId && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredProducts.length === 0 ? <div className="px-4 py-3 text-sm text-gray-400">{t.stock.noProductFound}</div> : (
                      filteredProducts.map((item: StockItem) => (
                        <div key={item.id} onClick={() => { setSelectedVariantId(item.id); setSelectedVariantLabel(`${item.productName} - ${[item.color, item.dimension].filter(Boolean).join(' ')}`); setShowProductDrop(false); setProductSearch(''); }} className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-0">
                          <p className="font-medium text-sm">{item.productName}</p>
                          <div className="flex justify-between mt-0.5">
                            <p className="text-xs text-gray-500">{[item.color, item.dimension].filter(Boolean).join(' · ')} · {item.sku}</p>
                            <span className="text-xs text-gray-500">{t.stock.stock}: {item.quantity}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>{t.common.quantity}</label>
                  <input type="number" min={1} max={999} value={addQty} onChange={e => setAddQty(parseInt(e.target.value) || 1)} className="input-field" />
                </div>
                <div className="flex items-center space-x-2 pb-1">
                  <input type="checkbox" id="sq" checked={addSecondQuality} onChange={e => setAddSecondQuality(e.target.checked)} className="w-4 h-4" />
                  <label htmlFor="sq" className="text-sm whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{t.stock.isSecondQuality}</label>
                </div>
                <button onClick={addItem} disabled={!selectedVariantId} className="btn-secondary disabled:opacity-50 whitespace-nowrap">+ {t.common.add}</button>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{t.returns.returnList}</h2>
            <div className="border rounded-lg overflow-hidden" style={{ minHeight: '200px', maxHeight: '320px', overflowY: 'auto' }}>
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-400 text-sm">{t.returns.addFromLeft}</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t.common.name}</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">{t.common.quantity}</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">{t.returns.quality}</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium text-gray-900">{item.variantLabel}</td>
                        <td className="px-3 py-2 text-center font-semibold">{item.quantity}</td>
                        <td className="px-3 py-2 text-center">{item.isSecondQuality ? <span className="badge-yellow">{t.returns.secondQuality}</span> : <span className="badge-green">{t.returns.normal}</span>}</td>
                        <td className="px-3 py-2 text-center"><button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 font-bold">✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <p className="font-medium mb-1">{t.returns.infoTitle}</p>
              <p>{t.returns.infoText}</p>
            </div>
            <button onClick={handleSubmit} disabled={items.length === 0 || (!custSearch.trim() && !custSelected) || !reason.trim() || returnMutation.isPending} className="w-full btn-primary disabled:opacity-50 py-3 text-base font-bold">
              {returnMutation.isPending ? t.common.loading : t.returns.saveReturn}
            </button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            {loadingHistory ? <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>{t.common.loading}</div>
            : returnHistory && returnHistory.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.common.date}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.common.customer}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.returns.products}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.returns.reason}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {returnHistory.map((ret: any) => (
                    <tr key={ret.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(ret.returnDate)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{ret.customer?.name}</td>
                      <td className="px-4 py-3">
                        {ret.items?.map((item: any) => (
                          <div key={item.id} className="text-sm text-gray-700">
                            {item.variant?.product?.name}{item.variant?.color && ` · ${item.variant.color}`}{` · ${item.variant?.dimension}`}
                            <span className="ml-1 text-gray-500">×{item.quantity}</span>
                            {item.isSecondQuality && <span className="ml-1 badge-yellow">2nd</span>}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">{ret.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>{t.returns.noHistory}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
