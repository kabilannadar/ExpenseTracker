import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English',              native: 'English'    },
  { code: 'hi', name: 'Hindi',                native: 'हिंदी'       },
  { code: 'ta', name: 'Tamil',                native: 'தமிழ்'       },
  { code: 'te', name: 'Telugu',               native: 'తెలుగు'      },
  { code: 'kn', name: 'Kannada',              native: 'ಕನ್ನಡ'       },
  { code: 'ml', name: 'Malayalam',            native: 'മലയാളം'      },
  { code: 'mr', name: 'Marathi',              native: 'मराठी'       },
  { code: 'gu', name: 'Gujarati',             native: 'ગુજરાતી'     },
  { code: 'bn', name: 'Bengali',              native: 'বাংলা'       },
];

const FLAG_EMOJI = {
  en: '🇬🇧', hi: '🇮🇳', ta: '🇮🇳', te: '🇮🇳',
  kn: '🇮🇳', ml: '🇮🇳', mr: '🇮🇳', gu: '🇮🇳', bn: '🇧🇩',
};

export default function LanguageSelector({ variant = 'compact' }) {
  const { i18n } = useTranslation();
  const [open, setOpen]       = useState(false);
  const ref                   = useRef(null);
  const currentCode           = i18n.language?.split('-')[0] || 'en';
  const current               = LANGUAGES.find(l => l.code === currentCode) || LANGUAGES[0];

  const apply = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    document.documentElement.lang = code;
    setOpen(false);
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── form variant (Profile page) ─────────────────────────────────────────
  if (variant === 'form') {
    return (
      <div ref={ref} style={{ position: 'relative', width: '100%' }}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          title="Change Language"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '10px 14px',
            background: 'var(--bg-surface)',
            border: `1px solid ${open ? 'var(--accent-primary)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.18s ease',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>{FLAG_EMOJI[current.code]}</span>
            <span>{current.native} ({current.name})</span>
          </div>
          <ChevronDown
            size={16}
            style={{
              color: 'var(--text-muted)',
              transition: 'transform 0.18s ease',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              flexShrink: 0,
            }}
          />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 9999,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.04)',
              padding: '6px',
              animation: 'dropdownFadeIn 0.15s ease',
              maxHeight: '260px',
              overflowY: 'auto',
            }}
          >
            <style>{`
              @keyframes dropdownFadeIn {
                from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
              }
              .lang-option-row:hover {
                background: var(--bg-elevated) !important;
              }
            `}</style>
            {LANGUAGES.map(lang => {
              const isActive = lang.code === currentCode;
              return (
                <button
                  type="button"
                  key={lang.code}
                  className="lang-option-row"
                  onClick={() => apply(lang.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 10px',
                    background: isActive ? 'var(--bg-elevated)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 400,
                    textAlign: 'left',
                    transition: 'background 0.12s ease',
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{FLAG_EMOJI[lang.code]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{lang.native}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{lang.name}</div>
                  </div>
                  {isActive && (
                    <Check size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── compact variant (Header) ─────────────────────────────────────────────
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Change Language"
        aria-label="Change Language"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 8px 4px 7px',
          background: open ? 'var(--bg-elevated)' : 'var(--bg-surface)',
          border: `1px solid ${open ? 'var(--accent-primary)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.18s ease',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        <Globe size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        {/* Show full name on wider screens, code on narrow */}
        <span className="lang-label-full">{current.native}</span>
        <span className="lang-label-short">{currentCode.toUpperCase()}</span>
        <ChevronDown
          size={11}
          style={{
            color: 'var(--text-muted)',
            transition: 'transform 0.18s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 9999,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.04)',
            padding: '6px',
            minWidth: '200px',
            animation: 'dropdownFadeIn 0.15s ease',
          }}
        >
          <style>{`
            @keyframes dropdownFadeIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            /* Responsive label visibility */
            .lang-label-full { display: inline; }
            .lang-label-short { display: none; }
            @media (max-width: 1200px) {
              .lang-label-full { display: none; }
              .lang-label-short { display: inline; }
            }
            .lang-option-row:hover {
              background: var(--bg-elevated) !important;
            }
          `}</style>

          {/* Header label */}
          <div style={{
            padding: '4px 10px 8px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border)',
            marginBottom: 4,
          }}>
            Interface Language
          </div>

          {LANGUAGES.map(lang => {
            const isActive = lang.code === currentCode;
            return (
              <button
                key={lang.code}
                className="lang-option-row"
                onClick={() => apply(lang.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '8px 10px',
                  background: isActive ? 'var(--bg-elevated)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 400,
                  textAlign: 'left',
                  transition: 'background 0.12s ease',
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{FLAG_EMOJI[lang.code]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{lang.native}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{lang.name}</div>
                </div>
                {isActive && (
                  <Check size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
