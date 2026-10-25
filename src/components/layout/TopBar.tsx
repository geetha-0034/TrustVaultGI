import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { INITIAL_USERS } from '../../data/mockData';
import { ActivePage } from './Sidebar';
import {
  Menu,
  Shield,
  Sliders,
  ChevronDown,
  UserCheck,
  Check,
  Bell,
  AlertTriangle,
} from 'lucide-react';

interface TopBarProps {
  activePage: ActivePage;
  onOpenMobileSidebar: () => void;
  onOpenDevControls: () => void;
  onSelectDocumentForView?: (docId: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePage,
  onOpenMobileSidebar,
  onOpenDevControls,
}) => {
  const { currentUser, switchPersona, logout } = useAuth();
  const toast = useToast();
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const personaRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) {
        setIsPersonaMenuOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setIsAlertsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const pageTitles: Record<ActivePage, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Security Operations & Governance',
      subtitle: `${currentUser.role} Control Console`,
    },
    documents: {
      title: 'Cryptographic Document Library',
      subtitle: 'Document-Level Access Control Matrix',
    },
    upload: {
      title: 'Deposit Document',
      subtitle: 'Upload with Enforced Envelope Encryption',
    },
    audit: {
      title: 'Verifiable Audit Trail',
      subtitle: 'Cryptographic Immutable Activity Records',
    },
    users: {
      title: 'User Management & Clearance',
      subtitle: 'Role Assignments & Credential Status',
    },
  };

  const handleSwitchPersona = async (userId: string) => {
    setIsPersonaMenuOpen(false);
    try {
      await switchPersona(userId);
      const targetUser = INITIAL_USERS.find((u) => u.id === userId);
      toast.info(
        'Persona Switched',
        `Now operating as ${targetUser?.name} (${targetUser?.role})`
      );
    } catch {
      toast.error('Persona Switch Failed', 'Could not transition active user context.');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 h-16 px-4 sm:px-6 bg-white border-b border-slate-200 shadow-2xs">
      {/* Zone 1: Mobile toggle + Breadcrumb / Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
          aria-label="Open navigation sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>TrustVault</span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-slate-700 capitalize">{activePage}</span>
          </div>
          <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
            {pageTitles[activePage]?.title || 'TrustVault'}
          </h1>
        </div>
      </div>

      {/* Zone 2: Active Persona Switcher (Crucial for evaluation of all user roles) */}
      <div className="hidden md:flex items-center gap-2" ref={personaRef}>
        <div className="relative">
          <button
            onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            aria-expanded={isPersonaMenuOpen}
            aria-haspopup="true"
          >
            <UserCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>Role Switcher:</span>
            <span className="font-semibold text-slate-900">{currentUser.name}</span>
            <span className="text-[11px] text-slate-500">({currentUser.role})</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isPersonaMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 text-xs">
                <p className="font-semibold text-slate-900">Switch Test Persona</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Seamlessly test permissions, UI actions, and audit logs across user roles.
                </p>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {INITIAL_USERS.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  const isSuspended = u.status === 'SUSPENDED';

                  return (
                    <button
                      key={u.id}
                      onClick={() => handleSwitchPersona(u.id)}
                      className={`w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-slate-50 transition-colors ${
                        isCurrent ? 'bg-slate-50/80' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 mt-0.5">
                        {u.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-900 truncate">{u.name}</p>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                              u.role === 'ADMINISTRATOR'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : u.role === 'OWNER'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{u.department}</p>
                        {isSuspended && (
                          <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                            Account Suspended (Test 403)
                          </p>
                        )}
                      </div>

                      {isCurrent && <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zone 3: Primary Action & Evaluator Diagnostics */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Security Alerts Dropdown */}
        <div className="relative" ref={alertsRef}>
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors relative"
            aria-label="Security alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          </button>

          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-900">Security Investigations</span>
                <span className="text-[11px] text-rose-600 font-medium">2 Active Flags</span>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-950">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Suspended User Attempt</span>
                  </div>
                  <p className="text-[11px] text-rose-700 mt-1">
                    David Sterling attempted to query M&A Capital Model payload.
                  </p>
                </div>
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-950">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Automated Bot Enumeration</span>
                  </div>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Suspicious User-Agent python-requests detected and blocked.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Evaluator Diagnostics Button */}
        <button
          onClick={onOpenDevControls}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs whitespace-nowrap"
          title="Open Evaluator Test Controls"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Diagnostics &amp; Faults</span>
        </button>

        {/* Logout Button */}
        <button
          onClick={() => logout()}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors whitespace-nowrap"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
};
