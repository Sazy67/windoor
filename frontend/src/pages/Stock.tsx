import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockApi } from '../lib/api';
import type { StockItem } from '../lib/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

type ModalType = 'entry' | 'exit' | null;
type SortKey = 'productName' | 'brand' | 'colorDimension' | 'quantity' | 'secondQualityQty' | 'status';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER: Record<string, number> = {
  Normal: 0, Low: 1, Out_Of_Stock: 2, Discontinued: 3,
};

export default function Stock() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [filterBrand, setFilterBrand] = useState('');
  const [searchName, setSearchName] = useState('');

  // URL'deki status parametresi değişirse state'i güncelle
  useEffect(() => {
    const s = searchParams.get('status') || '';
    setFilterStatus(s);
  }, [searchParams]);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('productName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Modal
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedVariantLabel, setSelectedVariantLabel] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [showModalDropdown, setShowModalDropdown] = useState(false);
  const [entryQty, setEntryQty] = useState(1);
  const [exitQty, setExitQty] = useState(1);
  const [isSecondQuality, setIsSecondQuality] = useState(false);
  const [exitReason, setExitReason] = useState('Damage');
  const [notes, setNotes] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const { data: stockList, isLoading } = useQuery({
    queryKey: ['stock', filterCategory, filterStatus],
    queryFn: () => stockApi.getStock({
      category: filterCategory || undefined,
      status: filterStatus || undefined,
    }).then(res => res.data),
  });

  const brands = useMemo(
    () => [...new Set(stockList?.map(i => i.brand).filter(Boolean) || [])].sort(),
    [stockList]
  );

  // Modal için arama filtresi
  const modalFilteredList = useMemo(() => {
    if (!stockList) return [];
    const q = modalSearch.toLowerCase();
    if (!q) return stockList;
    return stockList.filter(item =>
      item.productName.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.color || '').toLowerCase().includes(q) ||
      item.dimension.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q)
    );
  }, [stockList, modalSearch]);

  const displayStock = useMemo(() => {
    if (!stockList) return [];
    const filtered = stockList.filter(item => {
      const matchName = !searchName ||
        item.productName.toLowerCase().includes(searchName.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchName.toLowerCase());
      const matchBrand = !filterBrand ||
        item.brand.toLowerCase().includes(filterBrand.toLowerCase());
      return matchName && matchBrand;
    });

    return [...filtered].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      switch (sortKey) {
        case 'productName':
          valA = a.productName.toLowerCase(); valB = b.productName.toLowerCase(); break;
        case 'brand':
          valA = a.brand.toLowerCase(); valB = b.brand.toLowerCase(); break;
        case 'colorDimension':
          valA = `${a.color || ''} ${a.dimension}`.toLowerCase();
          valB = `${b.color || ''} ${b.dimension}`.toLowerCase(); break;
        case 'quantity':
          valA = a.quantity; valB = b.quantity; break;
        case 'secondQualityQty':
          valA = a.secondQualityQty; valB = b.secondQualityQty; break;
        case 'status':
          valA = STATUS_ORDER[a.status] ?? 99;
          valB = STATUS_ORDER[b.status] ?? 99; break;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [stockList, searchName, filterBrand, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col
      ? <span className="ml-1 text-gray-300">↕</span>
      : <span className="ml-1 text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>;

  const entryMutation = useMutation({
    mutationFn: (data: any) => stockApi.createEntry(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stock'] }); setModal(null); resetForm(); },
  });

  const exitMutation = useMutation({
    mutationFn: (data: any) => stockApi.createExit(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stock'] }); setModal(null); resetForm(); },
  });

  const resetForm = () => {
    setEntryQty(1); setExitQty(1); setIsSecondQuality(false);
    setExitReason('Damage'); setNotes(''); setSelectedVariantId('');
    setSelectedVariantLabel(''); setModalSearch(''); setShowModalDropdown(false);
  };

  const handleEntry = () => entryMutation.mutate({
    variantId: selectedVariantId, quantity: entryQty,
    isSecondQuality, notes: notes || undefined, createdById: user.id,
  });

  const handleExit = () => exitMutation.mutate({
    variantId: selectedVariantId, quantity: exitQty,
    reason: exitReason, notes: notes || undefined, createdById: user.id,
  });

  const statusBadge = (status: StockItem['status']) => {
    switch (status) {
      case 'Normal':       return <span className="badge-green">● Yeterli</span>;
      case 'Low':          return <span className="badge-yellow">● Kritik</span>;
      case 'Out_Of_Stock': return <span className="badge-red">● Stok Yok</span>;
      case 'Discontinued': return <span className="badge-gray">● End of Life</span>;
    }
  };

  const categories = ['Gate', 'Window', 'Panel', 'Accessory', 'Consumable'];
  const statuses = [
    { value: 'Normal', label: 'Yeterli' },
    { value: 'Low', label: 'Kritik' },
    { value: 'Out_Of_Stock', label: 'Stok Yok' },
  ];

  const thCls = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stok Yönetimi</h1>
          <p className="text-gray-600 mt-1">Anlık stok durumu</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setModal('entry')} className="btn-primary">+ Stok Girişi</button>
          <button onClick={() => setModal('exit')} className="btn-secondary">- Stok Çıkışı</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı / SKU</label>
            <input type="text" placeholder="Ürün adı veya SKU ara..."
              value={searchName} onChange={e => setSearchName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field w-auto">
              <option value="">Tüm Kategoriler</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
            <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="input-field w-auto">
              <option value="">Tüm Markalar</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select value={filterStatus} onChange={e => {
              const val = e.target.value;
              setFilterStatus(val);
              if (val) setSearchParams({ status: val });
              else setSearchParams({});
            }} className="input-field w-auto">
              <option value="">Tüm Durumlar</option>
              {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {(searchName || filterCategory || filterBrand || filterStatus) && (
            <div>
              <label className="block text-sm font-medium text-transparent mb-1">-</label>
              <button onClick={() => { setSearchName(''); setFilterCategory(''); setFilterBrand(''); setFilterStatus(''); setSearchParams({}); }}
                className="btn-secondary text-sm">✕ Temizle</button>
            </div>
          )}
        </div>
        {stockList && (
          <p className="mt-3 text-xs text-gray-500">
            {displayStock.length} / {stockList.length} ürün gösteriliyor
            <span className="ml-2 text-blue-500">
              · Sıralama: {sortKey} {sortDir === 'asc' ? '↑ (A→Z / Küçük→Büyük)' : '↓ (Z→A / Büyük→Küçük)'}
            </span>
          </p>
        )}
      </div>

      {/* Stock Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className={thCls} onClick={() => handleSort('productName')}>
                  Ürün Adı <SortIcon col="productName" />
                </th>
                <th className={thCls} onClick={() => handleSort('brand')}>
                  Marka <SortIcon col="brand" />
                </th>
                <th className={thCls} onClick={() => handleSort('colorDimension')}>
                  Renk / Ölçü <SortIcon col="colorDimension" />
                </th>
                <th className={`${thCls} text-center`} onClick={() => handleSort('quantity')}>
                  Stok <SortIcon col="quantity" />
                </th>
                <th className={`${thCls} text-center`} onClick={() => handleSort('secondQualityQty')}>
                  2. Kalite <SortIcon col="secondQualityQty" />
                </th>
                <th className={`${thCls} text-center`} onClick={() => handleSort('status')}>
                  Durum <SortIcon col="status" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Yükleniyor...</td></tr>
              ) : displayStock.length > 0 ? (
                displayStock.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.brand}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.color && <span className="mr-1">{item.color}</span>}
                      {item.dimension}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-900">{item.quantity}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{item.secondQualityQty}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(item.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => navigate(`/stock/${item.id}`)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium">Detay</button>
                        <button onClick={() => {
                          setSelectedVariantId(item.id);
                          setSelectedVariantLabel(`${item.productName} - ${item.color || ''} ${item.dimension}`.trim());
                          setModal('entry');
                        }}
                          className="text-xs text-green-600 hover:text-green-700 font-medium">Giriş</button>
                        <button onClick={() => {
                          setSelectedVariantId(item.id);
                          setSelectedVariantLabel(`${item.productName} - ${item.color || ''} ${item.dimension}`.trim());
                          setModal('exit');
                        }}
                          className="text-xs text-red-600 hover:text-red-700 font-medium">Çıkış</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {searchName || filterCategory || filterBrand || filterStatus
                    ? 'Filtreye uyan ürün bulunamadı'
                    : 'Stok kaydı bulunamadı'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Modal */}
      {modal === 'entry' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Stok Girişi</h2>
            <div className="space-y-4">

              {/* Ürün arama */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün Seç *
                  {selectedVariantId && <span className="ml-2 text-xs text-green-600">✓ Seçildi</span>}
                </label>
                <input
                  type="text"
                  placeholder="Ürün adı, renk, ölçü veya SKU yaz..."
                  value={selectedVariantId ? selectedVariantLabel : modalSearch}
                  onChange={e => {
                    setSelectedVariantId('');
                    setSelectedVariantLabel('');
                    setModalSearch(e.target.value);
                    setShowModalDropdown(true);
                  }}
                  onFocus={() => setShowModalDropdown(true)}
                  className={`input-field ${selectedVariantId ? 'bg-green-50 border-green-300' : ''}`}
                  autoFocus
                />
                {selectedVariantId && (
                  <button
                    onClick={() => { setSelectedVariantId(''); setSelectedVariantLabel(''); setModalSearch(''); }}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                  >✕</button>
                )}

                {/* Dropdown */}
                {showModalDropdown && !selectedVariantId && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {modalFilteredList.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">Ürün bulunamadı</div>
                    ) : (
                      modalFilteredList.map(item => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedVariantId(item.id);
                            setSelectedVariantLabel(`${item.productName} - ${[item.color, item.dimension].filter(Boolean).join(' ')}`);
                            setShowModalDropdown(false);
                            setModalSearch('');
                          }}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                        >
                          <p className="font-medium text-sm text-gray-900">{item.productName}</p>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-gray-500">
                              {[item.color, item.dimension].filter(Boolean).join(' · ')}
                              <span className="ml-2 text-gray-400">{item.sku}</span>
                            </p>
                            <span className="text-xs text-gray-500">Stok: {item.quantity}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Miktar</label>
                <input type="number" min={1} max={999999} value={entryQty}
                  onChange={e => setEntryQty(parseInt(e.target.value) || 1)} className="input-field" />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="secondQuality" checked={isSecondQuality}
                  onChange={e => setIsSecondQuality(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="secondQuality" className="text-sm text-gray-700">İkinci Kalite</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="input-field" rows={2} placeholder="Opsiyonel..." />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={handleEntry} disabled={!selectedVariantId || entryMutation.isPending}
                className="flex-1 btn-primary disabled:opacity-50">
                {entryMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button onClick={() => { setModal(null); resetForm(); }} className="flex-1 btn-secondary">İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Modal */}
      {modal === 'exit' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Stok Çıkışı</h2>
            <div className="space-y-4">

              {/* Ürün arama */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün Seç *
                  {selectedVariantId && <span className="ml-2 text-xs text-green-600">✓ Seçildi</span>}
                </label>
                <input
                  type="text"
                  placeholder="Ürün adı, renk, ölçü veya SKU yaz..."
                  value={selectedVariantId ? selectedVariantLabel : modalSearch}
                  onChange={e => {
                    setSelectedVariantId('');
                    setSelectedVariantLabel('');
                    setModalSearch(e.target.value);
                    setShowModalDropdown(true);
                  }}
                  onFocus={() => setShowModalDropdown(true)}
                  className={`input-field ${selectedVariantId ? 'bg-green-50 border-green-300' : ''}`}
                  autoFocus
                />
                {selectedVariantId && (
                  <button
                    onClick={() => { setSelectedVariantId(''); setSelectedVariantLabel(''); setModalSearch(''); }}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                  >✕</button>
                )}

                {/* Dropdown - sadece stokta olanlar */}
                {showModalDropdown && !selectedVariantId && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {modalFilteredList.filter(i => i.quantity > 0).length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">Stokta ürün bulunamadı</div>
                    ) : (
                      modalFilteredList.filter(i => i.quantity > 0).map(item => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedVariantId(item.id);
                            setSelectedVariantLabel(`${item.productName} - ${[item.color, item.dimension].filter(Boolean).join(' ')}`);
                            setShowModalDropdown(false);
                            setModalSearch('');
                          }}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                        >
                          <p className="font-medium text-sm text-gray-900">{item.productName}</p>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-gray-500">
                              {[item.color, item.dimension].filter(Boolean).join(' · ')}
                              <span className="ml-2 text-gray-400">{item.sku}</span>
                            </p>
                            <span className={`text-xs font-medium ${item.quantity <= item.minimumStockLevel ? 'text-yellow-600' : 'text-green-600'}`}>
                              Stok: {item.quantity}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Miktar</label>
                <input type="number" min={1} max={999999} value={exitQty}
                  onChange={e => setExitQty(parseInt(e.target.value) || 1)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sebep</label>
                <select value={exitReason} onChange={e => setExitReason(e.target.value)} className="input-field">
                  <option value="Damage">Hasar</option>
                  <option value="Other">Diğer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="input-field" rows={2} placeholder="Opsiyonel..." />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={handleExit} disabled={!selectedVariantId || exitMutation.isPending}
                className="flex-1 btn-danger disabled:opacity-50">
                {exitMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button onClick={() => { setModal(null); resetForm(); }} className="flex-1 btn-secondary">İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
