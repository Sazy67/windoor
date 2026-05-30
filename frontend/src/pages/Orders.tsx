import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi, productApi, customerApi } from '../lib/api';
import type { ProductVariant, Customer, Order } from '../lib/api';
import { useLang, useAuth } from '../App';

type TabType = 'list' | 'custom' | 'reservation';
interface CartItem { variant: ProductVariant; quantity: number; }

const STATUS_BADGE: Record<string, string> = {
  Order_Received: 'bg-yellow-100 text-yellow-800',
  In_Production: 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Reserved: 'bg-orange-100 text-orange-800',
  Delivered: 'bg-green-100 text-green-800',
};
const NEXT_STATUS: Record<string, string> = {
  Order_Received: 'In_Production', In_Production: 'Completed',
};

const fmt = (v: number) => v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');

export default function Orders() {
  const queryClient = useQueryClient();
  const { t } = useLang();
  const { isAdmin } = useAuth();

  const [tab, setTab] = useState<TabType>('list');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [deliverModal, setDeliverModal] = useState<Order | null>(null);
  const [deliverNotes, setDeliverNotes] = useState('');
  const [deliverSuccess, setDeliverSuccess] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [custSelected, setCustSelected] = useState<Customer | null>(null);
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [customForm, setCustomForm] = useState({
    productType: 'Gate', dimensions: '', specifications: '', deliveryDeadline: '', notes: '',
  });
  const [customError, setCustomError] = useState('');
  const [resCustSearch, setResCustSearch] = useState('');
  const [resCustSelected, setResCustSelected] = useState<Customer | null>(null);
  const [showResCustDrop, setShowResCustDrop] = useState(false);
  const [resNotes, setResNotes] = useState('');
  const [resCart, setResCart] = useState<CartItem[]>([]);
  const [resSearch, setResSearch] = useState('');
  const [resError, setResError] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', filterType, filterStatus],
    queryFn: () => orderApi.getOrders({ orderType: filterType || undefined, status: filterStatus || undefined }).then(r => r.data),
  });
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.getCustomers().then(r => r.data),
  });
  const { data: products } = useQuery({
    queryKey: ['products-res', resSearch],
    queryFn: () => productApi.getProducts({ search: resSearch || undefined }).then(r => r.data),
    enabled: tab === 'reservation',
  });

  const filteredCust = useMemo(() =>
    !custSearch.trim() ? (customers || []) :
    (customers || []).filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.phone?.includes(custSearch)),
    [customers, custSearch]);
  const filteredResCust = useMemo(() =>
    !resCustSearch.trim() ? (customers || []) :
    (customers || []).filter(c => c.name.toLowerCase().includes(resCustSearch.toLowerCase()) || c.phone?.includes(resCustSearch)),
    [customers, resCustSearch]);

  const createCustomMutation = useMutation({
    mutationFn: (data: any) => orderApi.createCustomOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setTab('list'); setCustSearch(''); setCustSelected(null);
      setCustomForm({ productType: 'Gate', dimensions: '', specifications: '', deliveryDeadline: '', notes: '' });
    },
    onError: (err: any) => setCustomError(err.response?.data?.error || t.orders.errorGeneric),
  });
  const createResMutation = useMutation({
    mutationFn: (data: any) => orderApi.createReservationOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setTab('list'); setResCart([]); setResCustSearch(''); setResCustSelected(null); setResNotes('');
    },
    onError: (err: any) => setResError(err.response?.data?.error || t.orders.errorGeneric),
  });
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => orderApi.updateOrderStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
  const deliverMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      orderApi.deliverReservation(id, { createdById: user.id, notes }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'sales', 'dashboard-summary', 'recent-sales'] });
      setDeliverModal(null); setDeliverNotes('');
      const total = res.data?.sale?.totalAmount;
      setDeliverSuccess(`${t.orders.deliverSuccess}${total ? ' ' + fmt(total) : ''}`);
      setTimeout(() => setDeliverSuccess(''), 5000);
    },
    onError: (err: any) => alert(err.response?.data?.error || t.orders.deliverError),
  });

  const resolveCustomer = async (search: string, selected: Customer | null): Promise<string | null> => {
    if (selected) return selected.id;
    if (search.trim()) {
      const res = await customerApi.createCustomer({ name: search.trim() });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      return res.data.id;
    }
    return null;
  };

  const handleCustomSubmit = async () => {
    setCustomError('');
    if (!custSearch.trim() && !custSelected) { setCustomError(t.orders.errorCustomerRequired); return; }
    if (!customForm.dimensions) { setCustomError(t.orders.errorDimensionsRequired); return; }
    if (!customForm.deliveryDeadline) { setCustomError(t.orders.errorDeadlineRequired); return; }
    try {
      const customerId = await resolveCustomer(custSearch, custSelected);
      if (!customerId) { setCustomError(t.orders.errorCustomerNotFound); return; }
      createCustomMutation.mutate({ customerId, ...customForm,
        specifications: customForm.specifications || undefined,
        notes: customForm.notes || undefined, createdById: user.id });
    } catch { setCustomError(t.orders.errorGeneric); }
  };

  const handleResSubmit = async () => {
    setResError('');
    if (!resCustSearch.trim() && !resCustSelected) { setResError(t.orders.errorCustomerRequired); return; }
    if (resCart.length === 0) { setResError(t.orders.errorProductRequired); return; }
    try {
      const customerId = await resolveCustomer(resCustSearch, resCustSelected);
      if (!customerId) { setResError(t.orders.errorCustomerNotFound); return; }
      createResMutation.mutate({ customerId,
        items: resCart.map(i => ({ variantId: i.variant.id, quantity: i.quantity })),
        notes: resNotes || undefined, createdById: user.id });
    } catch { setResError(t.orders.errorGeneric); }
  };

  const addToResCart = (variant: ProductVariant, product: any) => {
    const stock = variant.stock?.quantity || 0;
    const inCart = resCart.find(i => i.variant.id === variant.id)?.quantity || 0;
    if (inCart >= stock) return;
    const existing = resCart.find(i => i.variant.id === variant.id);
    if (existing) setResCart(resCart.map(i => i.variant.id === variant.id ? { ...i, quantity: i.quantity + 1 } : i));
    else setResCart([...resCart, { variant: { ...variant, product }, quantity: 1 }]);
  };

  const CustDropdown = ({ search, selected, onSearch, onSelect, onClear, showDrop, setShowDrop, filtered }: any) => (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t.orders.customerLabel} {selected && <span className="text-xs text-green-600">{t.orders.customerSelected}</span>}
      </label>
      <div className="flex gap-2">
        <input type="text" value={selected ? selected.name : search}
          onChange={e => { onSearch(e.target.value); setShowDrop(true); }}
          onFocus={() => setShowDrop(true)}
          className={`input-field flex-1 ${selected ? 'bg-green-50 border-green-300' : ''}`}
          placeholder={t.orders.customerPlaceholder} />
        {selected && <button onClick={onClear} className="px-3 border border-gray-300 rounded-lg text-gray-400 hover:text-gray-600">✕</button>}
      </div>
      {showDrop && !selected && search.trim() && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filtered.slice(0, 6).map((c: Customer) => (
            <div key={c.id} onClick={() => onSelect(c)} className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm">
              <p className="font-medium">{c.name}</p>
              {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
            </div>
          ))}
          <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">{t.orders.newCustomerNote}</div>
        </div>
      )}
    </div>
  );

  const statusLabels = t.orders.statusLabels;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{t.orders.title}</h1>
          <p className="mt-1" style={{ color: 'var(--muted)' }}>{t.orders.subtitle}</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-3">
            <button onClick={() => setTab('custom')} className="btn-primary">{t.orders.newCustom}</button>
            <button onClick={() => setTab('reservation')} className="btn-secondary">{t.orders.newReservation}</button>
          </div>
        )}
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['list', 'custom', 'reservation'] as TabType[]).map(tabKey => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === tabKey ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
            {tabKey === 'list'
              ? `${t.orders.orderList}${orders ? ` (${orders.length})` : ''}`
              : tabKey === 'custom' ? t.orders.customOrder : t.orders.reservation}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="space-y-4">
          {deliverSuccess && <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg font-medium">✅ {deliverSuccess}</div>}
          <div className="card">
            <div className="flex flex-wrap gap-4">
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field w-auto">
                <option value="">{t.orders.allTypes}</option>
                <option value="Custom">{t.orders.customOrder}</option>
                <option value="Reservation">{t.orders.reservation}</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-auto">
                <option value="">{t.orders.allStatuses}</option>
                {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {(filterType || filterStatus) && <button onClick={() => { setFilterType(''); setFilterStatus(''); }} className="btn-secondary text-sm">✕ {t.common.clear}</button>}
            </div>
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.orders.customer}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.orders.type}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.orders.date}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.orders.detail}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.orders.deadline}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t.orders.status}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t.orders.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t.common.loading}</td></tr>
                ) : orders && orders.length > 0 ? orders.map(order => (
                  <>
                    <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                      <td className="px-4 py-3 font-medium">{order.customer?.name}</td>
                      <td className="px-4 py-3 text-sm">
                        {order.orderType === 'Custom' ? t.orders.customOrderType : t.orders.reservationOrderType}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(order.orderDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {order.customOrder && <span>{order.customOrder.productType} · {order.customOrder.dimensions}</span>}
                        {order.reservationOrder && <span>{order.reservationOrder.items?.length || 0} {t.orders.itemCount}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {order.customOrder?.deliveryDeadline
                          ? <span className={new Date(order.customOrder.deliveryDeadline) < new Date() && order.customOrder.status !== 'Completed' ? 'text-red-600 font-medium' : 'text-gray-600'}>
                              {fmtDate(order.customOrder.deliveryDeadline)}
                            </span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-800'}`}>
                          {statusLabels[order.status as keyof typeof statusLabels] || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        {isAdmin && order.orderType === 'Reservation' && order.status === 'Reserved' && (
                          <button onClick={() => { setDeliverModal(order); setDeliverNotes(''); }}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1.5 rounded-lg">
                            {t.orders.deliver}
                          </button>
                        )}
                        {isAdmin && order.orderType === 'Custom' && NEXT_STATUS[order.status] && (
                          <button onClick={() => updateStatusMutation.mutate({ id: order.id, status: NEXT_STATUS[order.status] })}
                            disabled={updateStatusMutation.isPending}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50">
                            → {statusLabels[NEXT_STATUS[order.status] as keyof typeof statusLabels]}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedOrder === order.id && (
                      <tr key={`${order.id}-d`}>
                        <td colSpan={7} className="px-6 py-4 bg-blue-50 border-b">
                          {order.customOrder && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div><span className="text-gray-500">{t.orders.type}:</span> <span className="font-medium">{order.customOrder.productType}</span></div>
                              <div><span className="text-gray-500">{t.orders.dimensions}:</span> <span className="font-medium">{order.customOrder.dimensions}</span></div>
                              {order.customOrder.specifications && <div className="col-span-2"><span className="text-gray-500">{t.orders.specifications}:</span> <span className="font-medium">{order.customOrder.specifications}</span></div>}
                            </div>
                          )}
                          {order.reservationOrder?.items?.map((item: any) => (
                            <div key={item.id} className="text-sm flex items-center gap-2 mt-1">
                              <span className="font-medium">{item.variant?.product?.name}</span>
                              {item.variant?.color && <span className="text-gray-500">· {item.variant.color}</span>}
                              <span className="text-gray-500">· {item.variant?.dimension}</span>
                              <span className="font-medium">×{item.quantity}</span>
                            </div>
                          ))}
                          {order.notes && <p className="text-sm text-gray-600 italic mt-1">📝 {order.notes}</p>}
                        </td>
                      </tr>
                    )}
                  </>
                )) : (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t.orders.noOrders}</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'custom' && (
        <div className="card max-w-2xl">
          <h2 className="text-xl font-semibold mb-4">{t.orders.customTitle}</h2>
          <div className="space-y-4">
            <CustDropdown search={custSearch} selected={custSelected}
              onSearch={setCustSearch} onSelect={(c: Customer) => { setCustSelected(c); setCustSearch(''); setShowCustDrop(false); }}
              onClear={() => { setCustSelected(null); setCustSearch(''); }}
              showDrop={showCustDrop} setShowDrop={setShowCustDrop} filtered={filteredCust} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.orders.productType}</label>
                <select value={customForm.productType} onChange={e => setCustomForm({ ...customForm, productType: e.target.value })} className="input-field">
                  {['Gate', 'Window', 'Panel', 'Accessory', 'Consumable'].map(tp => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.orders.dimensions}</label>
                <input type="text" value={customForm.dimensions} onChange={e => setCustomForm({ ...customForm, dimensions: e.target.value })} className="input-field" placeholder={t.orders.dimensionsPlaceholder} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.orders.specifications}</label>
              <textarea value={customForm.specifications} onChange={e => setCustomForm({ ...customForm, specifications: e.target.value })} className="input-field" rows={3} placeholder={t.orders.specificationsPlaceholder} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.orders.deliveryDeadline}</label>
              <input type="date" value={customForm.deliveryDeadline} onChange={e => setCustomForm({ ...customForm, deliveryDeadline: e.target.value })} className="input-field" min={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.common.notes}</label>
              <textarea value={customForm.notes} onChange={e => setCustomForm({ ...customForm, notes: e.target.value })} className="input-field" rows={2} />
            </div>
            {customError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">❌ {customError}</div>}
            <div className="flex space-x-3">
              <button onClick={handleCustomSubmit} disabled={createCustomMutation.isPending} className="flex-1 btn-primary disabled:opacity-50">
                {createCustomMutation.isPending ? t.orders.saving : t.orders.createOrder}
              </button>
              <button onClick={() => { setTab('list'); setCustomError(''); }} className="flex-1 btn-secondary">{t.common.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'reservation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-3">{t.orders.reservationTitle}</h2>
            <input type="text" placeholder={t.orders.searchProductPh} value={resSearch} onChange={e => setResSearch(e.target.value)} className="input-field mb-3" />
            <div className="border rounded-lg max-h-[460px] overflow-y-auto divide-y">
              {products && products.length > 0 ? products.flatMap(product =>
                (product.variants || []).map(variant => {
                  const stock = variant.stock?.quantity || 0;
                  const inCart = resCart.find(i => i.variant.id === variant.id)?.quantity || 0;
                  const canAdd = stock > inCart;
                  return (
                    <div key={variant.id} onClick={() => canAdd && addToResCart(variant, product)}
                      className={`p-3 flex items-center justify-between transition-colors ${canAdd ? 'cursor-pointer hover:bg-blue-50' : 'opacity-40 cursor-not-allowed bg-gray-50'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{[variant.color, variant.dimension, variant.type].filter(Boolean).join(' · ')}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-medium ${stock === 0 ? 'text-red-500' : stock <= 5 ? 'text-yellow-600' : 'text-green-600'}`}>{t.orders.stockLabel}: {stock}</span>
                          {inCart > 0 && <span className="text-xs text-blue-600">{t.orders.cartInLabel}: {inCart}</span>}
                        </div>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p className="font-bold text-blue-700 text-sm">{fmt(variant.salePrice)}</p>
                        {canAdd && <span className="text-xs text-blue-400">{t.orders.addLabel}</span>}
                      </div>
                    </div>
                  );
                })
              ) : <div className="p-6 text-center text-gray-400 text-sm">{resSearch ? t.orders.noProductFound : t.orders.startTyping}</div>}
            </div>
          </div>
          <div className="card">
            <h2 className="text-xl font-semibold mb-3">{t.orders.reservationDetails}</h2>
            <div className="space-y-4">
              <CustDropdown search={resCustSearch} selected={resCustSelected}
                onSearch={setResCustSearch} onSelect={(c: Customer) => { setResCustSelected(c); setResCustSearch(''); setShowResCustDrop(false); }}
                onClear={() => { setResCustSelected(null); setResCustSearch(''); }}
                showDrop={showResCustDrop} setShowDrop={setShowResCustDrop} filtered={filteredResCust} />
              <div className="border rounded-lg overflow-hidden" style={{ minHeight: '150px', maxHeight: '220px', overflowY: 'auto' }}>
                {resCart.length === 0 ? <div className="flex items-center justify-center h-24 text-gray-400 text-sm">{t.orders.selectFromLeft}</div> : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t.orders.productCol}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">{t.orders.qtyCol}</th>
                        <th className="px-3 py-2 w-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {resCart.map(item => (
                        <tr key={item.variant.id}>
                          <td className="px-3 py-2">
                            <p className="font-medium">{item.variant.product?.name}</p>
                            <p className="text-xs text-gray-400">{[item.variant.color, item.variant.dimension].filter(Boolean).join(' · ')}</p>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center space-x-1">
                              <button onClick={() => setResCart(resCart.map(i => i.variant.id === item.variant.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="w-6 h-6 rounded bg-gray-200 font-bold text-sm">−</button>
                              <span className="w-8 text-center font-semibold">{item.quantity}</span>
                              <button onClick={() => { if (item.quantity < (item.variant.stock?.quantity || 0)) setResCart(resCart.map(i => i.variant.id === item.variant.id ? { ...i, quantity: i.quantity + 1 } : i)); }} className="w-6 h-6 rounded bg-gray-200 font-bold text-sm">+</button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => setResCart(resCart.filter(i => i.variant.id !== item.variant.id))} className="text-red-400 hover:text-red-600 font-bold text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.common.notes}</label>
                <textarea value={resNotes} onChange={e => setResNotes(e.target.value)} className="input-field" rows={2} />
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800">
                ⚠️ {t.orders.reservationWarning}
              </div>
              {resError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">❌ {resError}</div>}
              <div className="flex space-x-3">
                <button onClick={handleResSubmit} disabled={resCart.length === 0 || (!resCustSearch.trim() && !resCustSelected) || createResMutation.isPending} className="flex-1 btn-primary disabled:opacity-50">
                  {createResMutation.isPending ? t.orders.saving : t.orders.createReservation}
                </button>
                <button onClick={() => { setTab('list'); setResError(''); }} className="flex-1 btn-secondary">{t.common.cancel}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deliverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-1">{t.orders.deliveryTitle}</h2>
            <p className="text-sm text-gray-500 mb-4">{t.orders.customer}: <strong>{deliverModal.customer?.name}</strong></p>
            {deliverModal.reservationOrder?.items && deliverModal.reservationOrder.items.length > 0 && (
              <div className="border rounded-lg mb-4 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t.orders.deliveryProducts}</div>
                <div className="divide-y">
                  {deliverModal.reservationOrder.items.map((item: any) => (
                    <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{item.variant?.product?.name}</p>
                        <p className="text-xs text-gray-500">{[item.variant?.color, item.variant?.dimension].filter(Boolean).join(' · ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">×{item.quantity}</p>
                        <p className="text-xs text-green-600">{fmt((item.variant?.salePrice || 0) * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 px-4 py-2 flex justify-between text-sm font-bold border-t">
                  <span>{t.orders.totalLabel}</span>
                  <span className="text-green-600">
                    {fmt(deliverModal.reservationOrder.items.reduce((s: number, i: any) => s + (i.variant?.salePrice || 0) * i.quantity, 0))}
                  </span>
                </div>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 mb-4">
              ℹ️ {t.orders.deliveryInfo} {t.orders.deliveryInfoStock}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.orders.deliveryNotes}</label>
              <textarea value={deliverNotes} onChange={e => setDeliverNotes(e.target.value)} className="input-field" rows={2} placeholder={t.orders.deliveryNotesPh} />
            </div>
            <div className="flex space-x-3">
              <button onClick={() => deliverMutation.mutate({ id: deliverModal.id, notes: deliverNotes || undefined })}
                disabled={deliverMutation.isPending}
                className="flex-1 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50"
                style={{ backgroundColor: '#16a34a' }}>
                {deliverMutation.isPending ? t.orders.delivering : t.orders.deliverConfirm}
              </button>
              <button onClick={() => { setDeliverModal(null); setDeliverNotes(''); }} className="flex-1 btn-secondary">{t.common.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
