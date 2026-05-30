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
import Users from './pages/Users';
import Loglama from './pages/Loglama';
import type { User, AuthResponse } from './lib/api';
import { translations, type Lang } from './lib/i18n';

// ── Theme Context ──────────────────────────────────────────
interface ThemeCtx { dark: boolean; toggle: () => void; }
export const ThemeContext = createContext<ThemeCtx>({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

// ── Language Context ───────────────────────────────────────
interface LangCtx { lang: Lang; toggle: () => void; t: typeof translations.tr; }
export const LangContext = createContext<LangCtx>({ lang: 'tr', toggle: () => {}, t: translations.tr });
export const useLang = () => useContext(LangContext);

// ── Auth Context ───────────────────────────────────────────
interface AuthCtx { user: User | null; isAdmin: boolean; canWrite: boolean; }
export const AuthContext = createContext<AuthCtx>({ user: null, isAdmin: false, canWrite: false });
export const useAuth = () => useContext(AuthContext);

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
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      try {
        // Token expire kontrolü
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return;
        }
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (authData: AuthResponse) => {
    setUser(authData.user);
    localStorage.setItem('user', JSON.stringify(authData.user));
    localStorage.setItem('token', authData.token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    queryClient.clear();
  };

  const themeCtx: ThemeCtx = { dark, toggle: () => setDark(d => !d) };
  const langCtx: LangCtx = { lang, toggle: () => setLang(l => l === 'tr' ? 'en' : 'tr'), t: translations[lang] as typeof translations.tr };
  const authCtx: AuthCtx = {
    user,
    isAdmin: user?.role === 'admin',
    canWrite: user?.role === 'admin',
  };

  // /loglama sayfası — login gerektirmez ama token olmadan API'ye erişilemez
  if (window.location.pathname === '/loglama') {
    return (
      <QueryClientProvider client={queryClient}>
        <Loglama />
      </QueryClientProvider>
    );
  }

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
        <AuthContext.Provider value={authCtx}>
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
                  <Route path="/users" element={authCtx.isAdmin ? <Users /> : <Navigate to="/" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </BrowserRouter>
          </QueryClientProvider>
        </AuthContext.Provider>
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;
