import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emisApi, getApiError } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Landmark, Calendar, CreditCard, Notebook } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDecimal = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY = {
  title: '',
  loan_type: 'Housing',
  loan_platform: '',
  principal_amount: '',
  interest_rate: '',
  emi_amount: '',
  start_date: format(new Date(), 'yyyy-MM-dd'),
  end_date: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
  total_tenure: '12',
  remaining_months: '12',
  payment_due_date: format(new Date(), 'yyyy-MM-dd'),
  payment_method: 'bank transfer',
  notes: '',
};

export default function EMI() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: emis = [], isLoading } = useQuery({
    queryKey: ['emis'],
    queryFn: () => emisApi.getAll().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => emisApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['emis']);
      toast.success('EMI Loan added successfully!');
      setModal(null);
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => emisApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['emis']);
      toast.success('EMI Loan updated!');
      setModal(null);
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => emisApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['emis']);
      toast.success('EMI Loan deleted');
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const openCreate = () => {
    setForm(EMPTY);
    setModal('create');
  };

  const openEdit = (e) => {
    setForm({
      title: e.title,
      loan_type: e.loan_type,
      loan_platform: e.loan_platform || '',
      principal_amount: e.principal_amount.toString(),
      interest_rate: e.interest_rate.toString(),
      emi_amount: e.emi_amount.toString(),
      start_date: e.start_date,
      end_date: e.end_date,
      total_tenure: e.total_tenure.toString(),
      remaining_months: e.remaining_months.toString(),
      payment_due_date: e.payment_due_date,
      payment_method: e.payment_method || 'bank transfer',
      notes: e.notes || '',
    });
    setModal(e);
  };

  const onFieldChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Calculate total tenure and remaining months if start/end date changes
      if (field === 'start_date' || field === 'end_date') {
        const start = next.start_date;
        const end = next.end_date;
        if (start && end) {
          const s = new Date(start);
          const e = new Date(end);
          if (e >= s) {
            const years = e.getFullYear() - s.getFullYear();
            const months = e.getMonth() - s.getMonth();
            const tenure = years * 12 + months;
            next.total_tenure = tenure > 0 ? tenure.toString() : '1';

            const now = new Date();
            if (now >= e) {
              next.remaining_months = '0';
            } else {
              const remYears = e.getFullYear() - now.getFullYear();
              const remMonths = e.getMonth() - now.getMonth();
              const rem = remYears * 12 + remMonths;
              next.remaining_months = rem > 0 ? rem.toString() : '0';
            }
          }
        }
      }

      // If user inputs tenure and end_date isn't updated, or if they change tenure directly, we can keep it
      // Let's compute EMI amount dynamically in real-time
      const p = parseFloat(next.principal_amount);
      const rateInput = parseFloat(next.interest_rate);
      const n = parseInt(next.total_tenure);

      if (!isNaN(p) && !isNaN(rateInput) && !isNaN(n) && n > 0 && p > 0) {
        const r = rateInput / 12 / 100; // monthly rate
        if (r === 0) {
          next.emi_amount = (p / n).toFixed(2);
        } else {
          const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
          next.emi_amount = emi.toFixed(2);
        }
      }

      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      loan_type: form.loan_type,
      loan_platform: form.loan_platform || null,
      principal_amount: parseFloat(form.principal_amount),
      interest_rate: parseFloat(form.interest_rate),
      emi_amount: parseFloat(form.emi_amount),
      start_date: form.start_date,
      end_date: form.end_date,
      total_tenure: parseInt(form.total_tenure),
      remaining_months: parseInt(form.remaining_months),
      payment_due_date: form.payment_due_date,
      payment_method: form.payment_method,
      notes: form.notes || null,
    };

    if (modal === 'create') {
      createMut.mutate(payload);
    } else {
      updateMut.mutate({ id: modal.id, data: payload });
    }
  };

  const totalMonthlyEMI = emis.reduce((sum, item) => sum + item.emi_amount, 0);
  const totalPrincipal = emis.reduce((sum, item) => sum + item.principal_amount, 0);
  const totalPaidEMI = emis.reduce(
    (sum, item) => sum + (item.total_tenure - item.remaining_months) * item.emi_amount,
    0
  );
  const activeLoansCount = emis.length;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">EMI Tracker</h1>
          <p className="page-subtitle">Manage your loans, mortgages, and monthly installments</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Loan EMI
        </button>
      </div>

      {/* Summary Stats */}
      <div className="stat-grid">
        <div className="card flex flex-col gap-2">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Monthly EMI Outflow</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger)' }}>{fmtDecimal(totalMonthlyEMI)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Across all active EMIs</span>
        </div>
        <div className="card flex flex-col gap-2">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Borrowed Principal</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-primary)' }}>{fmt(totalPrincipal)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total initial loan portfolio</span>
        </div>
        <div className="card flex flex-col gap-2">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Paid EMI Amount</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{fmtDecimal(totalPaidEMI)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cumulatively paid so far</span>
        </div>
        <div className="card flex flex-col gap-2">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Active Loans</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--info)' }}>{activeLoansCount}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Currently tracking</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: 220 }} />
          ))}
        </div>
      ) : emis.length === 0 ? (
        <div className="card empty-state">
          <Landmark size={40} />
          <div>No active EMIs tracked yet</div>
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={14} /> Add your first loan
          </button>
        </div>
      ) : (
        <div className="grid-2">
          {emis.map((emi) => {
            const paidMonths = emi.total_tenure - emi.remaining_months;
            const progressPercent = Math.min(
              100,
              Math.max(0, (paidMonths / emi.total_tenure) * 100)
            );

            return (
              <div key={emi.id} className="card flex flex-col gap-4" style={{ height: '100%', justifyContent: 'space-between' }}>
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
                          justify: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Landmark size={20} style={{ color: 'var(--accent-primary)' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{emi.title}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          <span className="badge badge-info">
                            {emi.loan_type}
                          </span>
                          {emi.loan_platform && (
                            <span className="badge" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                              {emi.loan_platform}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" onClick={() => openEdit(emi)}>
                        <Pencil size={13} />
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${emi.title}"?`)) {
                            deleteMut.mutate(emi.id);
                          }
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Financial Info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', margin: '16px 0', fontSize: 13 }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>Monthly EMI</div>
                      <strong style={{ fontSize: 17, color: 'var(--danger)' }}>{fmtDecimal(emi.emi_amount)}</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>Principal Amount</div>
                      <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>{fmt(emi.principal_amount)}</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>Interest Rate</div>
                      <strong>{emi.interest_rate}% p.a.</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>Pay Via</div>
                      <span style={{ textTransform: 'capitalize' }}>{emi.payment_method}</span>
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '12px 0' }} />

                  {/* Progress Section */}
                  <div style={{ marginBottom: 12 }}>
                    <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-muted)' }}>
                      <span>Paid: <strong>{paidMonths}</strong> / {emi.total_tenure} months</span>
                      <span>{progressPercent.toFixed(0)}% Done</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${progressPercent}%`,
                          background: progressPercent >= 100 ? 'linear-gradient(90deg,#22c55e,#10b981)' : 'var(--accent-gradient)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
                  <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <Calendar size={13} style={{ color: 'var(--accent-primary)' }} />
                    <span>Next Due: <strong>{format(parseISO(emi.payment_due_date), 'dd MMM yyyy')}</strong></span>
                  </div>
                  {emi.notes && (
                    <div className="flex items-start gap-2" style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8, color: 'var(--text-muted)' }}>
                      <Notebook size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontStyle: 'italic', wordBreak: 'break-word' }}>{emi.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <Modal
          title={modal === 'create' ? 'Add Loan EMI' : 'Edit Loan EMI'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Loan Title *</label>
                <input
                  placeholder="e.g. Home Loan, Car Loan"
                  value={form.title}
                  onChange={(e) => onFieldChange('title', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Loan Platform / Lender</label>
                <input
                  placeholder="e.g. HDFC, SBI, Navi, Cred"
                  value={form.loan_platform || ''}
                  onChange={(e) => onFieldChange('loan_platform', e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Loan Type *</label>
                <select
                  value={form.loan_type}
                  onChange={(e) => onFieldChange('loan_type', e.target.value)}
                  required
                >
                  <option value="Housing">Housing / Home Loan</option>
                  <option value="Vehicle">Vehicle / Car Loan</option>
                  <option value="Household Items">Household Items Loan</option>
                  <option value="Education">Education Loan</option>
                  <option value="Personal">Personal Loan</option>
                  <option value="Business">Business Loan</option>
                  <option value="Gold">Gold Loan</option>
                  <option value="Other">Other Loan</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method *</label>
                <select
                  value={form.payment_method}
                  onChange={(e) => onFieldChange('payment_method', e.target.value)}
                  required
                >
                  <option value="bank transfer">Bank Transfer</option>
                  <option value="auto-debit">Auto-Debit</option>
                  <option value="upi">UPI</option>
                  <option value="advance payment">Advance Payment</option>
                  <option value="credit card">Credit Card</option>
                  <option value="debit card">Debit Card</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Principal Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 500000"
                  value={form.principal_amount}
                  onChange={(e) => onFieldChange('principal_amount', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Interest Rate (% p.a.) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 8.5"
                  value={form.interest_rate}
                  onChange={(e) => onFieldChange('interest_rate', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => onFieldChange('start_date', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => onFieldChange('end_date', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Total Tenure (months) *</label>
                <input
                  type="number"
                  min="1"
                  value={form.total_tenure}
                  onChange={(e) => onFieldChange('total_tenure', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Remaining Months *</label>
                <input
                  type="number"
                  min="0"
                  value={form.remaining_months}
                  onChange={(e) => onFieldChange('remaining_months', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Payment Due Date *</label>
                <input
                  type="date"
                  value={form.payment_due_date}
                  onChange={(e) => onFieldChange('payment_due_date', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Calculated EMI Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.emi_amount}
                  onChange={(e) => onFieldChange('emi_amount', e.target.value)}
                  required
                  style={{ fontWeight: 'bold', color: 'var(--danger)' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                rows={2}
                placeholder="Loan details, account numbers, etc."
                value={form.notes}
                onChange={(e) => onFieldChange('notes', e.target.value)}
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={createMut.isPending || updateMut.isPending}
              >
                Save Loan
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
