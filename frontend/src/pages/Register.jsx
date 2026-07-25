import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { authApi, getApiError } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { UserPlus, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
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

// ── OTP Input Component ───────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      const next = [...digits];
      next[idx] = '';
      onChange(next.join(''));
      if (idx > 0) inputs.current[idx - 1]?.focus();
    } else if (/^\d$/.test(e.key)) {
      const next = [...digits];
      next[idx] = e.key;
      onChange(next.join(''));
      if (idx < 5) inputs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) onChange(pasted.padEnd(6, ''));
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '20px 0' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onKeyDown={e => handleKey(e, i)}
          onPaste={handlePaste}
          onChange={() => {}}
          style={{
            width: '44px', height: '52px', textAlign: 'center',
            fontSize: '22px', fontWeight: '700', borderRadius: '10px',
            border: `2px solid ${digits[i] ? 'var(--accent-primary)' : 'var(--border)'}`,
            background: 'var(--bg-card)', color: 'var(--text-primary)',
            outline: 'none', transition: 'border-color 0.15s ease',
            caretColor: 'transparent',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
          onBlur={e => e.target.style.borderColor = digits[i] ? 'var(--accent-primary)' : 'var(--border)'}
        />
      ))}
    </div>
  );
}

// ── Main Register Component ───────────────────────────────────────────────────
export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // step: 'main' | 'email-form' | 'otp'
  const [step, setStep] = useState('main');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Google Sign-Up ──────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    try {
      const { data } = await authApi.googleLogin(tokenResponse.access_token);
      localStorage.setItem('token', data.access_token);
      login(data.access_token, data);
      toast.success(`Account created! Welcome, ${data.name} 🎉`);
      navigate('/');
    } catch (err) {
      toast.error(getApiError(err, 'Google sign-up failed.'));
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error('Google sign-up was cancelled or failed.'),
  });

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await authApi.sendOtp(form.email);
      toast.success('Verification code sent! Check your inbox.');
      setStep('otp');
      setResendCooldown(60);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to send OTP.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP & Register ──────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error('Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.register({ ...form, otp });
      localStorage.setItem('token', data.access_token);
      login(data.access_token, data);
      toast.success('Account created! Welcome 🎉');
      navigate('/');
    } catch (err) {
      toast.error(getApiError(err, 'Verification failed. Check your code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await authApi.sendOtp(form.email);
      toast.success('New code sent!');
      setResendCooldown(60);
      setOtp('');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to resend.'));
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

          {/* ── Step: Main (Google or Email toggle) ── */}
          {step === 'main' && (
            <>
              <h1 className="auth-title" style={{ fontSize: '20px', marginTop: '4px', marginBottom: '4px' }}>Create account</h1>
              <p className="auth-sub" style={{ marginBottom: '24px' }}>Start tracking your expenses today</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button id="google-signup-btn" className="google-signin-btn" onClick={() => googleLogin()} disabled={loading}>
                  {loading ? <span className="google-signin-spinner" /> : <GoogleIcon />}
                  <span>{loading ? 'Registering...' : 'Sign up with Google'}</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                  <span style={{ padding: '0 12px', fontSize: '12px', color: 'var(--text-muted)' }}>or</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>

                <button type="button" className="google-signin-btn" style={{ background: 'transparent', boxShadow: 'none' }}
                  onClick={() => setStep('email-form')}>
                  <Mail size={18} style={{ marginRight: '8px' }} />
                  <span>Sign up with email</span>
                </button>
              </div>

              <p className="auth-link">Already have an account? <Link to="/login">Sign in</Link></p>
            </>
          )}

          {/* ── Step: Email Form ── */}
          {step === 'email-form' && (
            <>
              <button type="button" onClick={() => setStep('main')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: '0', marginBottom: '16px' }}>
                <ArrowLeft size={14} /> Back
              </button>
              <h1 className="auth-title" style={{ fontSize: '20px', marginTop: '0', marginBottom: '4px' }}>Sign up with email</h1>
              <p className="auth-sub" style={{ marginBottom: '24px' }}>We'll send a verification code to confirm your email</p>

              <form onSubmit={handleSendOtp} className="auth-form">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" placeholder="Your name" value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" placeholder="you@example.com" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" placeholder="Min. 6 characters" value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
                </div>
                <button type="submit" className="btn-primary auth-btn" style={{ padding: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }} disabled={loading}>
                  <Mail size={16} />
                  {loading ? 'Sending code...' : 'Send Verification Code'}
                </button>
              </form>
              <p className="auth-link">Already have an account? <Link to="/login">Sign in</Link></p>
            </>
          )}

          {/* ── Step: OTP Verification ── */}
          {step === 'otp' && (
            <>
              <button type="button" onClick={() => { setStep('email-form'); setOtp(''); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: '0', marginBottom: '16px' }}>
                <ArrowLeft size={14} /> Back
              </button>
              <h1 className="auth-title" style={{ fontSize: '20px', marginTop: '0', marginBottom: '4px' }}>Verify your email</h1>
              <p className="auth-sub" style={{ marginBottom: '8px' }}>
                We sent a 6-digit code to<br />
                <strong style={{ color: 'var(--text-primary)' }}>{form.email}</strong>
              </p>

              <form onSubmit={handleVerifyOtp}>
                <OtpInput value={otp} onChange={setOtp} />

                <button type="submit" className="btn-primary auth-btn" style={{ padding: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', width: '100%', justifyContent: 'center' }} disabled={loading || otp.length < 6}>
                  <UserPlus size={16} />
                  {loading ? 'Creating account...' : 'Verify & Create Account'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent-primary)', cursor: resendCooldown > 0 ? 'default' : 'pointer', fontSize: '13px', fontWeight: '500' }}>
                  <RefreshCw size={13} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
