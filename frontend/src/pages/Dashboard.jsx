import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsApi, telegramApi, expensesApi, getApiError } from '../api';
import StatCard from '../components/StatCard';
import AnnouncementTicker from '../components/AnnouncementTicker';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PieChart, Pie, Cell, Sector, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
  Wallet, TrendingDown, TrendingUp, Calendar,
  Flame, Zap, Target, ArrowRight, AlertTriangle, Send, Upload, RefreshCw, HelpCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './Dashboard.css';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>₹{Number(p.value).toLocaleString('en-IN')}</div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);

  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem('dismiss_welcome_banner') !== 'true';
  });
  const [showTgPromo, setShowTgPromo] = useState(() => {
    return localStorage.getItem('dismiss_tg_promo_banner') !== 'true';
  });

  const handleDismissWelcome = () => {
    localStorage.setItem('dismiss_welcome_banner', 'true');
    setShowWelcome(false);
  };

  const handleDismissTgPromo = () => {
    localStorage.setItem('dismiss_tg_promo_banner', 'true');
    setShowTgPromo(false);
  };

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.getDashboard().then(r => r.data),
  });

  const { data: tgStatus } = useQuery({
    queryKey: ['telegramStatus'],
    queryFn: () => telegramApi.getStatus().then(r => r.data),
  });

  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    try {
      const res = await expensesApi.importCsv(file);
      toast.success(res.data?.message || 'Imported expenses successfully!');
      queryClient.invalidateQueries();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to import CSV.'));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleStartTour = () => {
    const isMobile = window.innerWidth <= 768;
    const driverObj = driver({
      showProgress: true,
      animate: true,
      popoverClass: 'driverjs-theme',
      onDestroyed: () => {
        window.dispatchEvent(new CustomEvent('close-sidebar'));
      },
      steps: [
        {
          element: '.page-title',
          popover: {
            title: 'Welcome to ExpenseTracker! 👋',
            description: 'Your personal finance command center. Let us take a quick 1-minute tour to help you get started.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '.stat-grid',
          popover: {
            title: 'Financial KPIs 📊',
            description: 'Track your total expenses, monthly income, net savings, and spending streaks at a glance.',
            side: 'bottom',
            align: 'start'
          }
        },
        ...(stats?.monthly_budget ? [{
          element: '.budget-card',
          popover: {
            title: 'Monthly Budget Limit 🎯',
            description: 'Stay on track! Check your real-time budget utilization progress so you never overspend.',
            side: 'top',
            align: 'start'
          }
        }] : []),
        {
          element: '.chart-title',
          popover: {
            title: 'Visual Analytics 📈',
            description: 'Understand your spending habits over time and view your expense distribution by category.',
            side: 'top',
            align: 'start'
          },
          onHighlightStarted: () => {
            // Close sidebar if user clicks "Previous" from the sidebar steps
            window.dispatchEvent(new CustomEvent('close-sidebar'));
          }
        },
        {
          element: '.nav-item-expenses',
          popover: {
            title: 'Cashflow Tracking 💸',
            description: 'Manually add expenses and income, assign custom categories, select payment methods, and filter records.',
            side: isMobile ? 'bottom' : 'right',
            align: 'start'
          },
          onHighlightStarted: (element) => {
            // Ensure sidebar is open to display this and subsequent navigation steps
            window.dispatchEvent(new CustomEvent('open-sidebar'));
            // Scroll element into view after drawer transition
            setTimeout(() => {
              element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 150);
          }
        },
        {
          element: '.nav-item-loans',
          popover: {
            title: 'Loans, Debt & EMIs 🏛️',
            description: 'Keep tabs on loans you borrow or lend out. Track interest rates, upcoming EMIs, and pending outstanding debts.',
            side: isMobile ? 'bottom' : 'right',
            align: 'start'
          },
          onHighlightStarted: (element) => {
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        },
        {
          element: '.nav-item-budget',
          popover: {
            title: 'Budgets & Categories 🎯',
            description: 'Set custom spending categories and monthly limits. Stay within your boundaries to save more.',
            side: isMobile ? 'bottom' : 'right',
            align: 'start'
          },
          onHighlightStarted: (element) => {
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        },
        {
          element: '.nav-item-savings',
          popover: {
            title: 'Savings & Wealth Goals 📈',
            description: 'Set aside money for specific savings pools and track milestones toward goals like buying a house or car.',
            side: isMobile ? 'bottom' : 'right',
            align: 'start'
          },
          onHighlightStarted: (element) => {
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        },
        {
          element: '.nav-item-subscriptions',
          popover: {
            title: 'Bills, Reminders & Recurring ⏰',
            description: 'Manage active subscriptions (Netflix, Spotify), set repeating expenses, and receive payment alerts.',
            side: isMobile ? 'bottom' : 'right',
            align: 'start'
          },
          onHighlightStarted: (element) => {
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        },
        {
          element: '.nav-item-telegram',
          popover: {
            title: 'Instant Telegram Bot 🤖',
            description: 'Link your Telegram account to chat with our AI Bot. Log entries on-the-go with natural text (e.g. "spent 120 on juice") and sync in real-time.',
            side: isMobile ? 'bottom' : 'right',
            align: 'start'
          },
          onHighlightStarted: (element) => {
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        },
        {
          element: '.nav-item-profile',
          popover: {
            title: 'Settings & Security ⚙️',
            description: 'Toggle Dark Mode, access audit logs for security, and export full reports (PDF or Excel).',
            side: isMobile ? 'bottom' : 'right',
            align: 'start'
          },
          onHighlightStarted: (element) => {
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        },
        {
          element: '.nav-item-help',
          popover: {
            title: 'Help & FAQ 📚',
            description: 'Read the detailed FAQ to resolve common questions and get step-by-step guides.',
            side: isMobile ? 'bottom' : 'right',
            align: 'start'
          },
          onHighlightStarted: (element) => {
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        },
        {
          element: '.nav-item-support',
          popover: {
            title: 'Support & Feedback 💬',
            description: 'Send feature requests, bug reports, and feedback directly to our development team.',
            side: isMobile ? 'bottom' : 'right',
            align: 'start'
          },
          onHighlightStarted: (element) => {
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        },
        ...(document.querySelector('.install-app-btn') ? [{
          element: '.install-app-btn',
          popover: {
            title: 'Install as an App 📱',
            description: 'Install ExpenseTracker directly onto your desktop or mobile device home screen for quick offline access.',
            side: isMobile ? 'bottom' : 'right',
            align: 'start'
          },
          onHighlightStarted: (element) => {
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }] : [])
      ]
    });

    driverObj.drive();
  };

  useEffect(() => {
    if (stats) {
      const tourCompleted = localStorage.getItem('et_onboarding_tour_completed');
      if (tourCompleted !== 'true') {
        const timer = setTimeout(() => {
          handleStartTour();
          localStorage.setItem('et_onboarding_tour_completed', 'true');
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [stats]);

  const isLoading = isStatsLoading;

  if (isLoading) return (
    <div className="page-wrapper">
      <div className="stat-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card skeleton" style={{ height: 120 }} />
        ))}
      </div>
    </div>
  );

  const budgetPct = stats?.monthly_budget
    ? Math.min(100, ((stats.global_budget_spent / stats.monthly_budget) * 100)).toFixed(0)
    : null;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
        </div>
        <button
          id="dashboard-tour-btn"
          className="btn-secondary"
          onClick={handleStartTour}
          style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Take a quick onboarding tour"
        >
          <HelpCircle size={14} />
          <span>Quick Tour</span>
        </button>
      </div>

      {/* Announcement Ticker — EMI & Reminder alerts */}
      <AnnouncementTicker />

      {/* Onboarding CSV Import for new accounts */}
      {showWelcome && stats && stats.recent_expenses?.length === 0 && (
        <div 
          className="card bot-promo-card animate-in" 
          style={{ 
            border: '1px solid rgba(99, 102, 241, 0.2)', 
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(16, 185, 129, 0.08))',
            paddingRight: '48px'
          }}
        >
          <button 
            className="bot-promo-close" 
            onClick={handleDismissWelcome} 
            aria-label="Dismiss"
            style={{ top: '8px', right: '8px' }}
          >
            &times;
          </button>
          <div className="bot-promo-glow" style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%)' }} />
          <div className="bot-promo-content">
            <div className="bot-promo-icon-wrap" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(16, 185, 129, 0.25))' }}>
              <Upload size={22} className="bot-promo-icon" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div className="bot-promo-text">
              <h3 className="bot-promo-title">Welcome to ExpenseTracker!</h3>
              <p className="bot-promo-desc">
                Log your first expense to get started, or <strong>import previous data</strong> from an exported CSV file to restore your transactions and categories.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              <input
                type="file"
                accept=".csv"
                id="dashboard-import-csv"
                style={{ display: 'none' }}
                onChange={handleImportCsv}
                disabled={importing}
              />
              <button
                className="btn-primary bot-promo-btn"
                style={{ background: 'linear-gradient(135deg, var(--accent-primary), #10b981) !important', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3) !important' }}
                onClick={() => document.getElementById('dashboard-import-csv').click()}
                disabled={importing}
              >
                {importing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    Import CSV <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTgPromo && tgStatus && !tgStatus.linked && (
        <div className="card bot-promo-card animate-in" style={{ paddingRight: '48px' }}>
          <button 
            className="bot-promo-close" 
            onClick={handleDismissTgPromo} 
            aria-label="Dismiss"
            style={{ top: '8px', right: '8px' }}
          >
            &times;
          </button>
          <div className="bot-promo-glow" />
          <div className="bot-promo-content">
            <div className="bot-promo-icon-wrap">
              <Send size={22} className="bot-promo-icon" />
            </div>
            <div className="bot-promo-text">
              <h3 className="bot-promo-title">Track Expenses Instantly via Telegram!</h3>
              <p className="bot-promo-desc">
                Log payments, income, budgets, and reminders in real-time by chatting with the new <strong>ExpenseTracker Bot</strong>.
              </p>
            </div>
            <button 
              className="btn-primary bot-promo-btn"
              onClick={() => navigate('/telegram')}
            >
              Get Started <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="stat-grid">
        <StatCard
          title="This Month's Expenses"
          value={fmt(stats?.total_expenses_month)}
          icon={TrendingDown}
          color="danger"
        />
        <StatCard
          title="Monthly Income"
          value={fmt(stats?.total_income_month)}
          icon={TrendingUp}
          color="success"
        />
        <StatCard
          title="Net Savings"
          value={fmt(stats?.net_savings)}
          icon={Wallet}
          color={stats?.net_savings >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          title="Expense Over Budget"
          value={fmt(stats?.total_expense_over_budget)}
          icon={AlertTriangle}
          color={stats?.total_expense_over_budget > 0 ? 'danger' : 'success'}
        />
        <StatCard
          title="Spending Streak"
          value={`${stats?.spending_streak || 0} days`}
          icon={Flame}
          color="warning"
        />
        <StatCard
          title="Largest Expense"
          value={fmt(stats?.largest_expense)}
          icon={Zap}
          color="accent"
        />
      </div>

      {/* Budget Progress */}
      {stats?.monthly_budget && (
        <div className="card budget-card">
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div className="flex items-center gap-2">
              <Target size={18} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontWeight: 600 }}>Monthly Budget</span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {fmt(stats.global_budget_spent)} / {fmt(stats.monthly_budget)}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${budgetPct}%`,
                background: budgetPct > 85
                  ? 'linear-gradient(90deg,#ef4444,#f97316)'
                  : budgetPct > 60
                    ? 'linear-gradient(90deg,#f59e0b,#f97316)'
                    : 'var(--accent-gradient)'
              }}
            />
          </div>
          <div className="flex justify-between" style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>{budgetPct}% used</span>
            <span className={`badge ${stats.budget_remaining >= 0 ? 'badge-success' : 'badge-danger'}`}>
              {stats.budget_remaining >= 0 ? 'Remaining: ' : 'Over by: '}
              {fmt(Math.abs(stats.budget_remaining))}
            </span>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid-2" style={{ gap: 20 }}>
        {/* Monthly Trend */}
        <div className="card">
          <h3 className="chart-title">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats?.monthly_trend || []}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="url(#trendGrad)" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie */}
        <div className="card">
          <h3 className="chart-title">Spending by Category</h3>
          {stats?.category_breakdown?.length ? (() => {
            const data = stats.category_breakdown;
            const total = data.reduce((s, d) => s + d.amount, 0);

            const PieTooltipContent = ({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0];
              const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
              return (
                <div className="chart-tooltip" style={{ minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.payload.color, flexShrink: 0 }} />
                    <span className="tooltip-label" style={{ margin: 0 }}>{d.name}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{fmt(d.value)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{pct}% of total</div>
                </div>
              );
            };

            const ActiveShape = (props) => {
              const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
              return (
                <g>
                  <Sector
                    cx={cx} cy={cy}
                    innerRadius={innerRadius - 3}
                    outerRadius={outerRadius + 6}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                    opacity={1}
                  />
                </g>
              );
            };

            return (
              <div className="pie-container">
                <div className="pie-chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {data.map((entry, i) => (
                          <linearGradient key={i} id={`pieGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%"   stopColor={entry.color} stopOpacity={1}   />
                            <stop offset="100%" stopColor={entry.color} stopOpacity={0.55}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={data}
                        cx="50%" cy="50%"
                        innerRadius="50%" outerRadius="80%"
                        dataKey="amount" nameKey="name"
                        paddingAngle={3}
                        activeShape={ActiveShape}
                      >
                        {data.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={`url(#pieGrad-${i})`}
                            stroke={entry.color}
                            strokeWidth={1.5}
                            strokeOpacity={0.4}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="pie-legend">
                  {data.slice(0, 6).map((c, i) => {
                    const pct = total > 0 ? ((c.amount / total) * 100).toFixed(0) : 0;
                    return (
                      <div key={i} className="legend-item">
                        <span
                          className="legend-dot"
                          style={{
                            background: `linear-gradient(135deg, ${c.color}, ${c.color}88)`,
                            boxShadow: `0 0 6px ${c.color}55`,
                          }}
                        />
                        <span className="legend-name">{c.name}</span>
                        <span className="legend-pct">({pct}%)</span>
                        <span className="legend-amount">{fmt(c.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <div className="empty-state" style={{ padding: 40 }}>No data yet</div>
          )}
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="card">
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h3 className="chart-title" style={{ marginBottom: 0 }}>Recent Expenses</h3>
        </div>
        {stats?.recent_expenses?.length ? (
          <div className="recent-list">
            {stats.recent_expenses.map(e => (
              <div key={e.id} className="recent-item">
                <div className="recent-dot" style={{ background: e.category?.color || '#6b7280' }} />
                <div className="recent-info">
                  <div className="recent-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {e.title}
                    {e.source === 'telegram' && (
                      <Send size={11} style={{ color: '#38bdf8', transform: 'rotate(-45deg)' }} title="Logged via Telegram" />
                    )}
                  </div>
                  <div className="recent-meta">{e.category?.name || 'Uncategorized'} · {format(new Date(e.date), 'dd MMM')}</div>
                </div>
                <div className="recent-amount">-{fmt(e.amount)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 40 }}>No recent expenses</div>
        )}
      </div>
    </div>
  );
}
