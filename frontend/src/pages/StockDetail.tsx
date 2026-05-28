import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { reportApi, stockApi } from '../lib/api';

export default function StockDetail() {
  const { variantId } = useParams<{ variantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['variant-movements', variantId],
    queryFn: () => reportApi.getVariantMovements(variantId!).then(res => res.data),
    enabled: !!variantId,
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => stockApi.deleteEntry(id),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
    onError: (err: any) => alert(err.response?.data?.error || 'Silinemedi'),
  });

  const deleteExitMutation = useMutation({
    mutationFn: (id: string) => stockApi.deleteExit(id),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
    onError: (err: any) => alert(err.response?.data?.error || 'Silinemedi'),
  });

  const handleDelete = (m: any) => {
    if (m.operation === 'Satış' || m.operation === 'Sipariş Rezervasyonu') {
      alert('Satış veya sipariş kaynaklı kayıtlar silinemez');
      return;
    }
    if (!confirm('Bu hareketi silmek istediğinizden emin misiniz? Stok miktarı güncellenir.')) return;

    if (m.type === 'entry') {
      deleteEntryMutation.mutate(m.id);
    } else {
      deleteExitMutation.mutate(m.id);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Yükleniyor...</div>;
  }

  if (!data) return null;

  const { variant, movements } = data;

  const totalEntry = movements.filter((m: any) => m.type === 'entry').reduce((s: number, m: any) => s + m.quantity, 0);
  const totalExit = movements.filter((m: any) => m.type === 'exit').reduce((s: number, m: any) => s + m.quantity, 0);
  const totalSale = movements.filter((m: any) => m.operation === 'Satış').reduce((s: number, m: any) => s + m.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/stock')}
          className="text-gray-500 hover:text-gray-700 text-sm flex items-center space-x-1 btn-secondary py-1 px-3">
          ← Stok Listesi
        </button>
      </div>

      {/* Variant Info */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{variant.productName}</h1>
            <p className="text-gray-500 mt-1">
              {[variant.color, variant.dimension].filter(Boolean).join(' · ')}
              <span className="ml-3 text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{variant.sku}</span>
            </p>
          </div>
          <div className="flex space-x-6 text-center">
            <div>
              <p className="text-sm text-gray-500">Normal Stok</p>
              <p className="text-3xl font-bold text-gray-900">{variant.currentStock}</p>
            </div>
            {variant.secondQualityStock > 0 && (
              <div>
                <p className="text-sm text-gray-500">2. Kalite</p>
                <p className="text-3xl font-bold text-yellow-600">{variant.secondQualityStock}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Toplam Giriş</p>
          <p className="text-2xl font-bold text-green-600">+{totalEntry}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Toplam Çıkış</p>
          <p className="text-2xl font-bold text-red-600">-{totalExit}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Satış Çıkışı</p>
          <p className="text-2xl font-bold text-blue-600">{totalSale}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Hareket Sayısı</p>
          <p className="text-2xl font-bold text-gray-900">{movements.length}</p>
        </div>
      </div>

      {/* Movements Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Stok Hareketleri</h2>
          <p className="text-xs text-gray-400">Satış/sipariş kaynaklı hareketler silinemez</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tür</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Miktar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notlar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sil</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Hareket kaydı bulunamadı
                  </td>
                </tr>
              ) : (
                movements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(m.date)}
                    </td>
                    <td className="px-4 py-3">
                      {m.type === 'entry' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          ↑ Giriş
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          ↓ Çıkış
                        </span>
                      )}
                      {m.isSecondQuality && (
                        <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          2. Kalite
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {m.operation}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {m.customerName ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-gray-400">👤</span>
                          <span className="font-medium text-gray-800">{m.customerName}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold text-lg ${m.type === 'entry' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.type === 'entry' ? '+' : '-'}{m.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {m.notes || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{m.user}</td>
                    <td className="px-4 py-3 text-center">
                      {(m.operation !== 'Satış' && m.operation !== 'Sipariş Rezervasyonu') ? (
                        <button
                          onClick={() => handleDelete(m)}
                          disabled={deleteEntryMutation.isPending || deleteExitMutation.isPending}
                          className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                          title="Kaydı sil"
                        >
                          🗑️ Sil
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
