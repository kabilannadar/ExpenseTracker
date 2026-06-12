import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '../api';
import {
  ClipboardList,
  PlusCircle,
  Edit,
  Trash2,
  DollarSign,
  Landmark,
  PiggyBank,
  Bell,
  Repeat,
  Rss,
  Tag,
  User,
  Coins,
} from 'lucide-react';
import { format } from 'date-fns';

const parseUTC = (str) => {
  if (!str) return new Date();
  const hasTZ = str.endsWith('Z') || str.includes('+') || (str.lastIndexOf('-') > 10);
  return new Date(hasTZ ? str : `${str}Z`);
};

const ICONS = { added: PlusCircle, edited: Edit, deleted: Trash2 };
const COLORS = { added: 'success', edited: 'info', deleted: 'danger' };

const TABS = [
  { id: 'all', label: 'All Activities', types: null },
  { id: 'transactions', label: 'Transactions & Loans', types: ['expense', 'income', 'emi', 'debt'] },
  { id: 'budgets', label: 'Budgets & Goals', types: ['budget', 'goal'] },
  { id: 'schedules', label: 'Schedules & Reminders', types: ['reminder', 'recurring', 'subscription'] },
  { id: 'system', label: 'System Settings', types: ['category', 'user'] },
];

const ENTITY_ICONS = {
  expense: DollarSign,
  income: DollarSign,
  emi: Landmark,
  budget: PiggyBank,
  goal: PiggyBank,
  reminder: Bell,
  recurring: Repeat,
  subscription: Rss,
  category: Tag,
  user: User,
  debt: Coins,
};

const ENTITY_COLORS = {
  expense: '#ef4444',
  income: '#22c55e',
  emi: '#3b82f6',
  budget: '#f59e0b',
  goal: '#10b981',
  reminder: '#8b5cf6',
  recurring: '#ec4899',
  subscription: '#06b6d4',
  category: '#6366f1',
  user: '#a855f7',
  debt: '#f43f5e',
};

export default function AuditLogs() {
  const [activeTab, setActiveTab] = useState('all');
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditLogsApi.getAll(250).then((r) => r.data),
  });

  const tabConfig = TABS.find((t) => t.id === activeTab);
  const filteredLogs = tabConfig?.types
    ? logs.filter((log) => tabConfig.types.includes(log.entity_type))
    : logs;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Track activity and changes across the application</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="audit-tabs-container">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tab.types
            ? logs.filter((log) => tab.types.includes(log.entity_type)).length
            : logs.length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn-secondary"
              style={{
                background: isActive ? 'var(--accent-gradient)' : 'var(--bg-elevated)',
                color: isActive ? 'white' : 'var(--text-secondary)',
                border: isActive ? '1px solid transparent' : '1px solid var(--border)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 13,
                fontWeight: 600,
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
              <span
                style={{
                  marginLeft: 6,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 11,
                  background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-hover)',
                  color: isActive ? 'white' : 'var(--text-muted)',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="card skeleton" style={{ height: 300 }} />
      ) : filteredLogs.length === 0 ? (
        <div className="card empty-state">
          <ClipboardList size={40} />
          <div>No activity in this section yet</div>
        </div>
      ) : (
        <div className="table-wrapper animate-in">
          <table>
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Time</th>
                <th style={{ width: '120px' }}>Action</th>
                <th style={{ width: '160px' }}>Type</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const ActionIcon = ICONS[log.action] || ClipboardList;
                const actionColor = COLORS[log.action];
                const EntityIcon = ENTITY_ICONS[log.entity_type] || ClipboardList;
                const entityColor = ENTITY_COLORS[log.entity_type] || 'var(--text-secondary)';

                return (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {format(parseUTC(log.timestamp), 'dd MMM yyyy, h:mm a')}
                    </td>
                    <td>
                      <span
                        className={`badge badge-${actionColor}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'capitalize' }}
                      >
                        <ActionIcon size={11} />
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: `${entityColor}12`,
                          color: entityColor,
                          border: `1px solid ${entityColor}30`,
                          textTransform: 'capitalize',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 600,
                        }}
                      >
                        <EntityIcon size={12} />
                        {log.entity_type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>
                      {log.detail || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
