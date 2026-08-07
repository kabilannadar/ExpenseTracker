import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { telegramApi, getApiError } from '../api';
import toast from 'react-hot-toast';
import {
  Send, Link, Unlink, CheckCircle2, XCircle,
  ExternalLink, Copy, ChevronRight, Smartphone, Zap, Shield, KeyRound, Loader2
} from 'lucide-react';

/* ─── Inline styles ────────────────────────────────────────────────────────── */

const styles = {
  hero: {
    background: 'linear-gradient(135deg, #0088cc 0%, #2497d4 60%, #34a8e4 100%)',
    borderRadius: 'var(--radius)',
    padding: '32px 28px',
    color: '#fff',
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBubble: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    pointerEvents: 'none',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 14,
    color: '#fff',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
    lineHeight: 1.2,
  },
  heroSub: {
    fontSize: 14,
    opacity: 0.88,
    marginTop: 8,
    marginBottom: 0,
  },
  statusCardTelegram: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 20px',
    background: active
      ? 'linear-gradient(135deg, rgba(0,136,204,0.12) 0%, rgba(36,151,212,0.08) 100%)'
      : 'var(--bg-elevated)',
    border: `1.5px solid ${active ? '#0088cc40' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)',
    marginBottom: 20,
  }),
  statusDot: (active, color) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: active ? color : 'var(--text-muted)',
    boxShadow: active ? `0 0 0 3px ${color}40` : 'none',
    flexShrink: 0,
    animation: active ? 'pulse-anim 2s infinite' : 'none',
  }),
  featureRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 24,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 14px',
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius-sm)',
  },
  featureIcon: (color) => ({
    width: 32,
    height: 32,
    borderRadius: 8,
    background: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  exampleBubble: {
    background: '#e1f3fc',
    color: '#0f3244',
    borderRadius: '16px 16px 4px 16px',
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 500,
    display: 'inline-block',
    marginBottom: 6,
    maxWidth: '90%',
  },
  replyBubble: {
    background: '#fff',
    color: '#1a1a1a',
    border: '1px solid #e0e0e0',
    borderRadius: '16px 16px 16px 4px',
    padding: '10px 14px',
    fontSize: 13,
    display: 'inline-block',
    maxWidth: '90%',
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '14px 0',
    borderBottom: '1px solid var(--border)',
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #0088cc, #2497d4)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
};

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function TelegramSetup() {
  const qc = useQueryClient();
  const [telegramChatId, setTelegramChatId] = useState('');

  // ── Telegram Queries & Mutations ──────────────────────────────────────────
  const { data: tgStatusData, isLoading: tgStatusLoading } = useQuery({
    queryKey: ['telegram-status'],
    queryFn: () => telegramApi.getStatus().then(r => r.data),
  });

  const tgLinked = tgStatusData?.linked || false;
  const tgChatId = tgStatusData?.telegram_chat_id;
  const tgBotUsername = tgStatusData?.bot_username || 'expensetrackertnbot';

  useEffect(() => {
    if (tgChatId) setTelegramChatId(tgChatId);
  }, [tgChatId]);

  const tgLinkMut = useMutation({
    mutationFn: (id) => telegramApi.link(id || telegramChatId),
    onSuccess: () => {
      toast.success('Telegram bot linked successfully!');
      qc.invalidateQueries({ queryKey: ['telegram-status'] });
      sessionStorage.removeItem('pending_telegram_chat_id');
      window.history.replaceState({}, document.title, window.location.pathname);
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  // Auto-link if chat_id parameter is present in URL or sessionStorage
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const urlChatId = queryParams.get('chat_id') || sessionStorage.getItem('pending_telegram_chat_id');

    if (urlChatId && !tgStatusLoading && !tgLinked && !tgLinkMut.isPending && !tgLinkMut.isSuccess) {
      setTelegramChatId(urlChatId);
      tgLinkMut.mutate(urlChatId);
    }
  }, [tgStatusLoading, tgLinked]);

  const tgUnlinkMut = useMutation({
    mutationFn: () => telegramApi.unlink(),
    onSuccess: () => {
      toast.success('Telegram bot unlinked.');
      setTelegramChatId('');
      qc.invalidateQueries({ queryKey: ['telegram-status'] });
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">ExpenseTracker Bot</h1>
          <p className="page-subtitle">Log expenses easily using Telegram</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left column — Connection Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Hero Card */}
          <div style={styles.hero}>
            <div style={{ ...styles.heroBubble, width: 120, height: 120, top: -30, right: -30 }} />
            <div style={{ ...styles.heroBubble, width: 60, height: 60, bottom: 10, right: 80 }} />
            <div style={{ ...styles.heroBubble, width: 40, height: 40, top: 20, left: '40%' }} />

            <div style={styles.badge}>
              <Send size={12} /> Chat Sync
            </div>
            <h2 style={styles.heroTitle}>Text to Track</h2>
            <p style={styles.heroSub}>
              Link your Telegram account to log expenses on the go. Simply message the bot in plain text and watch your ledger update in real-time.
            </p>
          </div>

          {/* Status & Form Card */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)' }}>
              Bot Connection Status
            </h3>

            {tgStatusLoading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>Checking status…</div>
            ) : (
              <div style={styles.statusCardTelegram(tgLinked)}>
                <div style={styles.statusDot(tgLinked, '#0088cc')} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {tgLinked ? 'Connected' : 'Disconnected'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {tgLinked ? `Linked Chat ID: ${tgChatId}` : 'Link your Telegram account below'}
                  </div>
                </div>
                {tgLinked ? (
                  <CheckCircle2 size={20} color="#0088cc" />
                ) : (
                  <XCircle size={20} color="var(--text-muted)" />
                )}
              </div>
            )}

            {/* Linking input */}
            {!tgLinked ? (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Telegram Chat ID</label>
                <div style={{ position: 'relative' }}>
                  <Smartphone
                    size={15}
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    id="telegram-chat-id-input"
                    type="text"
                    placeholder="e.g. 182736495"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    style={{ paddingLeft: 36 }}
                  />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                  Message our bot to get your Chat ID instantly.
                </p>
              </div>
            ) : null}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              {!tgLinked ? (
                <button
                  id="telegram-link-btn"
                  className="btn-primary"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #0088cc, #2497d4)',
                  }}
                  disabled={!telegramChatId.trim() || tgLinkMut.isPending}
                  onClick={() => tgLinkMut.mutate()}
                >
                  {tgLinkMut.isPending ? (
                    <>
                      <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      Linking...
                    </>
                  ) : (
                    <>
                      <Link size={15} />
                      Link Telegram Account
                    </>
                  )}
                </button>
              ) : (
                <button
                  id="telegram-unlink-btn"
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', borderColor: '#ef4444', color: '#ef4444' }}
                  disabled={tgUnlinkMut.isPending}
                  onClick={() => tgUnlinkMut.mutate()}
                >
                  {tgUnlinkMut.isPending ? (
                    <>
                      <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      Unlinking...
                    </>
                  ) : (
                    <>
                      <Unlink size={15} />
                      Unlink ExpenseTracker Bot
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Bot Link Card */}
          <div className="card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)', alignSelf: 'flex-start' }}>
              Bot Profile
            </h3>
            {!tgLinked && (
              <img
                src="/telegram-qr.png"
                alt="Telegram Bot QR Code"
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  marginBottom: 16
                }}
              />
            )}
            <a
              id="telegram-open-btn"
              href={`https://t.me/${tgBotUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #0088cc, #2497d4)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 500,
                width: '100%',
                boxShadow: '0 4px 14px rgba(0, 136, 204, 0.3)',
                transition: 'var(--transition)',
              }}
            >
              <ExternalLink size={14} /> Open Bot in Telegram
            </a>
          </div>
        </div>

        {/* Right column — How it works & examples */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Features */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)' }}>
              Why use our bot?
            </h3>
            <div style={styles.featureRow}>
              <div style={styles.featureItem}>
                <div style={styles.featureIcon('rgba(0,136,204,0.15)')}>
                  <Zap size={16} color="#0088cc" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Always Active</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    The bot is online 24/7. Log expenses instantly, anywhere in the world.
                  </div>
                </div>
              </div>
              <div style={styles.featureItem}>
                <div style={styles.featureIcon('rgba(99,102,241,0.15)')}>
                  <Shield size={16} color="#6366f1" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Secure Ledger</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Uses secure, official Telegram authentication. Your financial data stays private and mapped only to you.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat preview */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)' }}>
              Example Chat
            </h3>
            <div style={{
              background: '#e6f2f7',
              borderRadius: 'var(--radius-sm)',
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {/* Example 1 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={styles.exampleBubble}>Lunch 450 card</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={styles.replyBubble}>
                  ✅ <strong>Expense Added!</strong><br />
                  📝 Lunch — ₹450<br />
                  📅 Today &nbsp; 💳 CARD
                </div>
              </div>

              {/* Example 2 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <div style={styles.exampleBubble}>Spent 1200 groceries yesterday</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={styles.replyBubble}>
                  ✅ <strong>Expense Added!</strong><br />
                  📝 Groceries — ₹1,200<br />
                  📅 Yesterday &nbsp; 💳 CASH<br />
                  🏷️ Groceries
                </div>
              </div>
            </div>
          </div>

          {/* Setup steps */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>
              How to set up
            </h3>
            {[
              { num: 1, title: 'Open ExpenseTracker Bot', desc: `Search for @${tgBotUsername} on Telegram and tap Start.` },
              { num: 2, title: 'Get Chat ID', desc: 'Message the bot /start to receive your secure numeric Chat ID.' },
              { num: 3, title: 'Link Account', desc: 'Type that Chat ID into the panel on the left and click Link.' },
              { num: 4, title: 'Start Tracking!', desc: 'Send expense texts directly to the bot and watch them log!' },
            ].map(s => (
              <div key={s.num} style={{ ...styles.step, borderBottom: s.num === 4 ? 'none' : '1px solid var(--border)' }}>
                <div style={styles.stepNum}>{s.num}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{s.desc}</div>
                </div>
                {s.num < 4 && <ChevronRight size={14} style={{ color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-anim {
          0%, 100% { box-shadow: 0 0 0 3px rgba(0,136,204,0.25); }
          50% { box-shadow: 0 0 0 6px rgba(0,136,204,0.1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
