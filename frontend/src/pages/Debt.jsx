import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debtsApi, getApiError } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Coins, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDecimal = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY = {
  creditor: '',
  amount: '',
  amount_paid: '0',
  interest_rate: '0',
  due_date: format(new Date(), 'yyyy-MM-dd'),
  min_payment: '0',
  notes: '',
};

export default function Debt() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'create' | debt obj
  const [form, setForm] = useState(EMPTY);

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: () => debtsApi.getAll().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => debtsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['debts']);
      toast.success('Debt recorded successfully!');
      setModal(null);
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => debtsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['debts']);
      toast.success('Debt updated successfully!');
      setModal(null);
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => debtsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['debts']);
      toast.success('Debt record deleted');
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const openCreate = () => {
    setForm(EMPTY);
    setModal('create');
  };

  const openEdit = (d) => {
    const paid = Math.max(0, d.amount - d.remaining_amount);
    setForm({
      creditor: d.creditor,
      amount: d.amount.toString(),
      amount_paid: paid.toString(),
      interest_rate: d.interest_rate.toString(),
      due_date: d.due_date || '',
      min_payment: d.min_payment.toString(),
      notes: d.notes || '',
    });
    setModal(d);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const originalAmount = parseFloat(form.amount);
    const amountPaid = parseFloat(form.amount_paid || 0);
    const calculatedRemaining = Math.max(0, originalAmount - amountPaid);
    
    const payload = {
      creditor: form.creditor,
      amount: originalAmount,
      remaining_amount: calculatedRemaining,
      interest_rate: parseFloat(form.interest_rate || 0),
      due_date: form.due_date || null,
      min_payment: parseFloat(form.min_payment || 0),
      notes: form.notes || null,
      is_paid: calculatedRemaining <= 0,
    };

    if (modal === 'create') {
      createMut.mutate(payload);
    } else {
      updateMut.mutate({ id: modal.id, data: payload });
    }
  };

  // Computations
  const totalOriginalDebt = debts.reduce((sum, item) => sum + item.amount, 0);
  const totalRemainingDebt = debts.reduce((sum, item) => sum + item.remaining_amount, 0);
  const totalSettledDebt = totalOriginalDebt - totalRemainingDebt;
  const activeDebtsCount = debts.filter((d) => !d.is_paid).length;

  return (
    <div className="page-wrapper animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Debt Tracker</h1>
          <p className="page-subtitle">Monitor loans, liabilities, and repayment progress</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Debt
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid">
        <div className="card flex flex-col gap-2">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Borrowed</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(totalOriginalDebt)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Original debt size</span>
        </div>
        <div className="card flex flex-col gap-2">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Active Balance</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger)' }}>{fmt(totalRemainingDebt)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Remaining outstanding</span>
        </div>
        <div className="card flex flex-col gap-2">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Paid Off</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{fmt(totalSettledDebt)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Settled debt amount</span>
        </div>
        <div className="card flex flex-col gap-2">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Active Accounts</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--info)' }}>{activeDebtsCount}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Accounts to pay off</span>
        </div>
      </div>

      {/* Debts Grid */}
      {isLoading ? (
        <div className="grid-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: 200 }} />
          ))}
        </div>
      ) : debts.length === 0 ? (
        <div className="card empty-state">
          <Coins size={40} />
          <div>No debts tracked currently</div>
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={14} /> Add your first debt record
          </button>
        </div>
      ) : (
        <div className="grid-2">
          {debts.map((debt) => {
            const paid = Math.max(0, debt.amount - debt.remaining_amount);
            const progressPct = debt.amount > 0 ? Math.min(100, (paid / debt.amount) * 100) : 100;

            return (
              <div key={debt.id} className="card flex flex-col justify-between gap-4" style={{ height: '100%' }}>
                <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          background: 'var(--accent-gradient-glow)',
                          border: '1px solid var(--border-active)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Coins size={20} style={{ color: 'var(--accent-primary)' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{debt.creditor}</div>
                        <div style={{ marginTop: 4 }}>
                          {debt.is_paid ? (
                            <span className="badge badge-success">Settled</span>
                          ) : (
                            <span className="badge badge-danger">Active</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" onClick={() => openEdit(debt)} title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => {
                          if (confirm(`Delete debt to "${debt.creditor}"?`)) {
                            deleteMut.mutate(debt.id);
                          }
                        }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Financial Fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', margin: '16px 0', fontSize: 13 }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>Remaining Balance</div>
                      <strong style={{ fontSize: 17, color: debt.is_paid ? 'var(--success)' : 'var(--danger)' }}>
                        {fmtDecimal(debt.remaining_amount)}
                      </strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>Original Amount</div>
                      <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>{fmt(debt.amount)}</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>Interest Rate</div>
                      <strong>{debt.interest_rate}% p.a.</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>Min Payment</div>
                      <strong>{fmt(debt.min_payment)}/mo</strong>
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '12px 0' }} />

                  {/* Progress Indicator */}
                  <div style={{ marginBottom: 12 }}>
                    <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-muted)' }}>
                      <span>Paid off: <strong>{fmt(paid)}</strong></span>
                      <span>{progressPct.toFixed(0)}% Done</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${progressPct}%`,
                          background: progressPct >= 100 ? 'linear-gradient(90deg,#22c55e,#10b981)' : 'var(--accent-gradient)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer notes & details */}
                <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
                  <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <Calendar size={13} style={{ color: 'var(--accent-primary)' }} />
                    <span>
                      Next Due Date:{' '}
                      <strong>{debt.due_date ? format(new Date(debt.due_date), 'dd MMM yyyy') : 'No date set'}</strong>
                    </span>
                  </div>
                  {debt.notes && (
                    <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8, color: 'var(--text-muted)', fontStyle: 'italic', wordBreak: 'break-word' }}>
                      {debt.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CRUD Modal */}
      {modal && (
        <Modal
          title={modal === 'create' ? 'Add Debt' : 'Edit Debt'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Creditor / Lender Name *</label>
              <input
                placeholder="e.g. HDFC Credit Card, Friend John"
                value={form.creditor}
                onChange={(e) => setForm({ ...form, creditor: e.target.value })}
                required
              />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Original Owed Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 50000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Amount Paid (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 20000"
                  value={form.amount_paid}
                  onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Remaining Debt (calculated)</label>
              <input
                type="text"
                value={fmt(Math.max(0, parseFloat(form.amount || 0) - parseFloat(form.amount_paid || 0)))}
                disabled
                style={{ background: 'var(--bg-elevated)', cursor: 'not-allowed' }}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 12.5"
                  value={form.interest_rate}
                  onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Minimum Monthly Payment (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 2500"
                  value={form.min_payment}
                  onChange={(e) => setForm({ ...form, min_payment: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Next Payment Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                rows={2}
                placeholder="Optional descriptions or details..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                {modal === 'create' ? 'Add Debt' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
