import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, createContext, useContext } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Stock from './pages/Stock';
import Sales from './pages/Sales';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Returns from './pages/Returns';
import Customers from './pages/Customers';
import StockDetail from './pages/StockDetail';
import SalesHistory from './pages/SalesHistory';
import Help from './pages/Help';
import type { User } from './lib/api';
import { translations, type Lang } from './lib/i18n';

// ── Theme Context ──────────────────────────────────────────
interface ThemeCtx { dark: boolean; toggle: () => void; }
export const ThemeContext = createContext<ThemeCtx>({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

// ── Language Context ───────────────────────────────────────
interface LangCtx { lang: Lang; toggle: () => void; t: typeof translations.tr; }
export const LangContext = createContext<LangCtx>({ lang: 'tr', toggle: () => {}, t: translations.tr });
export const useLang = () => useContext(LangContext);

// ── Query Client ───────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || 'tr');

  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { root.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [dark]);

  useEffect(() => { localStorage.setItem('lang', lang); }, [lang]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleLogin = (userData: User) => { setUser(userData); localStorage.setItem('user', JSON.stringify(userData)); };
  const handleLogout = () => { setUser(null); localStorage.removeItem('user'); };

  const themeCtx: ThemeCtx = { dark, toggle: () => setDark(d => !d) };
  const langCtx: LangCtx = { lang, toggle: () => setLang(l => l === 'tr' ? 'en' : 'tr'), t: translations[lang] as typeof translations.tr };

  if (!user) {
    return (
      <ThemeContext.Provider value={themeCtx}>
        <LangContext.Provider value={langCtx}>
          <QueryClientProvider client={queryClient}>
            <Login onLogin={handleLogin} />
          </QueryClientProvider>
        </LangContext.Provider>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={themeCtx}>
      <LangContext.Provider value={langCtx}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Layout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/stock" element={<Stock />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/sales/history" element={<SalesHistory />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/returns" element={<Returns />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/stock/:variantId" element={<StockDetail />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/help" element={<Help />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </QueryClientProvider>
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;
