import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incomeApi, getApiError } from '../api';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const SOURCES = ['salary', 'freelancing', 'gifts', 'cable', 'other'];
const EMPTY = { source: 'salary', amount: '', date: format(new Date(), 'yyyy-MM-dd'), payment_method: 'cash', note: '' };
const SOURCE_COLORS = { salary: 'success', freelancing: 'info', gifts: 'warning', cable: 'accent', other: 'accent' };

export default function Income() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: income = [], isLoading } = useQuery({
    queryKey: ['income'],
    queryFn: () => incomeApi.getAll().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => incomeApi.create(d),
    onSuccess: () => { qc.invalidateQueries(['income']); qc.invalidateQueries(['dashboard']); toast.success('Income added!'); setModal(null); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => incomeApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['income']); qc.invalidateQueries(['dashboard']); toast.success('Income updated!'); setModal(null); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => incomeApi.delete(id),
    onSuccess: () => { qc.invalidateQueries(['income']); qc.invalidateQueries(['dashboard']); toast.success('Income deleted'); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit = (i) => { setForm({ source: i.source, amount: i.amount, date: i.date, payment_method: i.payment_method || 'cash', note: i.note || '' }); setModal(i); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, amount: parseFloat(form.amount) };
    if (modal === 'create') createMut.mutate(payload);
    else updateMut.mutate({ id: modal.id, data: payload });
  };

  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const bySource = SOURCES.map(s => ({ source: s, total: income.filter(i => i.source === s).reduce((a, i) => a + i.amount, 0) }));

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Income</h1>
          <p className="page-subtitle">Total: {fmt(totalIncome)}</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Income</button>
      </div>

      <div className="stat-grid">
        {bySource.map(({ source, total }) => (
          <StatCard key={source} title={source.charAt(0).toUpperCase() + source.slice(1)} value={fmt(total)} icon={TrendingUp} color={SOURCE_COLORS[source]} />
        ))}
      </div>

      {isLoading ? (
        <div className="card skeleton" style={{ height: 200 }} />
      ) : income.length === 0 ? (
        <div className="card empty-state">
          <Wallet size={40} />
          <div>No income records yet</div>
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add Income</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Method</th>
                <th>Note</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {income.map(i => (
                <tr key={i.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{format(new Date(i.date), 'dd MMM yyyy')}</td>
                  <td><span className={`badge badge-${SOURCE_COLORS[i.source]}`}>{i.source}</span></td>
                  <td><span className="badge badge-info">{i.payment_method ? i.payment_method.toUpperCase() : 'CASH'}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 140 }}>
                    {i.note ? (
                      <div className="note-tooltip-container">
                        <span className="note-tooltip-trigger" style={{ maxWidth: 140 }}>
                          {i.note}
                        </span>
                        <div className="note-tooltip-content">
                          {i.note}
                        </div>
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{fmt(i.amount)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" onClick={() => openEdit(i)}><Pencil size={14} /></button>
                      <button className="btn-icon btn-danger" onClick={() => { if (confirm('Delete?')) deleteMut.mutate(i.id); }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Add Income' : 'Edit Income'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Source *</label>
                <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                  {SOURCES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Method / Type *</label>
                <select value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}>
                  {['cash', 'upi', 'card', 'netbanking', 'wallet', 'other'].map(m => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Amount (₹) *</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Note</label>
              <input placeholder="Optional note..." value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                {modal === 'create' ? 'Add Income' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
