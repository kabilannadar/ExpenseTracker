import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi, categoriesApi, getApiError } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, Trash2, Paperclip, X, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const PAYMENT_METHODS = ['cash', 'upi', 'card', 'netbanking', 'wallet', 'other'];

const EMPTY_FORM = { title: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), category_id: '', payment_method: 'cash', note: '' };

export default function Expenses() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'create' | expense obj
  const [filters, setFilters] = useState({ q: '', category_id: '', payment_method: '', date_from: '', date_to: '' });
  const [sort, setSort] = useState('date_desc');
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => expensesApi.getAll(Object.fromEntries(Object.entries(filters).filter(([,v]) => v))).then(r => r.data),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data) => expensesApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['expenses']); qc.invalidateQueries(['dashboard']); toast.success('Expense added!'); setModal(null); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => expensesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['expenses']); qc.invalidateQueries(['dashboard']); toast.success('Expense updated!'); setModal(null); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => expensesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries(['expenses']); qc.invalidateQueries(['dashboard']); toast.success('Expense deleted'); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const openCreate = () => { setForm(EMPTY_FORM); setModal('create'); };
  const openEdit = (e) => {
    setForm({ title: e.title, amount: e.amount, date: e.date, category_id: e.category_id || '', payment_method: e.payment_method, note: e.note || '' });
    setModal(e);
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      category_id: form.category_id ? parseInt(form.category_id) : null,
      note: form.note.trim() || null,
    };
    if (modal === 'create') createMut.mutate(payload);
    else updateMut.mutate({ id: modal.id, data: payload });
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    if (sort === 'amount_desc') return b.amount - a.amount;
    if (sort === 'amount_asc')  return a.amount - b.amount;
    if (sort === 'date_asc')    return new Date(a.date) - new Date(b.date);
    return new Date(b.date) - new Date(a.date); // date_desc default
  });

  const totalShown = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">{expenses.length} entries · {fmt(totalShown)} total</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Expense</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div className="filter-grid">
          <div className="input-with-icon" style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input style={{ paddingLeft: 36 }} placeholder="Search..." value={filters.q} onChange={e => setFilters(p => ({ ...p, q: e.target.value }))} />
          </div>
          <select value={filters.category_id} onChange={e => setFilters(p => ({ ...p, category_id: e.target.value }))}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.payment_method} onChange={e => setFilters(p => ({ ...p, payment_method: e.target.value }))}>
            <option value="">All Payments</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
          </select>
          <input type="date" value={filters.date_from} onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} />
          <input type="date" value={filters.date_to} onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} />
          <div style={{ position: 'relative' }}>
            <ArrowUpDown size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select style={{ paddingLeft: 34 }} value={sort} onChange={e => setSort(e.target.value)}>
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>
          {(Object.values(filters).some(Boolean) || sort !== 'date_desc') && (
            <button className="btn-secondary" onClick={() => { setFilters({ q: '', category_id: '', payment_method: '', date_from: '', date_to: '' }); setSort('date_desc'); }}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="card"><div className="skeleton" style={{ height: 200 }} /></div>
      ) : expenses.length === 0 ? (
        <div className="card empty-state">
          <Trash2 size={40} />
          <div>No expenses found</div>
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add your first expense</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Payment</th>
                <th>Note</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map(e => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{format(new Date(e.date), 'dd MMM yy')}</td>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {e.attachment_path && <Paperclip size={12} style={{ color: 'var(--text-muted)' }} />}
                      {e.title}
                    </div>
                  </td>
                  <td>
                    {e.category ? (
                      <span className="badge" style={{ background: e.category.color + '22', color: e.category.color }}>
                        {e.category.name}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>}
                  </td>
                  <td><span className="badge badge-info">{e.payment_method.toUpperCase()}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 140 }}>
                    {e.note ? (
                      <div className="note-tooltip-container">
                        <span className="note-tooltip-trigger" style={{ maxWidth: 140 }}>
                          {e.note}
                        </span>
                        <div className="note-tooltip-content">
                          {e.note}
                        </div>
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>{fmt(e.amount)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" onClick={() => openEdit(e)} title="Edit"><Pencil size={14} /></button>
                      <button className="btn-icon btn-danger" onClick={() => { if (confirm('Delete this expense?')) deleteMut.mutate(e.id); }} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal title={modal === 'create' ? 'Add Expense' : 'Edit Expense'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input placeholder="e.g. Lunch at restaurant" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
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
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}>
                  <option value="">Uncategorized</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Note</label>
              <textarea rows={2} placeholder="Optional note..." value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                {modal === 'create' ? 'Add Expense' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
