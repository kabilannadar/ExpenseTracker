import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incomeApi, categoriesApi, getApiError } from '../api';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const EMPTY = { category_id: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), payment_method: 'upi', note: '' };

export default function Income() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: income = [], isLoading: isIncomeLoading } = useQuery({
    queryKey: ['income'],
    queryFn: () => incomeApi.getAll().then(r => r.data),
  });

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then(r => r.data),
  });

  const isLoading = isIncomeLoading || isCategoriesLoading;
  const incomeCategories = categories.filter(c => c.type === 'income');

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

  const openCreate = () => {
    const defaultCat = incomeCategories.find(c => c.is_default) || incomeCategories[0];
    setForm({
      category_id: defaultCat ? defaultCat.id : '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'upi',
      note: ''
    });
    setModal('create');
  };
  const openEdit = (i) => {
    setForm({
      category_id: i.category_id || '',
      amount: i.amount,
      date: i.date,
      payment_method: i.payment_method || 'upi',
      note: i.note || ''
    });
    setModal(i);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      category_id: parseInt(form.category_id),
      amount: parseFloat(form.amount),
      date: form.date,
      payment_method: form.payment_method,
      note: form.note
    };
    if (modal === 'create') createMut.mutate(payload);
    else updateMut.mutate({ id: modal.id, data: payload });
  };

  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const bySource = incomeCategories.map(cat => ({
    category: cat,
    total: income.filter(i => i.category_id === cat.id).reduce((a, i) => a + i.amount, 0)
  }));

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
        {bySource.map(({ category, total }) => (
          <StatCard key={category.id} title={category.name} value={fmt(total)} icon={TrendingUp} color={category.color} />
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
                  <td>
                    <span 
                      className="badge" 
                      style={{ 
                        background: (i.category?.color || '#6b7280') + '22', 
                        color: i.category?.color || '#6b7280',
                        border: `1px solid ${(i.category?.color || '#6b7280')}44`
                      }}
                    >
                      {i.category?.name || i.source || 'Other'}
                    </span>
                  </td>
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
                <label className="form-label">Category *</label>
                <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} required>
                  <option value="" disabled>Select Category</option>
                  {incomeCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
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
