import { useState } from 'react';
import { feedbackApi, getApiError } from '../api';
import toast from 'react-hot-toast';
import { MessageSquare, Send, Star, CheckCircle, Bug, Lightbulb, ShieldAlert, Clock, HelpCircle, Database, Lock } from 'lucide-react';
import './Auth.css'; // Uses general input and button styles

export default function SupportFeedback() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in both the subject and concern message.');
      return;
    }

    setSubmitting(true);
    try {
      await feedbackApi.submit({
        subject: subject.trim(),
        message: message.trim(),
        rating: rating || null,
      });
      toast.success('Your concern has been submitted successfully.');
      setSubmitted(true);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to submit feedback.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubject('');
    setMessage('');
    setRating(0);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '65vh' }}>
        <div className="card text-center" style={{ maxWidth: '520px', padding: '40px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
          <div style={{
            width: '68px', height: '68px', borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.1)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: '24px',
            color: '#10b981', boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
          }}>
            <CheckCircle size={38} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>Feedback Submitted!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>
            Your request has been successfully recorded, and a notification email has been dispatched to the administrator. We appreciate your feedback!
          </p>
          <button onClick={handleReset} className="btn-primary" style={{ padding: '10px 24px' }}>
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Support & Feedback</h1>
          <p className="page-subtitle">Get support, report technical issues, or request new features directly from our administrators.</p>
        </div>
      </div>

      <div className="grid-2" style={{ gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Support Info / Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px'
          }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                How can we help you?
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                We are committed to providing the best personal finance tracking experience. Your reports and feature ideas directly drive our improvements.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--danger)', flexShrink: 0 }}>
                    <Bug size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0' }}>Report Bug</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Found an error or issue? Let us know so we can fix it.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: 'var(--success)', flexShrink: 0 }}>
                    <Lightbulb size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0' }}>Suggest Feature</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Want a new dashboard view or tracking tool? Share your thoughts.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', color: 'var(--accent-primary)', flexShrink: 0 }}>
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0' }}>Account Concerns</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Get help with authentication changes or importing issues.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: '#3b82f6', flexShrink: 0 }}>
                    <HelpCircle size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0' }}>General Inquiries</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Ask questions about subscriptions, interest calculations, or layout metrics.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: 'var(--success)', flexShrink: 0 }}>
                    <Database size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0' }}>Data Export &amp; Backup</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Get help retrieving backup data, CSV templates, or deleting your history.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '8px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '8px', color: '#ec4899', flexShrink: 0 }}>
                    <Lock size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0' }}>Security &amp; Privacy</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Report vulnerabilities, request account deletions, or configure key parameters.</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '32px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <Clock size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Response Time: Concerns are reviewed by admins within 24-48 business hours.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Form */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)'
            }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Send Feedback</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Fill in details to open a ticket/submission.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Subject *</label>
              <input
                type="text"
                placeholder="Brief summary of concern"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Detailed Concern *</label>
              <textarea
                rows={6}
                placeholder="What seems to be the issue? Or how can we make ExpenseTracker better?"
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', resize: 'vertical', minHeight: '120px', outline: 'none' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Rating (Optional)</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                      color: star <= (hoveredRating || rating) ? '#f59e0b' : 'var(--text-muted)',
                      transition: 'color 0.15s ease, transform 0.1s ease',
                      transform: star <= hoveredRating ? 'scale(1.15)' : 'none'
                    }}
                    title={`Rate ${star} Stars`}
                  >
                    <Star size={22} fill={star <= (hoveredRating || rating) ? '#f59e0b' : 'none'} />
                  </button>
                ))}
                {rating > 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '10px', fontWeight: 600 }}>
                    {rating} / 5
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', marginTop: '8px' }}
              disabled={submitting}
            >
              <Send size={15} />
              {submitting ? 'Sending...' : 'Submit Support Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
