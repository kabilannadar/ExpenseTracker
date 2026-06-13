import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api';
import StatCard from '../components/StatCard';
import AnnouncementTicker from '../components/AnnouncementTicker';
import {
  PieChart, Pie, Cell, Sector, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
  Wallet, TrendingDown, TrendingUp, Calendar,
  Flame, Zap, Target, ArrowRight, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
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
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.getDashboard().then(r => r.data),
  });

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
          <p className="page-subtitle">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
      </div>

      {/* Announcement Ticker — EMI & Reminder alerts */}
      <AnnouncementTicker />

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
                <ResponsiveContainer width="50%" height={210}>
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
                      innerRadius={52} outerRadius={82}
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
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 4 }}>{pct}%</span>
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
                  <div className="recent-title">{e.title}</div>
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
