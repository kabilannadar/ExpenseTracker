import { Rocket, Wrench, Sparkles, Shield, Package } from 'lucide-react';

export const BADGE_COLORS = {
  accent: {
    bg: 'rgba(99, 102, 241, 0.15)',
    text: 'var(--accent-primary, #6366f1)',
  },
  success: {
    bg: 'rgba(34, 197, 94, 0.15)',
    text: '#22c55e',
  },
  primary: {
    bg: 'rgba(59, 130, 246, 0.15)',
    text: '#3b82f6',
  },
};

export const TYPE_LABELS = {
  style: 'UI/UX Polish',
  fix: 'Bug Fix',
  feat: 'New Feature',
  chore: 'Maintenance',
};

export const RELEASES = [
  {
    version: 'v2.1.0',
    date: 'July 25, 2026',
    label: 'Feature & UX Polish',
    labelColor: 'success',
    entries: [
      {
        type: 'feat',
        icon: Rocket,
        color: '#3b82f6',
        title: 'Unified Loans & Liabilities Tracker',
        detail: 'Launched a standalone Loans Tracking page featuring aggregate debt counters, a month-by-month Amortization Calculator with printable schedules, a "Save to Track" logging system, and direct manual EMI entry forms in the page header.',
      },
      {
        type: 'feat',
        icon: Rocket,
        color: '#3b82f6',
        title: 'Premium Support & Feedback Portal',
        detail: 'Designed a two-column support center with star rating selectors, live database ticket logging, and SMTP-based automated email dispatch to notification administrators.',
      },
      {
        type: 'style',
        icon: Sparkles,
        color: '#8b5cf6',
        title: 'Navigation & Button Polish',
        detail: 'Repositioned Loans above Debt in the main sidebar for better visual hierarchy and updated secondary Auth action buttons with sleek, solid borders instead of dotted lines.',
      },
      {
        type: 'feat',
        icon: Rocket,
        color: '#3b82f6',
        title: 'Google Sign-In & Registration',
        detail: 'Implemented full Google OAuth2 authentication flow, enabling users to register new accounts and sign in securely with a single click. Integrates seamlessly with local SQLite schemas.',
      }
    ],
  },
  {
    version: 'v2.0.0',
    date: 'July 24, 2026',
    label: 'Major Feature Release',
    labelColor: 'primary',
    entries: [
      {
        type: 'feat',
        icon: Rocket,
        color: '#3b82f6',
        title: 'ExpenseTracker Bot Integration',
        detail: 'Introduced the brand-new ExpenseTracker Bot for Telegram! Link your account to log expenses, track budgets, record income, and configure reminders via real-time messages.',
      },
      {
        type: 'feat',
        icon: Rocket,
        color: '#3b82f6',
        title: 'Bot Setup Guide & Connection Verification',
        detail: 'Created a detailed step-by-step Telegram Setup page containing BotFather configuration guides, Chat ID retrieval, webhook connections, and a quick-reference bot command sheet.',
      },
      {
        type: 'style',
        icon: Sparkles,
        color: '#8b5cf6',
        title: 'Dashboard Companion Bot Promo Banner',
        detail: 'Added a premium, glowing glassmorphic promo banner on the main Dashboard to prioritize Telegram Bot setup. Highlights bot integration for new/unlinked users.',
      },
      {
        type: 'style',
        icon: Sparkles,
        color: '#8b5cf6',
        title: 'Dedicated Help & FAQ Section',
        detail: 'Designed a brand-new Help & FAQ center featuring interactive question accordions, step-by-step guides, support contact forms, and updated bot commands.',
      },
      {
        type: 'style',
        icon: Sparkles,
        color: '#8b5cf6',
        title: 'Unified Sidebar Branding',
        detail: 'Renamed "Telegram Bot" navigation links to "ExpenseTracker Bot" across the app and repositioned it directly above "Audit Logs" to improve visibility and page hierarchy.',
      },
      {
        type: 'chore',
        icon: Package,
        color: '#64748b',
        title: 'Performance & Bundle Size Optimization',
        detail: 'Replaced static pages with React.lazy dynamic chunk loading, reducing the initial bundle size by 62% for significantly faster first page loads.',
      },
      {
        type: 'feat',
        icon: Rocket,
        color: '#3b82f6',
        title: 'Custom Income Categories',
        detail: 'Migrated all legacy hardcoded "cable" source entries to "other". Implemented custom income categories support, allowing you to define, edit, and categorize income sources with custom colors and names.',
      },
      {
        type: 'feat',
        icon: Rocket,
        color: '#3b82f6',
        title: 'Global Header Live Clock Widget',
        detail: 'Moved the date format from the Dashboard subheader to the global desktop navigation bar and added a dynamic, live-ticking clock with tabular digit layouts to prevent screen jitter.',
      }
    ],
  },
  {
    version: 'v1.6.0',
    date: 'June 13, 2026',
    label: 'UI & CDN Update',
    labelColor: 'accent',
    entries: [
      {
        type: 'feat',
        icon: Sparkles,
        color: '#8b5cf6',
        title: 'New standalone Updates page & navigation',
        detail: 'Added a dedicated Updates page accessible via a new Megaphone button in the desktop header and mobile sidebar. This lets you check all historical changes across previous versions at any time.',
      },
      {
        type: 'style',
        icon: Sparkles,
        color: '#8b5cf6',
        title: 'Redesigned Updates dropdown panel UI',
        detail: 'The dropdown updates panel now features a glassmorphism style, animated slide-down entry, per-category color pill badges, and elegant card-based hover design.',
      },
      {
        type: 'style',
        icon: Sparkles,
        color: '#8b5cf6',
        title: 'Polished Dashboard pie chart with gradient slices',
        detail: 'Upgraded the spending distribution pie chart using custom Recharts SVG gradients, smooth hover lift active shapes, and detailed tooltips displaying percentages.',
      },
      {
        type: 'chore',
        icon: Package,
        color: '#64748b',
        title: 'Assets migrated to ImageKit CDN',
        detail: 'Transformed logo assets, banners, avatars, and the favicon to load from ImageKit CDN with auto format/quality parameters for optimal page speeds.',
      }
    ],
  },
  {
    version: 'v1.5.0',
    date: 'June 13, 2026',
    label: 'UI Polish',
    labelColor: 'accent',
    entries: [
      {
        type: 'style',
        icon: Sparkles,
        color: '#8b5cf6',
        title: 'Aligned sidebar, header & footer borders',
        detail: 'The sidebar logo area, top navigation header, and footer now share perfectly matching border lines on desktop — giving the app a clean, unified frame.',
      },
      {
        type: 'style',
        icon: Sparkles,
        color: '#8b5cf6',
        title: 'Added copyright footer',
        detail: 'A subtle footer now appears at the bottom of every page showing "© 2026 ExpenseTracker. All rights reserved." with a link to the creator\'s portfolio.',
      },
      {
        type: 'fix',
        icon: Wrench,
        color: '#22c55e',
        title: 'Fixed date filters on iPhone & Safari',
        detail: 'The "From" and "To" date filter boxes on the Expenses page now show clear labels on iOS Safari, which previously rendered them as blank boxes.',
      },
      {
        type: 'style',
        icon: Sparkles,
        color: '#8b5cf6',
        title: 'Replaced plain pie chart with modern donut chart',
        detail: 'The spending breakdown on the Dashboard now uses an animated, interactive donut chart with hover tooltips and a colour-coded legend.',
      },
      {
        type: 'style',
        icon: Sparkles,
        color: '#8b5cf6',
        title: 'Improved collapsed sidebar layout',
        detail: 'When the sidebar is collapsed, the logo and footer items now center correctly, and the logo scales properly in both open and collapsed states.',
      },
      {
        type: 'style',
        icon: Sparkles,
        color: '#8b5cf6',
        title: 'Light mode logo colours fixed',
        detail: 'Logo assets now automatically invert their colours in light mode so they remain clear and legible across all themes.',
      },
      {
        type: 'style',
        icon: Sparkles,
        color: '#8b5cf6',
        title: 'Responsive Auth layouts finalized',
        detail: 'Adjusted login and registration layouts with centered logo banners outside card modules, reduced vertical gaps, and fixed scroll/alignment bugs.',
      }
    ],
  },
  {
    version: 'v1.4.0',
    date: 'June 12, 2026',
    label: 'Feature Update',
    labelColor: 'primary',
    entries: [
      {
        type: 'feat',
        icon: Rocket,
        color: '#3b82f6',
        title: 'Separate Billing Cycles for Subscriptions',
        detail: 'Subscriptions can now be defined and tracked by billing cycle (daily, weekly, monthly, yearly). Grouped view tab filters allow quick navigation.',
      },
      {
        type: 'feat',
        icon: Package,
        color: '#3b82f6',
        title: 'Database Schema Migration',
        detail: 'Added the billing_cycle column to subscription records on the backend, enabling structured storage of recurring expense frequencies.',
      }
    ],
  },
  {
    version: 'v1.3.0',
    date: 'June 11, 2026',
    label: 'Config Patch',
    labelColor: 'success',
    entries: [
      {
        type: 'fix',
        icon: Shield,
        color: '#22c55e',
        title: 'Render Production URL Integration',
        detail: 'Configured environment settings to connect frontend API client queries directly to the live Render backend deployment.',
      }
    ]
  }
];
