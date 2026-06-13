import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, userApi, getApiError } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import './Auth.css';
import signupLogo from '../assets/ExpenseTracker_signup-removebg-preview.png';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.register(form);
      const loginRes = await authApi.login({ email: form.email, password: form.password });
      // Set token before calling getMe so the Axios interceptor picks it up
      localStorage.setItem('token', loginRes.data.access_token);
      const userRes = await userApi.getMe();
      login(loginRes.data.access_token, userRes.data);
      toast.success('Account created! Welcome 🎉');
      navigate('/');
    } catch (err) {
      toast.error(getApiError(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-container">
        <img src={signupLogo} alt="ExpenseTracker Logo" className="auth-banner-logo" />
        <div className="auth-card">
          <h1 className="auth-title" style={{ fontSize: '20px', marginTop: '4px', marginBottom: '4px' }}>Create account</h1>
          <p className="auth-sub" style={{ marginBottom: '24px' }}>Start tracking your expenses today</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            <UserPlus size={16} />
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  </div>
  );
}

