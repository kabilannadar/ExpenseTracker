import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';
import {
  LayoutDashboard, Receipt, Tag, TrendingUp, Wallet, PiggyBank,
  Bell, RefreshCw, CreditCard, Target, ClipboardList,
  User, LogOut, ChevronLeft, ChevronRight, Landmark, X, Coins, Megaphone, Send, HelpCircle, MessageSquare, Percent, Download
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import './Sidebar.css';

function MarqueeText({ text }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isMarquee, setIsMarquee] = useState(false);
  const [scrollDist, setScrollDist] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    setIsMarquee(false);

    const checkOverflow = () => {
      const containerWidth = container.offsetWidth;
      const textWidth = textEl.scrollWidth;

      if (textWidth > containerWidth) {
        setIsMarquee(true);
        setScrollDist(containerWidth - textWidth - 8);
      } else {
        setIsMarquee(false);
      }
    };

    const timer = setTimeout(checkOverflow, 200);
    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  return (
    <div 
      ref={containerRef} 
      style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}
    >
      <span 
        ref={textRef} 
        className={`user-name ${isMarquee ? 'marquee-active' : ''}`}
        style={{ 
          display: 'inline-block', 
          whiteSpace: 'nowrap',
          '--scroll-dist': `${scrollDist}px`
        }}
      >
        {text}
      </span>
    </div>
  );
}

const avatarLogo = 'https://ik.imagekit.io/kabi10/tr:q-auto,f-auto/ExpenseTracker_Avatar_Transparent.png';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/income', icon: TrendingUp, label: 'Income' },
  { to: '/loans', icon: Percent, label: 'Loans' },
  { to: '/debt', icon: Coins, label: 'Debt' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/budget', icon: Wallet, label: 'Budget' },
  { to: '/savings', icon: PiggyBank, label: 'Savings' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/recurring', icon: RefreshCw, label: 'Recurring' },
  { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/emis', icon: Landmark, label: 'EMIs' },
  { to: '/telegram', icon: Send, label: 'ExpenseTracker Bot' },
  { to: '/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/help', icon: HelpCircle, label: 'Help & FAQ' },
  { to: '/support', icon: MessageSquare, label: 'Support & Feedback' },
  { to: '/updates', icon: Megaphone, label: 'Updates', mobileOnly: true },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { isInstallable, installApp } = usePWA();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  });


  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo">
        {!collapsed && (
          <img src={avatarLogo} alt="ExpenseTracker" className="sidebar-banner-logo" />
        )}
        {collapsed && (
          <img src={avatarLogo} alt="ExpenseTracker" className="sidebar-banner-logo-collapsed" />
        )}
        <button className="mobile-close-btn" onClick={onClose} title="Close Sidebar">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label, mobileOnly }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item nav-item-${to.replace('/', '') || 'dashboard'} ${isActive ? 'active' : ''} ${mobileOnly ? 'mobile-nav-only' : ''}`
            }
            title={collapsed ? label : undefined}
            onClick={onClose}
          >
            <Icon size={18} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Install App Button */}
      {isInstallable && (
        <div className="sidebar-install-wrapper">
          <button
            id="sidebar-install-btn"
            className="install-app-btn"
            onClick={installApp}
            title="Install ExpenseTracker App"
          >
            <Download size={16} className="install-app-icon" />
            {!collapsed && <span>Install App</span>}
          </button>
        </div>
      )}

      {/* User + Logout */}
      <div className="sidebar-footer">
        {!collapsed && user && (
          <div className="sidebar-user">
            <div className="user-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user.name?.[0]?.toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <MarqueeText text={user.name} />
            </div>
          </div>
        )}
        <button className="btn-icon logout-btn" onClick={logout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>

      {/* Collapse toggle */}
      <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
