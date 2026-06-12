import { useQuery } from '@tanstack/react-query';
import { emisApi, remindersApi } from '../api';
import { differenceInDays, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { Bell, CreditCard, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

function getDueLabelEmi(dueDateStr) {
  const today = new Date();
  const due = parseISO(dueDateStr);
  if (isToday(due)) return 'due TODAY';
  if (isTomorrow(due)) return 'due TOMORROW';
  const diff = differenceInDays(due, today);
  return `due in ${diff} days`;
}

function getDueLabelReminder(remindAt) {
  const today = new Date();
  const due = new Date(remindAt);
  if (isPast(due) && !isToday(due)) return 'OVERDUE';
  if (isToday(due)) return 'TODAY';
  if (isTomorrow(due)) return 'TOMORROW';
  const diff = differenceInDays(due, today);
  return `in ${diff} days`;
}

function TickerRow({ items, variant, onDismiss }) {
  const repeated = [...items, ...items, ...items];
  const Icon = variant === 'urgent' ? AlertTriangle : Bell;

  return (
    <div className={`announcement-ticker ticker-${variant}`}>
      <div className="ticker-badge">
        <Icon size={13} />
        <span>{items.length} {variant === 'urgent' ? 'Urgent' : 'Upcoming'}</span>
      </div>

      <div className="ticker-track-wrapper">
        <div className="ticker-track">
          {repeated.map((item, idx) => (
            <span key={`${item.id}-${idx}`} className="ticker-item">
              <item.Icon size={13} className="ticker-item-icon" />
              {item.label}
              <span className="ticker-sep">•</span>
            </span>
          ))}
        </div>
      </div>

      <button
        className="ticker-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function AnnouncementTicker() {
  const [dismissedUrgent, setDismissedUrgent] = useState(false);
  const [dismissedWarning, setDismissedWarning] = useState(false);

  const { data: emis = [] } = useQuery({
    queryKey: ['emis'],
    queryFn: () => emisApi.getAll().then(r => r.data),
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => remindersApi.getAll().then(r => r.data),
  });

  const today = new Date();

  // Classify EMIs
  const urgentEmiItems = [];
  const warningEmiItems = [];

  emis.forEach(emi => {
    if (!emi.payment_due_date) return;
    const due = parseISO(emi.payment_due_date);
    const diff = differenceInDays(due, today);
    if (diff < 0 || diff > 2) return;
    const label = `💳 EMI: ${emi.title} — ₹${Number(emi.emi_amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })} ${getDueLabelEmi(emi.payment_due_date)}`;
    const item = { id: `emi-${emi.id}`, Icon: CreditCard, label };
    if (diff === 0) urgentEmiItems.push(item);
    else warningEmiItems.push(item);
  });

  // Classify Reminders
  const urgentReminderItems = [];
  const warningReminderItems = [];

  reminders.forEach(r => {
    if (!r.remind_at || r.is_done) return;
    const due = new Date(r.remind_at);
    const diff = differenceInDays(due, today);
    if (diff < 0 || diff > 2) return;
    const lbl = getDueLabelReminder(r.remind_at);
    const label = `🔔 ${r.title} — ${lbl}`;
    const item = { id: `rem-${r.id}`, Icon: Bell, label };
    if (diff === 0 || isPast(due)) urgentReminderItems.push(item);
    else warningReminderItems.push(item);
  });

  const urgentItems = [...urgentEmiItems, ...urgentReminderItems];
  const warningItems = [...warningEmiItems, ...warningReminderItems];

  const showUrgent = urgentItems.length > 0 && !dismissedUrgent;
  const showWarning = warningItems.length > 0 && !dismissedWarning;

  if (!showUrgent && !showWarning) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {showUrgent && (
        <TickerRow
          items={urgentItems}
          variant="urgent"
          onDismiss={() => setDismissedUrgent(true)}
        />
      )}
      {showWarning && (
        <TickerRow
          items={warningItems}
          variant="warning"
          onDismiss={() => setDismissedWarning(true)}
        />
      )}
    </div>
  );
}
