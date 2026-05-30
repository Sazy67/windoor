import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../lib/api';
import type { User } from '../lib/api';
import { useLang, useAuth } from '../App';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');

export default function Users() {
  const queryClient = useQueryClient();
  const { t } = useLang();
  const { user: currentUser } = useAuth();
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', displayName: '', password: '', role: 'user' });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: { username: string; displayName: string; password: string; role: string }) =>
      userApi.createUser(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
    onError: (err: any) => setError(err.response?.data?.error || 'Hata oluştu'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => userApi.updateUser(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
    onError: (err: any) => setError(err.response?.data?.error || 'Hata oluştu'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userApi.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => alert(err.response?.data?.error || 'Silinemedi'),
  });

  const toggleActive = (user: User) => {
    if (user.id === currentUser?.id) return;
    updateMutation.mutate({ id: user.id, data: { isActive: !user.isActive } });
  };

  const openAdd = () => {
    setForm({ username: '', displayName: '', password: '', role: 'user' });
    setError('');
    setModal('add');
  };

  const openEdit = (user: User) => {
    setEditTarget(user);
    setForm({ username: user.username, displayName: user.displayName, password: '', role: user.role });
    setError('');
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setEditTarget(null); setError(''); };

  const handleSubmit = () => {
    setError('');
    if (modal === 'add') {
      if (!form.username.trim() || !form.displayName.trim() || !form.password.trim()) {
        setError('Tüm alanlar zorunludur'); return;
      }
      createMutation.mutate({ username: form.username.trim(), displayName: form.displayName.trim(), password: form.password, role: form.role });
    } else if (modal === 'edit' && editTarget) {
      const data: any = { displayName: form.displayName.trim(), role: form.role };
      if (form.password.trim()) data.password = form.password;
      updateMutation.mutate({ id: editTarget.id, data });
    }
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUser?.id) { alert(t.users.cannotDeleteSelf); return; }
    if (!confirm(t.users.confirmDelete)) return;
    deleteMutation.mutate(user.id);
  };

  const filtered = (users || []).filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{t.users.title}</h1>
          <p className="mt-1" style={{ color: 'var(--muted)' }}>{t.users.subtitle}</p>
        </div>
        <button onClick={openAdd} className="btn-primary">{t.users.newUser}</button>
      </div>

      <div className="card">
        <input type="text" placeholder={t.users.searchPlaceholder} value={search}
          onChange={e => setSearch(e.target.value)} className="input-field max-w-sm" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.users.displayName}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.users.username}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t.users.role}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t.users.isActive}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.users.createdAt}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t.common.loading}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t.users.noUsers}</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>
                    {u.displayName}
                    {u.id === currentUser?.id && <span className="ml-2 text-xs text-blue-500">(sen)</span>}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>{u.username}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
                      {u.role === 'admin' ? t.users.roleAdmin : t.users.roleUser}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={u.id === currentUser?.id || updateMutation.isPending}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${u.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>{u.createdAt ? fmtDate(u.createdAt) : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openEdit(u)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">{t.common.edit}</button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => handleDelete(u)} disabled={deleteMutation.isPending} className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50">{t.common.delete}</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              {modal === 'add' ? t.users.addTitle : t.users.editTitle}
            </h2>
            <div className="space-y-4">
              {modal === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.users.username} *</label>
                  <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="input-field" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.users.displayName} *</label>
                <input type="text" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {modal === 'add' ? `${t.users.password} *` : t.users.passwordOptional}
                </label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={t.users.passwordPlaceholder} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.users.role}</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input-field">
                  <option value="admin">{t.users.roleAdmin}</option>
                  <option value="user">{t.users.roleUser}</option>
                </select>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">❌ {error}</div>}
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={handleSubmit} disabled={isPending} className="flex-1 btn-primary disabled:opacity-50">
                {isPending ? t.common.loading : modal === 'add' ? t.common.save : t.users.saveChanges}
              </button>
              <button onClick={closeModal} className="flex-1 btn-secondary">{t.common.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
