import { useState, useEffect, lazy, Suspense } from 'react';
import { format } from 'date-fns';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTranslation } from 'react-i18next';
import Sidebar from './components/Sidebar';
import LanguageSelector from './components/LanguageSelector';
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
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
      refetchInterval: 5000, // Real-time sync for Telegram and external logs
      refetchIntervalInBackground: false, // Save bandwidth when tab is in background
      refetchOnWindowFocus: true, // Instantly refresh when returning to tab
    }
  }
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
  const { t, i18n } = useTranslation();

  // Dynamic SEO meta tags and doc lang update on language toggle
  useEffect(() => {
    const activeLang = i18n.language || 'en';
    document.documentElement.lang = activeLang;

    const localizedTitles = {
      en: "ExpenseTracker - Personal Finance & Budget Manager",
      hi: "ExpenseTracker - व्यक्तिगत वित्त और बजट प्रबंधक",
      ta: "ExpenseTracker - தனிப்பட்ட நிதி மற்றும் வரவுசெலவு மேலாளர்",
      te: "ExpenseTracker - వ్యక్తిగత ఫైనాన్స్ & బడ్జెట్ మేనేజర్",
      kn: "ExpenseTracker - ವೈಯಕ್ತಿಕ ಹಣಕಾಸು ಮತ್ತು ಬಜೆಟ್ ವ್ಯವಸ್ಥಾಪಕ",
      ml: "ExpenseTracker - വ്യക്തിഗത ധനകാര്യവും ബജറ്റ് മാനേജരും",
      mr: "ExpenseTracker - वैयक्तिक वित्त आणि बजेट व्यवस्थापक",
      gu: "ExpenseTracker - વ્યક્તિગત નાણાં અને બજેટ મેનેજર",
      bn: "ExpenseTracker - ব্যক্তিগত অর্থ ও বাজেট ম্যানেজার"
    };

    const localizedDescriptions = {
      en: "Track expenses, income, budgets, goals, EMIs, and reminders — all in one place.",
      hi: "खर्च, आय, बजट, लक्ष्य, ईएमआई और अनुस्मारक ट्रैक करें - सब कुछ एक ही स्थान पर।",
      ta: "செலவுகள், வருமானம், வரவுசெலவுத் திட்டங்கள், இலக்குகள், ஈஎம்ஐக்கள் மற்றும் நினைவூட்டல்களைக் கண்காணிக்கவும் - அனைத்தும் ஒரே இடத்தில்.",
      te: "ఖర్చులు, ఆదాయం, బడ్జెట్లు, లక్ష్యాలు, EMIలు మరియు రిమైండర్లను ట్రాక్ చేయండి - అన్నీ ఒకే చోట.",
      kn: "ವೆಚ್ಚಗಳು, ಆದಾಯ, ಬಜೆಟ್ಗಳು, ಗುರಿಗಳು, ಇಎಂಐಗಳು ಮತ್ತು ಜ್ಞಾಪನೆಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ - ಎಲ್ಲವೂ ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ.",
      ml: "ചെലവുകൾ, വരുമാനം, ബജറ്റുകൾ, ലക്ഷ്യങ്ങൾ, ഇഎംഐകൾ, ഓർമ്മപ്പെടുത്തലുകൾ എന്നിവ ട്രാക്ക് ചെയ്യുക - എല്ലാം ഒരിടത്ത്.",
      mr: "खर्च, उत्पन्न, बजेट, ध्येये, ईएमआय आणि स्मरणपत्रे ट्रॅक करा - सर्व एकाच ठिकाणी.",
      gu: "ખર્ચ, આવક, બજેટ, લક્ષ્યો, EMI અને રીમાઇન્ડર્સ ટ્રૅક કરો - બધું એક જ જગ્યાએ.",
      bn: "খরચ, আয়, বাজেট, লক্ষ্য, ইএমআই এবং অনুস্মারক ট্র্যাক করুন - সব এক জায়গায়।"
    };

    document.title = localizedTitles[activeLang] || localizedTitles.en;
    
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', localizedDescriptions[activeLang] || localizedDescriptions.en);
    }
  }, [i18n.language]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Invalidate all React Query queries to update dashboard charts when a transaction is logged from the chatbot widget
  useEffect(() => {
    const handleLogged = () => {
      console.log('[App.jsx] Chatbot transaction log detected, refreshing queries...');
      queryClient.invalidateQueries();
    };
    window.addEventListener('moneycommandai-transaction-logged', handleLogged);
    return () => window.removeEventListener('moneycommandai-transaction-logged', handleLogged);
  }, []);

  // Listen to global open/close sidebar events (used by onboarding tour)
  useEffect(() => {
    const openHandler = () => setSidebarOpen(true);
    const closeHandler = () => setSidebarOpen(false);
    window.addEventListener('open-sidebar', openHandler);
    window.addEventListener('close-sidebar', closeHandler);
    return () => {
      window.removeEventListener('open-sidebar', openHandler);
      window.removeEventListener('close-sidebar', closeHandler);
    };
  }, []);

  // Dynamically load chatbot widget only for authenticated users with port fallback
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || '';
    window.__EXPENSE_TRACKER_API_URL__ = apiBase;

    const loadScript = (url, skipCheck = false) => {
      return new Promise(async (resolve, reject) => {
        if (!skipCheck) {
          try {
            // Check if the script URL is actually responsive and returns javascript (not html fallback)
            const res = await fetch(url, { method: 'HEAD' });
            const contentType = res.headers.get('content-type') || '';
            if (!res.ok || contentType.includes('text/html')) {
              reject(new Error('HTML fallback or 404'));
              return;
            }
          } catch (e) {
            reject(e);
            return;
          }
        }

        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        if (apiBase) {
          script.setAttribute('data-api-base', apiBase);
        }
        script.onload = () => resolve(script);
        script.onerror = () => {
          script.remove();
          reject(new Error('Load error'));
        };
        document.body.appendChild(script);
      });
    };

    const initWidget = async () => {
      const hn = window.location.hostname;
      const isLocal = hn === 'localhost' || hn === '127.0.0.1' || hn.startsWith('192.168.') || hn.startsWith('10.') || hn.startsWith('172.');
      
      let scriptRef = null;

      if (isLocal) {
        // Try local ports first
        try {
          scriptRef = await loadScript(`http://localhost:5173/widget.js?t=${new Date().getTime()}`, false);
          console.log('[App] Chatbot loaded from localhost:5173');
          return scriptRef;
        } catch (e) {
          try {
            scriptRef = await loadScript(`http://localhost:5174/widget.js?t=${new Date().getTime()}`, false);
            console.log('[App] Chatbot loaded from localhost:5174');
            return scriptRef;
          } catch (err) {
            console.log('[App] Local chatbot servers offline. Falling back to prod.');
          }
        }
      }

      // Load production (skip fetch check to avoid CORS blocks on Vercel headers)
      try {
        scriptRef = await loadScript('https://moneycommandai-assistant.vercel.app/widget.js', true);
        console.log('[App] Chatbot loaded from production Vercel');
        return scriptRef;
      } catch (e) {
        console.error('[App] Failed to load chatbot widget.');
      }
    };

    const scriptPromise = initWidget();

    const handleToggleMessage = (event) => {
      const isChatbotOrigin = event.origin.includes('moneycommandai-assistant') ||
                              event.origin.includes('chatbotf-production') ||
                              event.origin.includes('localhost');
      if (!isChatbotOrigin) return;

      const data = event.data;
      if (data && data.type === 'moneycommandai-chatbot-toggle') {
        const isOpen = !!data.open;
        const iframe = document.querySelector('iframe[title="MoneyCommandAI Assistant"]') ||
                       document.querySelector('iframe[src*="moneycommandai-assistant"]') ||
                       document.querySelector('iframe[src*="chatbotf-production"]');
        if (iframe) {
          if (isOpen) {
            iframe.classList.add('chatbot-open');
            iframe.style.pointerEvents = 'auto';
          } else {
            iframe.classList.remove('chatbot-open');
            iframe.style.pointerEvents = 'none';
          }
        }
      }
    };
    window.addEventListener('message', handleToggleMessage);

    return () => {
      window.removeEventListener('message', handleToggleMessage);
      scriptPromise.then((script) => {
        if (script && document.body.contains(script)) {
          document.body.removeChild(script);
        }
        // Remove any injected chatbot iframe from the DOM
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          if (
            iframe.title === 'MoneyCommandAI Assistant' || 
            iframe.src.includes('moneycommandai-assistant') ||
            iframe.src.includes('chatbotf-production')
          ) {
            iframe.remove();
          }
        });
      });
    };
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
            <LanguageSelector />
            <div className="header-divider" style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
            
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
              <span>© {new Date().getFullYear()} ExpenseTracker. {t('common.all_rights_reserved')}</span>
              <span>{t('common.created_by')} <a href="https://portfolio.r-r-kabilan0435.workers.dev/" target="_blank" rel="noopener noreferrer" className="app-footer-author">Kabilan Rethinaswamy</a></span>
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
  useEffect(() => {
    const handleLabelClick = (e) => {
      const label = e.target.closest('label');
      if (!label) return;

      // If the label is already linked or contains the input, let native browser action handle it
      if (label.htmlFor || label.getAttribute('for')) return;
      if (label.querySelector('input, select, textarea')) return;

      // Find sibling inputs inside form-group or adjacent layout
      const parent = label.closest('.form-group') || label.parentElement;
      if (parent) {
        const input = parent.querySelector('input, select, textarea');
        if (input) {
          input.focus();
          if (input.type === 'checkbox' || input.type === 'radio') {
            input.click();
          }
        }
      }
    };
    document.addEventListener('click', handleLabelClick);
    return () => document.removeEventListener('click', handleLabelClick);
  }, []);

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
