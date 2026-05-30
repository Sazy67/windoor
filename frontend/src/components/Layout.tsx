import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { User } from '../lib/api';
import { useTheme, useLang } from '../App';

interface LayoutProps {
  children: ReactNode;
  user: User;
  onLogout: () => void;
}

const navigation: Array<{ key: string; path: string; icon: string; exact?: boolean }> = [
  { key: 'dashboard',    path: '/',              icon: '⊞',  exact: true },
  { key: 'products',     path: '/products',      icon: '⬡'              },
  { key: 'stock',        path: '/stock',         icon: '▤'              },
  { key: 'sales',        path: '/sales',         icon: '◈'              },
  { key: 'salesHistory', path: '/sales/history', icon: '≡'              },
  { key: 'orders',       path: '/orders',        icon: '◻'              },
  { key: 'returns',      path: '/returns',       icon: '↺'              },
  { key: 'customers',    path: '/customers',     icon: '◯'              },
  { key: 'reports',      path: '/reports',       icon: '◬'              },
  { key: 'help',         path: '/help',          icon: '?',  exact: true },
];

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const location = useLocation();
  const { dark, toggle } = useTheme();
  const { lang, toggle: toggleLang, t } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    if (path === '/sales' && location.pathname === '/sales/history') return false;
    return location.pathname.startsWith(path);
  };

  const currentKey = navigation.find(n => isActive(n.path, n.exact))?.key;
  const currentPage = currentKey ? t.nav[currentKey as keyof typeof t.nav] : 'Windoor';

  const closeSidebar = () => setSidebarOpen(false);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))', boxShadow: '0 2px 8px rgba(99,102,241,.35)' }}
          >
            W
          </div>
          <div>
            <p className="font-bold text-base leading-none" style={{ color: 'var(--text)' }}>Windoor</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {lang === 'tr' ? 'Stok Yönetim' : 'Stock Management'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navigation.map(item => {
          const active = isActive(item.path, item.exact);
          const label = t.nav[item.key as keyof typeof t.nav];
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className="flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-sm font-medium"
              style={{
                color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                borderLeft: active ? '2px solid var(--sidebar-active-border)' : '2px solid transparent',
                fontWeight: active ? 600 : 500,
                minHeight: '44px',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-hover-text)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <span className="text-lg w-6 text-center flex-shrink-0">{item.icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2 text-sm transition-all"
          style={{ color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', minHeight: '44px', fontFamily: 'inherit' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
        >
          <span className="text-base">🌐</span>
          <span className="font-medium">{lang === 'tr' ? 'English' : 'Türkçe'}</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2 text-sm transition-all"
          style={{ color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', minHeight: '44px', fontFamily: 'inherit' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
        >
          <span className="text-base">{dark ? '☀️' : '🌙'}</span>
          <span className="font-medium">{dark ? t.common.lightMode : t.common.darkMode}</span>
        </button>

        {/* User card */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--brand), #8b5cf6)' }}>
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{user.displayName}</p>
            <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{user.username}</p>
          </div>
          <button
            onClick={onLogout}
            title={t.common.logout}
            className="text-sm transition-colors flex-shrink-0 p-1"
            style={{ color: 'var(--muted-2)', minWidth: '32px', minHeight: '32px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-2)')}
          >
            ⏻
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col" style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)', minHeight: '100vh', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', transition: 'background 0.2s, border-color 0.2s' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)' }} onClick={closeSidebar} />
      )}

      {/* Mobile Drawer */}
      <aside className="fixed top-0 left-0 h-full z-50 flex flex-col lg:hidden" style={{ width: '280px', background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)', transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease, background 0.2s', overflowY: 'auto' }}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-8 py-3 flex-shrink-0" style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--header-border)', boxShadow: '0 1px 3px rgba(0,0,0,.04)', transition: 'background 0.2s, border-color 0.2s', minHeight: '56px' }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg" style={{ color: 'var(--text)', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
              <span className="block w-5 h-0.5 mb-1" style={{ background: 'var(--text)', borderRadius: '2px' }} />
              <span className="block w-5 h-0.5 mb-1" style={{ background: 'var(--text)', borderRadius: '2px' }} />
              <span className="block w-5 h-0.5" style={{ background: 'var(--text)', borderRadius: '2px' }} />
            </button>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{currentPage}</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--brand-light)', color: 'var(--brand-text)' }}>
            {user.role ?? 'Admin'}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
