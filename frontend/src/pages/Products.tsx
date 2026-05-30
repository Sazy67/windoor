import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../lib/api';
import type { Product, ProductVariant } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import { useLang, useAuth } from '../App';

type ModalType = 'addProduct' | 'editProduct' | 'addVariant' | null;

const CATEGORIES = ['Gate', 'Window', 'Panel', 'Accessory', 'Consumable'];
const SUBCATEGORIES: Record<string, string[]> = {
  Gate: ['Interior_Gate', 'Exterior_Gate'],
  Window: ['Tilt_And_Turn', 'Fixed', 'Sliding', 'French_Door', 'Folding'],
  Panel: ['Interior_Panel', 'Exterior_Panel'],
};

export default function Products() {
  const queryClient = useQueryClient();
  const { t } = useLang();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [form, setForm] = useState({ name: '', category: 'Gate', subcategory: '', brand: '', isEndOfLife: false });
  const [variantForm, setVariantForm] = useState({ color: '', dimension: '', type: '', material: '', salePrice: 0, minimumStockLevel: 10, sku: '' });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', debouncedSearch, filterCategory],
    queryFn: () => productApi.getProducts({ search: debouncedSearch || undefined, category: filterCategory || undefined }).then(res => res.data),
  });

  const createProductMutation = useMutation({ mutationFn: (data: any) => productApi.createProduct(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setModal(null); resetForm(); } });
  const updateProductMutation = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => productApi.updateProduct(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setModal(null); } });
  const deleteProductMutation = useMutation({ mutationFn: (id: string) => productApi.deleteProduct(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }) });
  const createVariantMutation = useMutation({ mutationFn: ({ productId, data }: { productId: string; data: any }) => productApi.createVariant(productId, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setModal(null); resetVariantForm(); } });
  const deleteVariantMutation = useMutation({ mutationFn: (id: string) => productApi.deleteVariant(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }) });

  const resetForm = () => setForm({ name: '', category: 'Gate', subcategory: '', brand: '', isEndOfLife: false });
  const resetVariantForm = () => setVariantForm({ color: '', dimension: '', type: '', material: '', salePrice: 0, minimumStockLevel: 10, sku: '' });

  const openEdit = (product: Product) => {
    setSelectedProduct(product);
    setForm({ name: product.name, category: product.category, subcategory: product.subcategory || '', brand: product.brand, isEndOfLife: product.isEndOfLife });
    setModal('editProduct');
  };

  const handleSaveProduct = () => {
    if (modal === 'addProduct') createProductMutation.mutate({ ...form, createdById: user.id });
    else if (modal === 'editProduct' && selectedProduct) updateProductMutation.mutate({ id: selectedProduct.id, data: form });
  };

  const handleSaveVariant = () => {
    if (!selectedProduct) return;
    createVariantMutation.mutate({ productId: selectedProduct.id, data: { ...variantForm, color: variantForm.color || undefined, type: variantForm.type || undefined, material: variantForm.material || undefined } });
  };

  const stockStatus = (variant: ProductVariant) => {
    const qty = variant.stock?.quantity || 0;
    if (qty === 0) return <span className="badge-red">{t.products.noStock}</span>;
    if (qty <= variant.minimumStockLevel) return <span className="badge-yellow">{t.products.critical}</span>;
    return <span className="badge-green">{t.products.sufficient}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{t.products.title}</h1>
          <p className="mt-1" style={{ color: 'var(--muted)' }}>{t.products.subtitle}</p>
        </div>
        {isAdmin && <button onClick={() => { resetForm(); setModal('addProduct'); }} className="btn-primary">{t.products.newProduct}</button>}
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <input type="text" placeholder={t.products.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} className="input-field" />
          </div>
          <div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field w-auto">
              <option value="">{t.products.allCategories}</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="card text-center" style={{ color: 'var(--muted)' }}>{t.common.loading}</div>
        ) : products && products.length > 0 ? (
          products.map(product => (
            <div key={product.id} className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400">{expandedProduct === product.id ? '▼' : '▶'}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.category} {product.subcategory && `/ ${product.subcategory}`} · {product.brand}</p>
                  </div>
                  {product.isEndOfLife && <span className="badge-gray">{t.products.endOfLife}</span>}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{product.variants?.length || 0} {t.products.variants}</span>
                  {isAdmin && <>
                    <button onClick={e => { e.stopPropagation(); setSelectedProduct(product); setModal('addVariant'); }} className="text-sm text-primary-600 hover:text-primary-700 font-medium px-2 py-1">{t.products.addVariant}</button>
                    <button onClick={e => { e.stopPropagation(); openEdit(product); }} className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1">{t.common.edit}</button>
                    <button onClick={e => { e.stopPropagation(); if (confirm(t.products.confirmDeleteProduct)) deleteProductMutation.mutate(product.id); }} className="text-sm text-red-600 hover:text-red-700 px-2 py-1">{t.common.delete}</button>
                  </>}
                </div>
              </div>
              {expandedProduct === product.id && product.variants && product.variants.length > 0 && (
                <div className="border-t overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t.common.color}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t.common.dimension}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t.common.type}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{t.common.price}</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">{t.stock.stock}</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">{t.common.status}</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {product.variants.map(variant => (
                        <tr key={variant.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-xs text-gray-500">{variant.sku}</td>
                          <td className="px-4 py-2 text-sm">{variant.color || '-'}</td>
                          <td className="px-4 py-2 text-sm">{variant.dimension}</td>
                          <td className="px-4 py-2 text-sm">{variant.type || '-'}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium">{variant.salePrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                          <td className="px-4 py-2 text-sm text-center">{variant.stock?.quantity || 0}</td>
                          <td className="px-4 py-2 text-center">{stockStatus(variant)}</td>
                          <td className="px-4 py-2 text-center">
                            {isAdmin && <button onClick={() => { if (confirm(t.products.confirmDeleteVariant)) deleteVariantMutation.mutate(variant.id); }} className="text-xs text-red-600 hover:text-red-700">{t.common.delete}</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="card text-center text-gray-500 py-12">{t.products.noProducts}</div>
        )}
      </div>

      {(modal === 'addProduct' || modal === 'editProduct') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">{modal === 'addProduct' ? t.products.addProductTitle : t.products.editProductTitle}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.products.productName}</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.common.category} *</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, subcategory: '' })} className="input-field">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.products.subcategory}</label>
                  <select value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })} className="input-field">
                    <option value="">{t.products.select}</option>
                    {(SUBCATEGORIES[form.category] || []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.common.brand} *</label>
                <input type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="input-field" />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="endOfLife" checked={form.isEndOfLife} onChange={e => setForm({ ...form, isEndOfLife: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="endOfLife" className="text-sm text-gray-700">{t.products.endOfLife}</label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={handleSaveProduct} disabled={!form.name || !form.brand || createProductMutation.isPending || updateProductMutation.isPending} className="flex-1 btn-primary disabled:opacity-50">{t.common.save}</button>
              <button onClick={() => { setModal(null); resetForm(); }} className="flex-1 btn-secondary">{t.common.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'addVariant' && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-1">{t.products.addVariantTitle}</h2>
            <p className="text-sm text-gray-500 mb-4">{selectedProduct.name}</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.common.color}</label>
                  <input type="text" value={variantForm.color} onChange={e => setVariantForm({ ...variantForm, color: e.target.value })} className="input-field" placeholder="e.g. black, white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.common.dimension} *</label>
                  <input type="text" value={variantForm.dimension} onChange={e => setVariantForm({ ...variantForm, dimension: e.target.value })} className="input-field" placeholder="e.g. 24x36" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.common.type}</label>
                  <input type="text" value={variantForm.type} onChange={e => setVariantForm({ ...variantForm, type: e.target.value })} className="input-field" placeholder="e.g. Tilt_And_Turn" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.common.material}</label>
                  <input type="text" value={variantForm.material} onChange={e => setVariantForm({ ...variantForm, material: e.target.value })} className="input-field" placeholder="e.g. Aluminum" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.products.salePrice}</label>
                  <input type="number" min={0.01} step={0.01} value={variantForm.salePrice} onChange={e => setVariantForm({ ...variantForm, salePrice: parseFloat(e.target.value) })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.products.minStock}</label>
                  <input type="number" min={0} value={variantForm.minimumStockLevel} onChange={e => setVariantForm({ ...variantForm, minimumStockLevel: parseInt(e.target.value) })} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.products.sku}</label>
                <input type="text" value={variantForm.sku} onChange={e => setVariantForm({ ...variantForm, sku: e.target.value })} className="input-field" placeholder="Stock code" />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={handleSaveVariant} disabled={!variantForm.dimension || !variantForm.sku || variantForm.salePrice <= 0 || createVariantMutation.isPending} className="flex-1 btn-primary disabled:opacity-50">{t.common.save}</button>
              <button onClick={() => { setModal(null); resetVariantForm(); }} className="flex-1 btn-secondary">{t.common.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
