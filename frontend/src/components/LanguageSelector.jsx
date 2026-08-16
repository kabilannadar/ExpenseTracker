import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languagesCompact = [
  { code: 'en', name: 'EN' },
  { code: 'hi', name: 'HI' },
  { code: 'ta', name: 'TA' },
  { code: 'te', name: 'TE' },
  { code: 'kn', name: 'KN' },
  { code: 'ml', name: 'ML' },
  { code: 'mr', name: 'MR' },
  { code: 'gu', name: 'GU' },
  { code: 'bn', name: 'BN' },
];

const languagesForm = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml', name: 'മലയാളം (Malayalam)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
];

export default function LanguageSelector({ variant = 'compact' }) {
  const { i18n } = useTranslation();

  const handleChange = (e) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    document.documentElement.lang = lang;
    window.location.reload();
  };

  if (variant === 'form') {
    return (
      <select
        value={i18n.language || 'en'}
        onChange={handleChange}
        title="Change Language"
      >
        {languagesForm.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
      <Globe size={14} style={{ color: 'var(--text-muted)' }} />
      <select
        value={i18n.language || 'en'}
        onChange={handleChange}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: '12px',
          fontWeight: '500',
          padding: '3px 20px 3px 6px',
          cursor: 'pointer',
          outline: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 6px center',
          transition: 'var(--transition)'
        }}
        title="Change Language"
      >
        {languagesCompact.map((lang) => (
          <option key={lang.code} value={lang.code} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
