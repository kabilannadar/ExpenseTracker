import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, userApi, getApiError } from '../api'; // patched
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import './Auth.css';
import bannerLightTagline from '../assets/banner-light-tagline.png';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      // Store token before calling getMe so the Axios interceptor picks it up
      localStorage.setItem('token', data.access_token);
      const userRes = await userApi.getMe();
      login(data.access_token, userRes.data);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(getApiError(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '24px', zIndex: 1, padding: '0 16px' }}>
        <div style={{ width: '100%', maxWidth: '520px', display: 'flex', justifyContent: 'center', margin: '-30px 0 -85px 0' }}>
          <img 
            src={bannerLightTagline} 
            alt="ExpenseTracker Logo" 
            style={{ width: '100%', height: 'auto', objectFit: 'contain' }} 
          />
        </div>
        <div className="auth-card" style={{ width: '100%', maxWidth: '420px', marginTop: 0 }}>
          <h1 className="auth-title" style={{ fontSize: '22px', marginBottom: '4px' }}>Welcome back</h1>
          <p className="auth-sub" style={{ marginBottom: '24px' }}>Sign in to your account</p>

          <form onSubmit={handleSubmit} className="auth-form">
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
              <div className="input-with-icon">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
                <button type="button" className="input-icon-btn" onClick={() => setShowPwd(!showPwd)}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary auth-btn" disabled={loading}>
              <LogIn size={16} />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-link">
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

