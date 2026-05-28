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
import type { User } from './lib/api';

// ── Theme Context ──────────────────────────────────────────
interface ThemeCtx { dark: boolean; toggle: () => void; }
export const ThemeContext = createContext<ThemeCtx>({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

// ── Query Client ───────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [dark, setDark] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Apply / remove .dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const themeCtx: ThemeCtx = { dark, toggle: () => setDark(d => !d) };

  if (!user) {
    return (
      <ThemeContext.Provider value={themeCtx}>
        <QueryClientProvider client={queryClient}>
          <Login onLogin={handleLogin} />
        </QueryClientProvider>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={themeCtx}>
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeContext.Provider>
  );
}

export default App;
