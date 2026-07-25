import { useState } from 'react';
import { HelpCircle, Send, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import './HelpSection.css';

const COMMAND_EXAMPLES = [
  { type: 'Expense (Default)', cmd: 'Pizza 150.50 upi for lunch', desc: 'Logs an expense with decimal amount, UPI payment, and note' },
  { type: 'Income', cmd: 'income Salary 50000 bank April salary', desc: 'Logs income source with payment method and note' },
  { type: 'Category', cmd: 'category Medical #ef4444 cross', desc: 'Creates custom category with hex color and icon name' },
  { type: 'Budget', cmd: 'budget Food 5000', desc: 'Sets category monthly limit (or use "budget 25000" for global)' },
  { type: 'Recurring Expense', cmd: 'recurring Rent 15000 monthly bank house rent', desc: 'Adds automated weekly or monthly recurring expense' },
  { type: 'Savings Goal', cmd: 'goal Buy iPhone 120000 upi saving for work', desc: 'Creates a financial goal with target amount' },
  { type: 'Subscription', cmd: 'sub Netflix 649 card monthly plan', desc: 'Tracks monthly software or streaming subscriptions' },
  { type: 'EMI', cmd: 'emi Car Loan 8500.75 netbanking monthly payment', desc: 'Logs loan EMI payment schedule and method' },
  { type: 'Debt', cmd: 'debt John 2000 cash borrowed for trip', desc: 'Logs money borrowed or owed to creditors' },
  { type: 'Reminder', cmd: 'remind Pay Electricity 1450 tomorrow', desc: 'Schedules payment reminder for a specific date' },
];

const FAQ_ITEMS = [
  {
    category: 'ExpenseTracker Bot',
    q: 'How do I connect my Telegram account?',
    a: 'Click "ExpenseTracker Bot" in the sidebar, or send /start to the bot on Telegram and tap the "🔗 Connect Account" button.'
  },
  {
    category: 'ExpenseTracker Bot',
    q: 'What is the syntax for logging entries via Telegram?',
    a: 'Syntax: <type?> <title> <amount> <payment mode?> <note?>. Default type is Expense. Example: "Coffee 80.50 upi team break".'
  },
  {
    category: 'ExpenseTracker Bot',
    q: 'Do I need to type "note:" in my messages?',
    a: 'No! Any text typed after the payment mode (or amount) is automatically saved as your entry note.'
  },
  {
    category: 'ExpenseTracker Bot',
    q: 'Can I type decimal amounts like ₹150.75?',
    a: 'Yes, full decimal precision is supported across all commands! For example, "Dinner 450.25 card" logs ₹450.25 accurately.'
  },
  {
    category: 'ExpenseTracker Bot',
    q: 'How do I reconnect or get my Chat ID if I unlink?',
    a: 'Type /start in your Telegram bot chat anytime to get your Chat ID and reconnect link.'
  },
  {
    category: 'General',
    q: 'How do category & monthly budget alerts work?',
    a: 'Set monthly limits under Budget or via Telegram ("budget Food 5000"). Dashboard indicators highlight progress and warn when approaching limits.'
  },
  {
    category: 'General',
    q: 'How do I export my data to CSV or Excel?',
    a: 'Navigate to Profile → Export Data, choose your date range (Today, This Week, or This Month), and click Export CSV or Export Excel.'
  },
  {
    category: 'Security',
    q: 'Is my financial data safe and private?',
    a: 'Yes! All user sessions use encrypted JWT authentication, password hashes, and user-isolated database records.'
  }
];

export default function HelpSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const [copiedCmd, setCopiedCmd] = useState(null);

  const handleCopy = (cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    toast.success('Copied command!');
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="help-container">
      {/* Telegram Command Cheat Sheet */}
      <div className="card help-card">
        <div className="help-card-header">
          <div>
            <h3 className="help-card-title">
              <Send size={18} className="title-icon" /> ExpenseTracker Bot Quick Reference & Commands
            </h3>
            <p className="help-card-subtitle">
              Syntax: <code>&lt;type?&gt; &lt;title&gt; &lt;amount&gt; &lt;payment_mode?&gt; &lt;note?&gt;</code> (Decimals allowed, no <code>note:</code> prefix required)
            </p>
          </div>
        </div>

        <div className="cmd-examples-grid">
          {COMMAND_EXAMPLES.map((item, idx) => (
            <div key={idx} className="cmd-example-item">
              <div className="cmd-header">
                <span className="cmd-type-badge">{item.type}</span>
                <button
                  type="button"
                  className="btn-copy-sm"
                  onClick={() => handleCopy(item.cmd)}
                  title="Copy Command"
                >
                  {copiedCmd === item.cmd ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                </button>
              </div>
              <code className="cmd-code">{item.cmd}</code>
              <p className="cmd-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="card help-card">
        <div className="help-card-header">
          <h3 className="help-card-title">
            <HelpCircle size={18} className="title-icon" /> Frequently Asked Questions
          </h3>
        </div>

        <div className="faq-list">
          {FAQ_ITEMS.map((faq, idx) => (
            <div
              key={idx}
              className={`faq-accordion-item ${openIndex === idx ? 'open' : ''}`}
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            >
              <div className="faq-question-row">
                <div className="faq-q-left">
                  <span className="faq-cat-tag">{faq.category}</span>
                  <span className="faq-question">{faq.q}</span>
                </div>
                <button className="faq-toggle-btn">
                  {openIndex === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
              {openIndex === idx && (
                <div className="faq-answer-row">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
