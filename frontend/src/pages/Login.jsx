import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { authApi, userApi, getApiError } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn, Mail } from 'lucide-react';
import './Auth.css';

const signupLogo = 'https://ik.imagekit.io/kabi10/tr:q-auto,f-auto/ExpenseTracker_signup-removebg-preview.png';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" style={{ marginRight: '8px' }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // State for toggling between Google Sign-In and Email Fallback
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  // Google Sign-In Handler
  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    try {
      // Send the access token to the backend
      const { data } = await authApi.googleLogin(tokenResponse.access_token);

      localStorage.setItem('token', data.access_token);
      login(data.access_token, data);
      toast.success(`Welcome, ${data.name}! 🎉`);

      const pendingChatId = sessionStorage.getItem('pending_telegram_chat_id');
      if (pendingChatId) {
        navigate('/telegram');
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(getApiError(err, 'Google sign-in failed.'));
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error('Google sign-in was cancelled or failed.'),
  });

  // Email / Password Fallback Submit Handler
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(emailForm);
      // Store token before calling getMe so the Axios interceptor picks it up
      localStorage.setItem('token', data.access_token);
      const userRes = await userApi.getMe();
      login(data.access_token, userRes.data);
      toast.success('Welcome back!');
      const pendingChatId = sessionStorage.getItem('pending_telegram_chat_id');
      if (pendingChatId) {
        navigate('/telegram');
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(getApiError(err, 'Login failed'));
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
          <h1 className="auth-title" style={{ fontSize: '20px', marginTop: '4px', marginBottom: '4px' }}>
            Welcome back
          </h1>
          <p className="auth-sub" style={{ marginBottom: '24px' }}>
            Sign in to manage your finances
          </p>

          {!showEmailForm ? (
            // Default View: Google Sign-In Only
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                id="google-signin-btn"
                className="google-signin-btn"
                onClick={() => googleLogin()}
                disabled={loading}
              >
                {loading ? (
                  <span className="google-signin-spinner" />
                ) : (
                  <GoogleIcon />
                )}
                <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                <span style={{ padding: '0 12px', fontSize: '12px', color: 'var(--text-muted)' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              </div>

              <button
                type="button"
                className="google-signin-btn"
                style={{ 
                  background: 'transparent', 
                  boxShadow: 'none',
                  borderColor: 'var(--border)' 
                }}
                onClick={() => setShowEmailForm(true)}
              >
                <Mail size={18} style={{ marginRight: '8px' }} />
                <span>Sign in with email & password</span>
              </button>
            </div>
          ) : (
            // Fallback View: Email/Password Form
            <div>
              <form onSubmit={handleEmailSubmit} className="auth-form">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={emailForm.email}
                    onChange={e => setEmailForm(p => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-with-icon">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={emailForm.password}
                      onChange={e => setEmailForm(p => ({ ...p, password: e.target.value }))}
                      required
                    />
                    <button type="button" className="input-icon-btn" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn-primary auth-btn" style={{ padding: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }} disabled={loading}>
                  <LogIn size={16} />
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0 12px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                <span style={{ padding: '0 12px', fontSize: '12px', color: 'var(--text-muted)' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              </div>

              <button
                type="button"
                className="google-signin-btn"
                onClick={() => {
                  setShowEmailForm(false);
                  setEmailForm({ email: '', password: '' });
                }}
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          <p className="auth-footer-note">
            By continuing, you agree to our terms of service.<br />
            Google sign-in automatically maps to existing accounts.
          </p>

          <p className="auth-link">
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
