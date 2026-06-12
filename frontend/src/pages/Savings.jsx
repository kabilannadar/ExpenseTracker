import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incomeApi, budgetsApi, analyticsApi, savingsApi, getApiError } from '../api';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { PiggyBank, TrendingUp, Wallet, Coins, CircleAlert, Plus, Pencil, Trash2 } from 'lucide-react';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function Savings() {
  const qc = useQueryClient();
  const today = new Date();
  const currentMonthName = format(today, 'MMMM yyyy');
  const currentMonthStr = format(today, 'yyyy-MM');

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), type: 'credit', notes: '' });

  // Queries
  const { data: income = [], isLoading: loadIncome } = useQuery({
    queryKey: ['income'],
    queryFn: () => incomeApi.getAll().then(r => r.data),
  });

  const { data: budgets = [], isLoading: loadBudgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetsApi.getAll().then(r => r.data),
  });

  const { data: stats, isLoading: loadStats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.getDashboard().then(r => r.data),
  });

  const { data: loggedSavingsList = [], isLoading: loadSavingsList } = useQuery({
    queryKey: ['savings'],
    queryFn: () => savingsApi.getAll().then(r => r.data),
  });

  // Mutations
  const createMut = useMutation({
    mutationFn: (d) => savingsApi.create(d),
    onSuccess: () => { qc.invalidateQueries(['savings']); toast.success('Savings logged!'); setModal(null); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => savingsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['savings']); toast.success('Savings log updated!'); setModal(null); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => savingsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries(['savings']); toast.success('Savings log deleted'); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const isLoading = loadIncome || loadBudgets || loadStats || loadSavingsList;

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <div className="stat-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: 120 }} />
          ))}
        </div>
        <div className="card skeleton" style={{ height: 300, marginTop: 20 }} />
      </div>
    );
  }

  const openCreate = () => { setForm({ title: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), type: 'credit', notes: '' }); setModal('create'); };
  const openEdit = (s) => { setForm({ title: s.title, amount: s.amount, date: s.date, type: s.type || 'credit', notes: s.notes || '' }); setModal(s); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, amount: parseFloat(form.amount) };
    if (modal === 'create') createMut.mutate(payload);
    else updateMut.mutate({ id: modal.id, data: payload });
  };

  // Filter current month income
  const monthlyIncomes = income.filter(i => i.date.startsWith(currentMonthStr));
  const totalIncome = monthlyIncomes.reduce((sum, item) => sum + item.amount, 0);

  // Total Budget = Global monthly budget limit (excluding category-wise budgets)
  const globalBudget = budgets.find(b => !b.category_id);
  const totalBudget = globalBudget?.monthly_limit || 0;

  // Projected/Expected Savings = Total Income - Total Budget
  const expectedSavings = totalIncome - totalBudget;

  // Actual Savings = Total Income - Actual Monthly Expenses
  const totalExpenses = stats?.total_expenses_month || 0;
  const actualSavings = totalIncome - totalExpenses;

  // Logged Savings (sum credits and subtract debits) - all-time cumulative balance
  const totalLoggedSavings = loggedSavingsList.reduce((sum, item) => {
    if (item.type === 'debit') return sum - item.amount;
    return sum + item.amount;
  }, 0);

  // Savings rates
  const savingsRate = totalIncome > 0 ? (actualSavings / totalIncome) * 100 : 0;
  const expectedSavingsRate = totalIncome > 0 ? (expectedSavings / totalIncome) * 100 : 0;

  // Financial Health Status
  let healthText = "Unsatisfactory";
  let healthColor = "var(--danger)";
  if (savingsRate >= 30) {
    healthText = "Excellent Savings Rate!";
    healthColor = "var(--success)";
  } else if (savingsRate >= 20) {
    healthText = "Good Savings Rate!";
    healthColor = "var(--info)";
  } else if (savingsRate >= 10) {
    healthText = "Average Savings Rate";
    healthColor = "var(--warning)";
  }

  // Group Incomes by source
  const sourceTotals = {};
  monthlyIncomes.forEach(i => {
    sourceTotals[i.source] = (sourceTotals[i.source] || 0) + i.amount;
  });
  const sortedIncomes = Object.keys(sourceTotals).map(source => ({
    source,
    amount: sourceTotals[source],
    pct: totalIncome > 0 ? (sourceTotals[source] / totalIncome) * 100 : 0
  })).sort((a, b) => b.amount - a.amount);

  return (
    <div className="page-wrapper animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Savings Analysis</h1>
          <p className="page-subtitle">{currentMonthName} · Forecast and Actuals</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Log Savings</button>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid">
        <StatCard
          title="Projected Savings"
          value={fmt(expectedSavings)}
          icon={PiggyBank}
          color="accent"
          description="Total Income - Global Budget"
        />
        <StatCard
          title="Actual Savings"
          value={fmt(actualSavings)}
          icon={Coins}
          color={actualSavings >= 0 ? "success" : "danger"}
          description="Total Income - Actual Expenses"
        />
        <StatCard
          title="Logged Savings"
          value={fmt(totalLoggedSavings)}
          icon={Wallet}
          color="info"
          description="Explicitly logged savings"
        />
        <StatCard
          title="Total Monthly Income"
          value={fmt(totalIncome)}
          icon={TrendingUp}
          color="success"
          description="Sum of monthly income"
        />
      </div>

      {/* Savings Progress Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Savings Health Dashboard</div>
        <div className="grid-2" style={{ gap: 24, alignItems: 'center' }}>
          {/* Progress bar and metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div className="flex justify-between items-center" style={{ fontSize: 14, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Savings Progress</span>
                <span className="badge" style={{ background: healthColor + '1a', color: healthColor }}>
                  {healthText}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                Current savings rate: <strong>{savingsRate.toFixed(1)}%</strong> (Expected: {expectedSavingsRate.toFixed(1)}%)
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.max(0, Math.min(100, savingsRate))}%`,
                    background: savingsRate > 25 ? 'var(--success)' : savingsRate > 10 ? 'var(--warning)' : 'var(--danger)'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--bg-elevated)', padding: 12, borderRadius: 'var(--radius-md)' }}>
              <CircleAlert size={18} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Financial advisers recommend a standard target savings rate of **20%** of your monthly income. Keeping your actual budget under total limits helps ensure you meet your projected savings goal of **{fmt(expectedSavings)}**.
              </div>
            </div>
          </div>

          {/* Forecast Comparison Info */}
          <div style={{ background: 'var(--bg-elevated)', padding: 20, borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Savings Reconciliation</div>
            <div className="flex justify-between items-center" style={{ fontSize: 13 }}>
              <span>Expected/Projected Savings:</span>
              <strong style={{ color: 'var(--accent-primary)' }}>{fmt(expectedSavings)}</strong>
            </div>
            <div className="flex justify-between items-center" style={{ fontSize: 13 }}>
              <span>Actual Savings to Date:</span>
              <strong style={{ color: actualSavings >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(actualSavings)}</strong>
            </div>
            <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />
            <div className="flex justify-between items-center" style={{ fontSize: 13 }}>
              <span>Budget Variance:</span>
              <strong style={{ color: (totalBudget - totalExpenses) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {fmt(totalBudget - totalExpenses)} {(totalBudget - totalExpenses) >= 0 ? 'Under Budget' : 'Over Budget'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Lists */}
      <div className="grid-2">
        {/* Income Sources */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Income Breakdown by Source</div>
          {sortedIncomes.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 13 }}>
              No income recorded this month
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sortedIncomes.map(({ source, amount, pct }) => (
                <div key={source} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div className="flex justify-between" style={{ fontSize: 13 }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{source}</span>
                    <span>{fmt(amount)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="progress-bar" style={{ height: 4 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--success)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget Breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Budget Limits & Allocation</div>
          {budgets.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 13 }}>
              No budgets set
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {budgets.map(b => {
                const limit = b.monthly_limit || 0;
                const spent = b.monthly_spent || 0;
                const pct = limit > 0 ? (spent / limit) * 100 : 0;
                return (
                  <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="flex justify-between" style={{ fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{b.category?.name || 'Global Budget'}</span>
                      <span>{fmt(spent)} / {fmt(limit)} ({Math.min(100, pct).toFixed(0)}%)</span>
                    </div>
                    <div className="progress-bar" style={{ height: 4 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          background: pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : 'var(--accent-primary)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Logged Savings Transactions List */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="flex justify-between items-center">
          <div style={{ fontWeight: 700, fontSize: 15 }}>Logged Savings Ledger</div>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={openCreate}>
            <Plus size={12} /> Log Savings
          </button>
        </div>
        {loggedSavingsList.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0', fontSize: 13 }}>
            No savings transactions logged yet. Click "Log Savings" above to add your first transaction.
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title/Account</th>
                  <th>Type</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loggedSavingsList.map(s => {
                  const isDebit = s.type === 'debit';
                  return (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{format(new Date(s.date), 'dd MMM yyyy')}</td>
                      <td style={{ fontWeight: 600 }}>{s.title}</td>
                      <td>
                        <span className={`badge badge-${isDebit ? 'danger' : 'success'}`} style={{ fontSize: 11 }}>
                          {isDebit ? 'WITHDRAWAL (-)' : 'DEPOSIT (+)'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 140 }}>
                        {s.notes ? (
                          <div className="note-tooltip-container">
                            <span className="note-tooltip-trigger" style={{ maxWidth: 140 }}>
                              {s.notes}
                            </span>
                            <div className="note-tooltip-content">
                              {s.notes}
                            </div>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: isDebit ? 'var(--danger)' : 'var(--success)' }}>
                        {isDebit ? '-' : '+'}{fmt(s.amount)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-icon" onClick={() => openEdit(s)}><Pencil size={13} /></button>
                          <button className="btn-icon btn-danger" onClick={() => { if (confirm('Delete savings transaction?')) deleteMut.mutate(s.id); }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={modal === 'create' ? 'Log Savings Transaction' : 'Edit Savings Log'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Title / Account *</label>
              <input type="text" placeholder="e.g. HDFC Savings Account, Mutual Fund SIP" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Transaction Type *</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="credit">Deposit / Add (+)</option>
                  <option value="debit">Withdrawal / Use (-)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹) *</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input placeholder="Optional description..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                {modal === 'create' ? 'Log Transaction' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
