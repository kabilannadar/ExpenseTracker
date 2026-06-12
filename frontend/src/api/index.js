import axios from 'axios';

// Safely extract a human-readable error string from any FastAPI/axios error.
// FastAPI 422 validation errors return detail as an array of {type,loc,msg,input} objects.
export const getApiError = (err, fallback = 'Something went wrong') => {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(d => d.msg || JSON.stringify(d)).join(', ');
  return fallback;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isAuthEndpoint = url.includes('/api/auth/login') || url.includes('/api/auth/register');
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authApi = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
};

// User
export const userApi = {
  getMe: () => api.get('/api/users/me'),
  updateMe: (data) => api.put('/api/users/me', data),
};

// Categories
export const categoriesApi = {
  getAll: () => api.get('/api/categories/'),
  create: (data) => api.post('/api/categories/', data),
  update: (id, data) => api.put(`/api/categories/${id}`, data),
  delete: (id) => api.delete(`/api/categories/${id}`),
};

// Expenses
export const expensesApi = {
  getAll: (params) => api.get('/api/expenses/', { params }),
  create: (data) => api.post('/api/expenses/', data),
  update: (id, data) => api.put(`/api/expenses/${id}`, data),
  delete: (id) => api.delete(`/api/expenses/${id}`),
  uploadAttachment: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/api/expenses/${id}/attachment`, form);
  },
};

// Income
export const incomeApi = {
  getAll: () => api.get('/api/income/'),
  create: (data) => api.post('/api/income/', data),
  update: (id, data) => api.put(`/api/income/${id}`, data),
  delete: (id) => api.delete(`/api/income/${id}`),
};

// Budgets
export const budgetsApi = {
  getAll: () => api.get('/api/budgets/'),
  create: (data) => api.post('/api/budgets/', data),
  update: (id, data) => api.put(`/api/budgets/${id}`, data),
  delete: (id) => api.delete(`/api/budgets/${id}`),
};

// Reminders
export const remindersApi = {
  getAll: () => api.get('/api/reminders/'),
  create: (data) => api.post('/api/reminders/', data),
  update: (id, data) => api.put(`/api/reminders/${id}`, data),
  delete: (id) => api.delete(`/api/reminders/${id}`),
};

// Recurring
export const recurringApi = {
  getAll: () => api.get('/api/recurring/'),
  create: (data) => api.post('/api/recurring/', data),
  update: (id, data) => api.put(`/api/recurring/${id}`, data),
  delete: (id) => api.delete(`/api/recurring/${id}`),
};

// Subscriptions
export const subscriptionsApi = {
  getAll: () => api.get('/api/subscriptions/'),
  create: (data) => api.post('/api/subscriptions/', data),
  update: (id, data) => api.put(`/api/subscriptions/${id}`, data),
  delete: (id) => api.delete(`/api/subscriptions/${id}`),
};

// Goals
export const goalsApi = {
  getAll: () => api.get('/api/goals/'),
  create: (data) => api.post('/api/goals/', data),
  update: (id, data) => api.put(`/api/goals/${id}`, data),
  delete: (id) => api.delete(`/api/goals/${id}`),
};

// Audit Logs
export const auditLogsApi = {
  getAll: (limit = 100) => api.get('/api/audit-logs/', { params: { limit } }),
};

// Analytics
export const analyticsApi = {
  getDashboard: () => api.get('/api/analytics/dashboard'),
};

// Export
export const exportApi = {
  csv: (params) => api.get('/api/export/csv', { params, responseType: 'blob' }),
  excel: (params) => api.get('/api/export/excel', { params, responseType: 'blob' }),
};

// EMIs
export const emisApi = {
  getAll: () => api.get('/api/emis/'),
  create: (data) => api.post('/api/emis/', data),
  update: (id, data) => api.put(`/api/emis/${id}`, data),
  delete: (id) => api.delete(`/api/emis/${id}`),
};

// Debts
export const debtsApi = {
  getAll: () => api.get('/api/debts/'),
  create: (data) => api.post('/api/debts/', data),
  update: (id, data) => api.put(`/api/debts/${id}`, data),
  delete: (id) => api.delete(`/api/debts/${id}`),
};

// Savings
export const savingsApi = {
  getAll: () => api.get('/api/savings/'),
  create: (data) => api.post('/api/savings/', data),
  update: (id, data) => api.put(`/api/savings/${id}`, data),
  delete: (id) => api.delete(`/api/savings/${id}`),
};

