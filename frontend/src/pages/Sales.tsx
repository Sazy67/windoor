import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi, salesApi, customerApi, orderApi } from '../lib/api';
import type { ProductVariant, Customer } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';

interface CartItem {
  variant: ProductVariant;
  quantity: number;
  unitPrice: number; // düzenlenebilir fiyat
}

const fmt = (v: number) => v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

export default function Sales() {
  const queryClient = useQueryClient();

  // Sol panel
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Sağ panel - sepet
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');

  // Müşteri
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Bildirimler
  const [showSuccess, setShowSuccess] = useState('');
  const [error, setError] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Ürünler
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', debouncedSearchTerm, selectedCategory],
    queryFn: () => productApi.getProducts({
      search: debouncedSearchTerm || undefined,
      category: selectedCategory || undefined,
    }).then(res => res.data),
  });

  // Müşteriler
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.getCustomers().then(res => res.data),
  });

  const filteredCustomers = useMemo(() => {
    if (!customers || !customerSearch.trim()) return customers || [];
    return customers.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  // Satış mutation
  const createSaleMutation = useMutation({
    mutationFn: (data: any) => salesApi.createSale(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['recent-sales'] });
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setNotes('');
      setShowSuccess('Satış başarıyla tamamlandı!');
      setTimeout(() => setShowSuccess(''), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Satış işlemi başarısız';
      const details = err.response?.data?.details;
      setError(details
        ? `${msg}: ${details.map((d: any) => `${d.sku} (İstenen: ${d.requested}, Mevcut: ${d.available})`).join(', ')}`
        : msg
      );
    },
  });

  // Sepet işlemleri
  const addToCart = (variant: ProductVariant) => {
    setError('');
    const stock = variant.stock?.quantity || 0;
    const inCart = cart.find(i => i.variant.id === variant.id)?.quantity || 0;

    if (inCart >= stock) {
      setError(`Stok yetersiz: ${variant.product?.name} için maksimum ${stock} adet eklenebilir`);
      return;
    }

    const existing = cart.find(i => i.variant.id === variant.id);
    if (existing) {
      setCart(cart.map(i => i.variant.id === variant.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { variant, quantity: 1, unitPrice: variant.salePrice }]);
    }
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(i => i.variant.id !== variantId));
      return;
    }
    const variant = cart.find(i => i.variant.id === variantId)?.variant;
    const maxStock = variant?.stock?.quantity || 0;
    if (quantity > maxStock) {
      setError(`Stok yetersiz: maksimum ${maxStock} adet`);
      return;
    }
    setCart(cart.map(i => i.variant.id === variantId ? { ...i, quantity } : i));
  };

  const updatePrice = (variantId: string, price: number) => {
    if (price < 0) return;
    setCart(cart.map(i => i.variant.id === variantId ? { ...i, unitPrice: price } : i));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  // Müşteri seç veya yeni oluştur
  const resolveCustomer = async (): Promise<string | null> => {
    if (selectedCustomer) return selectedCustomer.id;
    if (customerSearch.trim()) {
      // Yeni müşteri oluştur
      const res = await customerApi.createCustomer({ name: customerSearch.trim() });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelectedCustomer(res.data);
      return res.data.id;
    }
    return null;
  };

  const handleSale = async () => {
    setError('');
    if (!customerSearch.trim() && !selectedCustomer) {
      setError('Lütfen müşteri adı girin veya seçin');
      return;
    }
    if (cart.length === 0) {
      setError('Sepet boş');
      return;
    }
    try {
      const customerId = await resolveCustomer();
      if (!customerId) { setError('Müşteri belirlenemedi'); return; }

      createSaleMutation.mutate({
        customerId,
        items: cart.map(i => ({ variantId: i.variant.id, quantity: i.quantity })),
        notes: notes || undefined,
        createdById: user.id,
      });
    } catch {
      setError('Müşteri oluşturulurken hata oluştu');
    }
  };

  const handleCreateOrder = async () => {
    setError('');
    if (!customerSearch.trim() && !selectedCustomer) {
      setError('Lütfen müşteri adı girin veya seçin');
      return;
    }
    if (cart.length === 0) {
      setError('Sepet boş');
      return;
    }
    try {
      const customerId = await resolveCustomer();
      if (!customerId) { setError('Müşteri belirlenemedi'); return; }

      await orderApi.createReservationOrder({
        customerId,
        items: cart.map(i => ({ variantId: i.variant.id, quantity: i.quantity, unitPrice: i.unitPrice })),
        notes: notes || undefined,
        createdById: user.id,
      });
      queryClient.invalidateQueries({ queryKey: ['orders', 'stock', 'products'] });
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setNotes('');
      setShowSuccess('Rezervasyon siparişi oluşturuldu! Stoktan düşüldü.');
      setTimeout(() => setShowSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Sipariş oluşturulurken hata oluştu');
    }
  };

  const categories = ['Gate', 'Window', 'Panel', 'Accessory', 'Consumable'];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Satış Ekranı</h1>
        <p className="text-gray-600 mt-1">Ürün seçin, müşteri belirleyin ve satışı tamamlayın</p>
      </div>

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg font-medium">
          ✅ {showSuccess}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          ❌ {error}
          <button onClick={() => setError('')} className="ml-3 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── SOL PANEL: Ürün Arama ── */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Ürün Listesi</h2>

          {/* Arama */}
          <input
            type="text"
            placeholder="Ürün adı ara..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input-field mb-3"
          />

          {/* Kategori filtreleri */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === ''
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              }`}
            >
              Tümü
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Ürün listesi */}
          <div className="border rounded-lg max-h-[500px] overflow-y-auto divide-y">
            {isLoading ? (
              <div className="p-6 text-center text-gray-400">Yükleniyor...</div>
            ) : products && products.length > 0 ? (
              products.flatMap(product =>
                (product.variants || []).map(variant => {
                  const stock = variant.stock?.quantity || 0;
                  const inCart = cart.find(i => i.variant.id === variant.id)?.quantity || 0;
                  const canAdd = stock > inCart;

                  return (
                    <div
                      key={variant.id}
                      onClick={() => canAdd && addToCart({ ...variant, product })}
                      className={`p-3 flex items-center justify-between transition-colors ${
                        canAdd
                          ? 'cursor-pointer hover:bg-blue-50'
                          : 'opacity-40 cursor-not-allowed bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">
                          {[variant.color, variant.dimension, variant.type].filter(Boolean).join(' · ')}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-medium ${stock === 0 ? 'text-red-500' : stock <= 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                            Stok: {stock}
                          </span>
                          {inCart > 0 && (
                            <span className="text-xs text-blue-600 font-medium">Sepette: {inCart}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p className="font-bold text-blue-700">{fmt(variant.salePrice)}</p>
                        {canAdd && <span className="text-xs text-blue-400">+ Ekle</span>}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              <div className="p-6 text-center text-gray-400">Ürün bulunamadı</div>
            )}
          </div>
        </div>

        {/* ── SAĞ PANEL: Sepet ── */}
        <div className="card flex flex-col">
          <h2 className="text-lg font-semibold mb-3">Sepet</h2>

          {/* Müşteri seçimi */}
          <div className="mb-3 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Müşteri *
              {selectedCustomer && (
                <span className="ml-2 text-xs text-green-600 font-normal">✓ Seçildi</span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedCustomer ? selectedCustomer.name : customerSearch}
                onChange={e => {
                  setSelectedCustomer(null);
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className={`input-field flex-1 ${selectedCustomer ? 'bg-green-50 border-green-300' : ''}`}
                placeholder="Müşteri adı yaz veya seç..."
              />
              {selectedCustomer && (
                <button
                  onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                  className="px-3 py-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg"
                  title="Müşteriyi kaldır"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Müşteri dropdown */}
            {showCustomerDropdown && !selectedCustomer && customerSearch.trim() && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  <>
                    {filteredCustomers.slice(0, 8).map(c => (
                      <div
                        key={c.id}
                        onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerDropdown(false); }}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                      >
                        <p className="font-medium text-sm">{c.name}</p>
                        {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                      </div>
                    ))}
                    <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">
                      Listede yoksa yeni müşteri olarak kaydedilir
                    </div>
                  </>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    "{customerSearch}" — yeni müşteri olarak kaydedilecek
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sepet içeriği */}
          <div
            className="border rounded-lg flex-1 overflow-hidden"
            style={{ minHeight: '200px', maxHeight: '300px', overflowY: 'auto' }}
            onClick={() => setShowCustomerDropdown(false)}
          >
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                Sepet boş — sol taraftan ürün seçin
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Ürün</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Adet</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Birim Fiyat ✏️</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Toplam</th>
                    <th className="px-3 py-2 w-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cart.map(item => (
                    <tr key={item.variant.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <p className="font-medium leading-tight text-gray-900">{item.variant.product?.name}</p>
                        <p className="text-xs text-gray-400">
                          {[item.variant.color, item.variant.dimension].filter(Boolean).join(' · ')}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
                            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 font-bold text-sm"
                          >−</button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 font-bold text-sm"
                          >+</button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500 text-xs">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitPrice}
                            onChange={e => updatePrice(item.variant.id, parseFloat(e.target.value) || 0)}
                            className="w-24 text-right border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                          />
                          {item.unitPrice !== item.variant.salePrice && (
                            <button
                              onClick={() => updatePrice(item.variant.id, item.variant.salePrice)}
                              title="Liste fiyatına sıfırla"
                              className="text-gray-400 hover:text-blue-500 text-base"
                            >↺</button>
                          )}
                        </div>
                        {item.unitPrice !== item.variant.salePrice && (
                          <p className="text-xs text-orange-500 text-right mt-0.5">
                            Liste: {fmt(item.variant.salePrice)}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {fmt(item.unitPrice * item.quantity)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => setCart(cart.filter(i => i.variant.id !== item.variant.id))}
                          className="text-red-400 hover:text-red-600 font-bold text-xs"
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Toplam */}
          <div className="mt-3 bg-gray-50 rounded-lg px-4 py-3 flex justify-between items-center">
            <div>
              <span className="font-semibold text-gray-700">Toplam</span>
              <span className="ml-2 text-xs text-gray-400">({cart.reduce((s, i) => s + i.quantity, 0)} adet)</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{fmt(cartTotal)}</span>
          </div>

          {/* Notlar */}
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input-field"
              rows={2}
              placeholder="Opsiyonel notlar..."
            />
          </div>

          {/* Butonlar */}
          <div className="flex space-x-3 mt-4">
            <button
              onClick={handleSale}
              disabled={cart.length === 0 || (!customerSearch.trim() && !selectedCustomer) || createSaleMutation.isPending}
              className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-base"
              style={{ backgroundColor: '#16a34a' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#15803d')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#16a34a')}
            >
              {createSaleMutation.isPending ? '⏳ İşleniyor...' : '💰 SAT'}
            </button>
            <button
              onClick={handleCreateOrder}
              disabled={cart.length === 0 || (!customerSearch.trim() && !selectedCustomer)}
              className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-base"
              style={{ backgroundColor: '#2563eb' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2563eb')}
            >
              📝 SİPARİŞ OLUŞTUR
            </button>
          </div>

          {/* Bilgi notu */}
          <div className="mt-2 text-xs text-gray-400 text-center">
            SAT → Stoktan düşer · SİPARİŞ OLUŞTUR → Rezervasyon, stoktan düşer
          </div>
        </div>
      </div>
    </div>
  );
}
