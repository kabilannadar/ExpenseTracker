import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Receipt, Tag, TrendingUp, Wallet, PiggyBank,
  Bell, RefreshCw, CreditCard, Target, ClipboardList,
  User, LogOut, ChevronLeft, ChevronRight, Landmark, X, Coins
} from 'lucide-react';
import { useState } from 'react';
import './Sidebar.css';

import logoIconDark from '../assets/logo-icon-dark.jpg';
import logoIconLight from '../assets/logo-icon-light.png';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/income', icon: TrendingUp, label: 'Income' },
  { to: '/debt', icon: Coins, label: 'Debt' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/budget', icon: Wallet, label: 'Budget' },
  { to: '/savings', icon: PiggyBank, label: 'Savings' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/recurring', icon: RefreshCw, label: 'Recurring' },
  { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/emis', icon: Landmark, label: 'EMIs' },
  { to: '/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isDark = user ? user.dark_mode : true;
  const logoIcon = isDark ? logoIconDark : logoIconLight;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo">
        <img src={logoIcon} alt="Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
        {!collapsed && <span className="logo-text">ExpenseTracker</span>}
        <button className="mobile-close-btn" onClick={onClose} title="Close Sidebar">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? label : undefined}
            onClick={onClose}
          >
            <Icon size={18} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="sidebar-footer">
        {!collapsed && user && (
          <div className="sidebar-user">
            <div className="user-avatar">{user.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
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
