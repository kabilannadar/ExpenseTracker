import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import { Menu, Megaphone } from 'lucide-react';
const bannerLogo = 'https://ik.imagekit.io/kabi10/tr:q-auto,f-auto/ExpenseTracker_Banner_Transparent.png';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import Debt from './pages/Debt';
import Categories from './pages/Categories';
import Budget from './pages/Budget';
import Savings from './pages/Savings';
import Goals from './pages/Goals';
import Reminders from './pages/Reminders';
import Recurring from './pages/Recurring';
import Subscriptions from './pages/Subscriptions';
import EMI from './pages/EMI';
import AuditLogs from './pages/AuditLogs';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Updates from './pages/Updates';
import UpdatesPanel from './components/UpdatesPanel';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
});

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="mobile-header">
          <span className="mobile-only">
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)} title="Open Menu">
              <Menu size={22} />
            </button>
          </span>
          <img src={bannerLogo} alt="ExpenseTracker" className="mobile-header-logo" />

          {/* Updates button — desktop only, right-aligned */}
          <div className="desktop-only header-updates-wrapper">
            <button
              id="header-updates-btn"
              className={`header-updates-btn ${updatesOpen ? 'active' : ''}`}
              onClick={() => setUpdatesOpen(o => !o)}
              title="Updates &amp; Bug Fixes"
            >
              <Megaphone size={15} />
              <span>Updates</span>
            </button>
            {updatesOpen && (
              <UpdatesPanel onClose={() => setUpdatesOpen(false)} />
            )}
          </div>
        </header>

        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/income" element={<Income />} />
            <Route path="/debt" element={<Debt />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/recurring" element={<Recurring />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/emis" element={<EMI />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/updates" element={<Updates />} />
          </Routes>

          <footer className="app-footer">
            <div className="app-footer-content">
              <span>© {new Date().getFullYear()} ExpenseTracker. All rights reserved.</span>
              <span>Created by <a href="https://portfolio.r-r-kabilan0435.workers.dev/" target="_blank" rel="noopener noreferrer" className="app-footer-author">Kabilan Rethinaswamy</a></span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '14px',
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
