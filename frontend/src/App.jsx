import { useState, useEffect, lazy, Suspense } from 'react';
import { format } from 'date-fns';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import { Menu, Megaphone } from 'lucide-react';
const bannerLogo = 'https://ik.imagekit.io/kabi10/tr:q-auto,f-auto/ExpenseTracker_Banner_Transparent.png';

// Lazy load page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Income = lazy(() => import('./pages/Income'));
const Debt = lazy(() => import('./pages/Debt'));
const Categories = lazy(() => import('./pages/Categories'));
const Budget = lazy(() => import('./pages/Budget'));
const Savings = lazy(() => import('./pages/Savings'));
const Goals = lazy(() => import('./pages/Goals'));
const Reminders = lazy(() => import('./pages/Reminders'));
const Recurring = lazy(() => import('./pages/Recurring'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const EMI = lazy(() => import('./pages/EMI'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Profile = lazy(() => import('./pages/Profile'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Updates = lazy(() => import('./pages/Updates'));
const TelegramSetup = lazy(() => import('./pages/TelegramSetup'));
const SupportFeedback = lazy(() => import('./pages/SupportFeedback'));
const Loans = lazy(() => import('./pages/Loans'));

import UpdatesPanel from './components/UpdatesPanel';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
});

// Preserve pending chat_id across auth redirects
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const chatIdParam = params.get('chat_id');
  if (chatIdParam) {
    sessionStorage.setItem('pending_telegram_chat_id', chatIdParam);
  }
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

          {/* Desktop Right Utilities Section */}
          <div className="desktop-only header-right-section" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: 'auto', zIndex: 10 }}>
            {/* Live Date & Time Clock */}
            <div className="header-clock">
              <span className="clock-date">{format(currentTime, 'EEEE, d MMMM yyyy')}</span>
              <span className="clock-separator"> • </span>
              <span className="clock-time">{format(currentTime, 'hh:mm:ss a')}</span>
            </div>

            {/* Vertical Divider */}
            <div className="header-divider" style={{ width: '1px', height: '16px', background: 'var(--border)' }} />

            {/* Updates button */}
            <div className="header-updates-wrapper">
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
          </div>
        </header>

        <div className="main-content">
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
              Loading...
            </div>
          }>
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
              <Route path="/help" element={<HelpPage />} />
              <Route path="/updates" element={<Updates />} />
              <Route path="/telegram" element={<TelegramSetup />} />
              <Route path="/support" element={<SupportFeedback />} />
              <Route path="/loans" element={<Loans />} />
            </Routes>
          </Suspense>

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
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    }>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
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
    </GoogleOAuthProvider>
  );
}
