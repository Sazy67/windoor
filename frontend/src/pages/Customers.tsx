import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi, reportApi } from '../lib/api';
import type { Customer } from '../lib/api';

type ModalType = 'add' | 'edit' | null;

const emptyForm = { name: '', phone: '', email: '', address: '' };

export default function Customers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.getCustomers().then(res => res.data),
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['customer-history', selectedCustomer?.id],
    queryFn: () => reportApi.getCustomerHistory(selectedCustomer!.id).then(res => res.data),
    enabled: !!selectedCustomer,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => customerApi.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setModal(null);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err: any) => setFormError(err.response?.data?.error || 'Hata oluştu'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof emptyForm }) =>
      customerApi.updateCustomer(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelectedCustomer(res.data);
      setModal(null);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err: any) => setFormError(err.response?.data?.error || 'Hata oluştu'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerApi.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelectedCustomer(null);
    },
    onError: (err: any) => alert(err.response?.data?.error || 'Silinemedi'),
  });

  const filtered = customers?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm(emptyForm);
    setFormError('');
    setModal('add');
  };

  const openEdit = (c: Customer) => {
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '' });
    setFormError('');
    setModal('edit');
  };

  const handleSave = () => {
    if (!form.name.trim()) { setFormError('Müşteri adı zorunludur'); return; }
    if (modal === 'add') {
      createMutation.mutate(form);
    } else if (modal === 'edit' && selectedCustomer) {
      updateMutation.mutate({ id: selectedCustomer.id, data: form });
    }
  };

  const handleDelete = (c: Customer) => {
    if (confirm(`"${c.name}" müşterisini silmek istediğinizden emin misiniz?`)) {
      deleteMutation.mutate(c.id);
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const STATUS_LABELS: Record<string, string> = {
    Order_Received: 'Sipariş Alındı', In_Production: 'Üretimde',
    Completed: 'Tamamlandı', Reserved: 'Rezerve', Delivered: 'Teslim Edildi',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Müşteriler</h1>
          <p className="text-gray-600 mt-1">Müşteri yönetimi ve satış geçmişi</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Yeni Müşteri</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="card lg:col-span-1">
          <div className="mb-4">
            <input type="text" placeholder="İsim, telefon veya e-posta ara..."
              value={search} onChange={e => setSearch(e.target.value)} className="input-field" />
          </div>
          <p className="text-xs text-gray-400 mb-2">{filtered?.length || 0} müşteri</p>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <p className="text-center text-gray-500 py-4">Yükleniyor...</p>
            ) : filtered && filtered.length > 0 ? (
              filtered.map(customer => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                    selectedCustomer?.id === customer.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                      {customer.phone && <p className="text-xs text-gray-500">📞 {customer.phone}</p>}
                      {customer.email && <p className="text-xs text-gray-500 truncate">✉️ {customer.email}</p>}
                    </div>
                    <div className="flex space-x-1 ml-2 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedCustomer(customer); openEdit(customer); }}
                        className="text-xs text-blue-600 hover:text-blue-800 px-1 py-0.5 rounded hover:bg-blue-50"
                        title="Düzenle"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(customer); }}
                        className="text-xs text-red-500 hover:text-red-700 px-1 py-0.5 rounded hover:bg-red-50"
                        title="Sil"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-3xl mb-2">👤</p>
                <p className="text-sm">Müşteri bulunamadı</p>
                <button onClick={openAdd} className="mt-3 text-sm text-blue-600 hover:underline">
                  + Yeni müşteri ekle
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Customer Detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedCustomer ? (
            <div className="card flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <p className="text-4xl mb-2">👤</p>
                <p>Detayları görmek için müşteri seçin</p>
              </div>
            </div>
          ) : loadingHistory ? (
            <div className="card flex items-center justify-center h-64 text-gray-500">Yükleniyor...</div>
          ) : history ? (
            <>
              {/* Customer Info Card */}
              <div className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{history.customer.name}</h2>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      {history.customer.phone && <p>📞 {history.customer.phone}</p>}
                      {history.customer.email && <p>✉️ {history.customer.email}</p>}
                      {history.customer.address && <p>📍 {history.customer.address}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Toplam Harcama</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(history.totalSpent)}</p>
                      <p className="text-xs text-gray-400">{history.sales.length} satış · {history.orders.length} sipariş</p>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => openEdit(selectedCustomer)}
                        className="btn-secondary text-sm py-1 px-3">
                        ✏️ Düzenle
                      </button>
                      <button onClick={() => handleDelete(selectedCustomer)}
                        className="btn-danger text-sm py-1 px-3">
                        🗑️ Sil
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales History */}
              {history.sales.length > 0 && (
                <div className="card p-0 overflow-hidden">
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <h3 className="font-semibold text-gray-900">💰 Satış Geçmişi ({history.sales.length})</h3>
                  </div>
                  <div className="divide-y max-h-72 overflow-y-auto">
                    {history.sales.map((sale: any) => (
                      <div key={sale.id} className="px-6 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{formatDate(sale.saleDate)}</span>
                          <span className="font-bold text-green-600">{formatCurrency(sale.totalAmount)}</span>
                        </div>
                        <div className="space-y-1">
                          {sale.items.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-sm text-gray-600">
                              <span>
                                {item.variant.product.name}
                                {item.variant.color && ` · ${item.variant.color}`}
                                {` · ${item.variant.dimension}`}
                                <span className="ml-2 text-gray-400">×{item.quantity}</span>
                              </span>
                              <span>{formatCurrency(item.lineTotal)}</span>
                            </div>
                          ))}
                        </div>
                        {sale.notes && (
                          <p className="mt-2 text-xs text-gray-500 italic">Not: {sale.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Orders History */}
              {history.orders.length > 0 && (
                <div className="card p-0 overflow-hidden">
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <h3 className="font-semibold text-gray-900">📝 Sipariş Geçmişi ({history.orders.length})</h3>
                  </div>
                  <div className="divide-y max-h-72 overflow-y-auto">
                    {history.orders.map((order: any) => (
                      <div key={order.id} className="px-6 py-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">
                              {order.orderType === 'Custom' ? '🔧 Özel Üretim' : '📦 Rezervasyon'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              order.status === 'Completed' || order.status === 'Delivered'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {STATUS_LABELS[order.status] || order.status}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(order.orderDate)}</span>
                        </div>
                        {order.customOrder && (
                          <p className="text-sm text-gray-600">
                            {order.customOrder.productType} · {order.customOrder.dimensions}
                            {order.customOrder.deliveryDeadline && (
                              <span className="ml-2 text-gray-400">
                                Termin: {formatDate(order.customOrder.deliveryDeadline)}
                              </span>
                            )}
                          </p>
                        )}
                        {order.reservationOrder?.items?.map((item: any) => (
                          <p key={item.id} className="text-sm text-gray-600">
                            {item.variant.product.name} · {item.variant.color} {item.variant.dimension} ×{item.quantity}
                          </p>
                        ))}
                        {order.notes && (
                          <p className="mt-1 text-xs text-gray-500 italic">Not: {order.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {history.sales.length === 0 && history.orders.length === 0 && (
                <div className="card text-center text-gray-500 py-8">
                  Bu müşteriye ait kayıt bulunamadı
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {modal === 'add' ? '+ Yeni Müşteri' : '✏️ Müşteri Düzenle'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad *</label>
                <input type="text" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-field" placeholder="Müşteri adı soyadı"
                  autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input type="tel" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="input-field" placeholder="+90 555 123 4567" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                <input type="email" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input-field" placeholder="ornek@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                <textarea value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="input-field" rows={2} placeholder="Adres bilgisi" />
              </div>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {formError}
                </div>
              )}
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button onClick={() => { setModal(null); setFormError(''); }} className="flex-1 btn-secondary">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
