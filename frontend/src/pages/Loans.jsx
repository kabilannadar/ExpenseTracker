import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { emisApi, debtsApi, getApiError } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Landmark, Coins, Calculator, Calendar, Landmark as BankIcon, Plus, FileText, ArrowRight, Trash2 } from 'lucide-react';
import { format, addMonths } from 'date-fns';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDecimal = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Loans() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  // Queries
  const { data: emis = [], isLoading: isEmisLoading } = useQuery({
    queryKey: ['emis'],
    queryFn: () => emisApi.getAll().then((r) => r.data),
  });

  const { data: debts = [], isLoading: isDebtsLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: () => debtsApi.getAll().then((r) => r.data),
  });

  // Calculator State
  const [calcAmount, setCalcAmount] = useState('1000000');
  const [calcRate, setCalcRate] = useState('8.5');
  const [calcTenure, setCalcTenure] = useState('12'); // in months
  const [showAmortization, setShowAmortization] = useState(false);

  // Save Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [modalMode, setModalMode] = useState('save'); // 'save' | 'create'
  const [saveForm, setSaveForm] = useState({
    title: '',
    loan_type: 'Personal',
    loan_platform: '',
    principal_amount: '',
    interest_rate: '',
    emi_amount: '',
    total_tenure: '',
    start_date: '',
    payment_method: 'bank transfer',
    notes: '',
  });

  // Mutations
  const deleteEmiMut = useMutation({
    mutationFn: (id) => emisApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['emis']);
      toast.success('Loan deleted successfully.');
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const saveLoanMut = useMutation({
    mutationFn: (data) => emisApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['emis']);
      toast.success('Calculated loan added to your tracking list!');
      setShowSaveModal(false);
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  // Stats memo
  const stats = useMemo(() => {
    const totalEmiPrincipal = emis.reduce((sum, e) => sum + e.principal_amount, 0);
    const totalDebtAmount = debts.reduce((sum, d) => sum + d.amount, 0);
    const monthlyEmiOutflow = emis.reduce((sum, e) => sum + e.emi_amount, 0);
    const activeCount = emis.length + debts.filter(d => !d.is_paid).length;

    return {
      totalBorrowed: totalEmiPrincipal + totalDebtAmount,
      monthlyEmiOutflow,
      activeCount,
    };
  }, [emis, debts]);

  // Calculator computations
  const calculations = useMemo(() => {
    const P = parseFloat(calcAmount) || 0;
    const annualR = parseFloat(calcRate) || 0;
    const N = parseInt(calcTenure) || 0;

    if (P <= 0 || annualR <= 0 || N <= 0) {
      return { emi: 0, totalInterest: 0, totalPayment: 0, schedule: [] };
    }

    const r = annualR / (12 * 100); // monthly interest rate
    const emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
    const totalPayment = emi * N;
    const totalInterest = totalPayment - P;

    // Generate schedule
    const schedule = [];
    let balance = P;
    for (let i = 1; i <= N; i++) {
      const interest = balance * r;
      const principal = emi - interest;
      const endingBalance = Math.max(0, balance - principal);

      schedule.append ? schedule.push({
        month: i,
        startBalance: balance,
        emi,
        principal,
        interest,
        endBalance: endingBalance
      }) : schedule.push({
        month: i,
        startBalance: balance,
        emi,
        principal,
        interest,
        endBalance: endingBalance
      });

      balance = endingBalance;
    }

    return { emi, totalInterest, totalPayment, schedule };
  }, [calcAmount, calcRate, calcTenure]);

  const handleOpenSaveModal = () => {
    setModalMode('save');
    setSaveForm({
      title: 'Calculated Loan',
      loan_type: 'Personal',
      loan_platform: '',
      principal_amount: calcAmount,
      interest_rate: calcRate,
      emi_amount: calculations.emi.toFixed(2),
      total_tenure: calcTenure,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'bank transfer',
      notes: `Calculated loan of ${fmt(calcAmount)} at ${calcRate}% for ${calcTenure} months.`,
    });
    setShowSaveModal(true);
  };

  const handleOpenManualAdd = () => {
    setModalMode('create');
    setSaveForm({
      title: '',
      loan_type: 'Personal',
      loan_platform: '',
      principal_amount: '',
      interest_rate: '',
      emi_amount: '',
      total_tenure: '12',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'bank transfer',
      notes: '',
    });
    setShowSaveModal(true);
  };

  const handleFormChange = (field, value) => {
    setSaveForm(prev => {
      const next = { ...prev, [field]: value };
      
      // Auto-calculate EMI if inputs change in manual create mode
      if (modalMode === 'create' && (field === 'principal_amount' || field === 'interest_rate' || field === 'total_tenure')) {
        const P = parseFloat(next.principal_amount) || 0;
        const R = parseFloat(next.interest_rate) || 0;
        const N = parseInt(next.total_tenure) || 0;
        
        if (P > 0 && R > 0 && N > 0) {
          const r = R / (12 * 100);
          const emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
          next.emi_amount = emi.toFixed(2);
        } else {
          next.emi_amount = '';
        }
      }
      return next;
    });
  };

  const handleSaveLoan = (e) => {
    e.preventDefault();
    if (!saveForm.title.trim()) {
      toast.error('Please enter a loan title.');
      return;
    }

    const p = parseFloat(saveForm.principal_amount);
    const r = parseFloat(saveForm.interest_rate);
    const t = parseInt(saveForm.total_tenure);
    const emi = parseFloat(saveForm.emi_amount);

    if (isNaN(p) || p <= 0) {
      toast.error('Please enter a valid principal amount.');
      return;
    }
    if (isNaN(r) || r < 0) {
      toast.error('Please enter a valid interest rate.');
      return;
    }
    if (isNaN(t) || t <= 0) {
      toast.error('Please enter a valid tenure.');
      return;
    }
    if (isNaN(emi) || emi <= 0) {
      toast.error('Please enter a valid monthly EMI.');
      return;
    }

    const parsedStart = new Date(saveForm.start_date);
    const startDateStr = format(parsedStart, 'yyyy-MM-dd');
    const endDateStr = format(addMonths(parsedStart, t), 'yyyy-MM-dd');

    saveLoanMut.mutate({
      title: saveForm.title.trim(),
      loan_type: saveForm.loan_type,
      loan_platform: saveForm.loan_platform || null,
      principal_amount: p,
      interest_rate: r,
      emi_amount: emi,
      start_date: startDateStr,
      end_date: endDateStr,
      total_tenure: t,
      remaining_months: t,
      payment_due_date: startDateStr,
      payment_method: saveForm.payment_method,
      notes: saveForm.notes || null,
    });
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Loans & Liabilities</h1>
          <p className="page-subtitle">Unified view of your active loans, installments, and amortization calculator.</p>
        </div>
        <button
          onClick={handleOpenManualAdd}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Add Loan
        </button>
      </div>

      {/* KPI Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, color: 'var(--danger)' }}>
            <Landmark size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total Borrowed Principal</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{fmt(stats.totalBorrowed)}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, color: 'var(--warning)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Monthly Outflow (EMI)</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{fmt(stats.monthlyEmiOutflow)}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, background: 'rgba(99, 102, 241, 0.1)', borderRadius: 12, color: 'var(--accent-primary)' }}>
            <Coins size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Active Liabilities</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{stats.activeCount} accounts</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid-2" style={{ gap: 20, marginTop: 20, alignItems: 'start' }}>
        
        {/* Left Column: Calculator */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calculator size={18} style={{ color: 'var(--accent-primary)' }} /> Loan Amortization Calculator
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Loan Amount (Principal) *</label>
              <input
                type="number"
                value={calcAmount}
                onChange={e => setCalcAmount(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Annual Interest Rate (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={calcRate}
                  onChange={e => setCalcRate(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tenure (Months) *</label>
                <input
                  type="number"
                  value={calcTenure}
                  onChange={e => setCalcTenure(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* Calculations Display */}
            {calculations.emi > 0 && (
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 16, marginTop: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Monthly EMI</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-primary)' }}>{fmtDecimal(calculations.emi)}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Total Interest</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--warning)' }}>{fmtDecimal(calculations.totalInterest)}</span>
                  </div>
                </div>
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Total Payable Amount</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{fmtDecimal(calculations.totalPayment)}</span>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button
                    onClick={() => setShowAmortization(!showAmortization)}
                    className="btn-secondary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <FileText size={14} /> Amortization
                  </button>
                  <button
                    onClick={handleOpenSaveModal}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Plus size={14} /> Save to Track
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Amortization Schedule Drawer */}
          {showAmortization && calculations.schedule.length > 0 && (
            <div style={{ marginTop: 20, maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Month</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Principal</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Interest</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.schedule.map((row) => (
                    <tr key={row.month} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{row.month}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{fmt(row.principal)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{fmt(row.interest)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{fmt(row.endBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Tracked Loans */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BankIcon size={18} style={{ color: 'var(--accent-primary)' }} /> Tracked Active Loans (EMIs)
          </h2>

          {(isEmisLoading || isDebtsLoading) ? (
            <div style={{ color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>Loading loans...</div>
          ) : emis.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
              {t('No active loans being tracked. Use the calculator on the left and click')} <strong>"{t('Save to Track')}"</strong> {t('to list them here.')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {emis.map((emi) => (
                <div key={emi.id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'between', alignItems: 'center', background: 'var(--bg-elevated)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{emi.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {emi.loan_type} · {emi.loan_platform || 'No platform'} · {emi.remaining_months} / {emi.total_tenure} months left
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4, fontWeight: 500 }}>
                      Principal: <span style={{ color: 'var(--text-secondary)' }}>{fmt(emi.principal_amount)}</span> @ {emi.interest_rate}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{fmtDecimal(emi.emi_amount)}/mo</div>
                    <button
                      onClick={() => { if(confirm('Delete tracking for this loan?')) deleteEmiMut.mutate(emi.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 2 }}
                      title="Stop tracking loan"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Loan Modal */}
      {showSaveModal && (
        <Modal title={modalMode === 'save' ? 'Save Calculated Loan' : 'Add Tracked Loan'} onClose={() => setShowSaveModal(false)}>
          <form onSubmit={handleSaveLoan} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Loan Title *</label>
              <input
                type="text"
                value={saveForm.title}
                onChange={e => handleFormChange('title', e.target.value)}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="grid-2" style={{ gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Loan Type</label>
                <select
                  value={saveForm.loan_type}
                  onChange={e => handleFormChange('loan_type', e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                >
                  <option value="Personal">Personal Loan</option>
                  <option value="Housing">Housing / Home Loan</option>
                  <option value="Vehicle">Vehicle / Car Loan</option>
                  <option value="Education">Education Loan</option>
                  <option value="Business">Business Loan</option>
                  <option value="Gold">Gold Loan</option>
                  <option value="Other">Other Loan</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Lender / Platform</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, SBI"
                  value={saveForm.loan_platform}
                  onChange={e => handleFormChange('loan_platform', e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* Calculations parameters for manual direct add */}
            {modalMode === 'create' ? (
              <>
                <div className="grid-3" style={{ gap: 8 }}>
                  <div className="form-group">
                    <label className="form-label">Principal *</label>
                    <input
                      type="number"
                      value={saveForm.principal_amount}
                      onChange={e => handleFormChange('principal_amount', e.target.value)}
                      required
                      placeholder="e.g. 50000"
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Interest % *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={saveForm.interest_rate}
                      onChange={e => handleFormChange('interest_rate', e.target.value)}
                      required
                      placeholder="e.g. 7.5"
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Months *</label>
                    <input
                      type="number"
                      value={saveForm.total_tenure}
                      onChange={e => handleFormChange('total_tenure', e.target.value)}
                      required
                      placeholder="e.g. 12"
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Monthly EMI *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={saveForm.emi_amount}
                      onChange={e => handleFormChange('emi_amount', e.target.value)}
                      required
                      placeholder="Calculated automatically"
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontWeight: 'bold' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      value={saveForm.start_date}
                      onChange={e => handleFormChange('start_date', e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </>
            ) : null}

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <input
                type="text"
                value={saveForm.payment_method}
                onChange={e => handleFormChange('payment_method', e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                value={saveForm.notes}
                onChange={e => handleFormChange('notes', e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: 10 }}
              disabled={saveLoanMut.isPending}
            >
              Confirm & Save
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
