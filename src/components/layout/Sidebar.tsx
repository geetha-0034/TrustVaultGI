import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  ShieldCheck,
  Users,
  Lock,
  LogOut,
  X,
  FileCheck2,
} from 'lucide-react';

export type ActivePage = 'dashboard' | 'documents' | 'upload' | 'audit' | 'users';

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenUploadModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  onOpenUploadModal,
}) => {
  const { currentUser, logout } = useAuth();

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'ADMINISTRATOR';
  const isOwner = currentUser.role === 'OWNER';
  const canUpload = isAdmin || isOwner;

  const navItems: { id: ActivePage; label: string; icon: React.ReactNode; requiresAdmin?: boolean }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'documents',
      label: 'Document Library',
      icon: <FileText className="w-4 h-4 shrink-0" />,
    },
    ...(isAdmin
      ? [
          {
            id: 'audit' as ActivePage,
            label: 'Verifiable Audit Trail',
            icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
            requiresAdmin: true,
          },
          {
            id: 'users' as ActivePage,
            label: 'User Management',
            icon: <Users className="w-4 h-4 shrink-0" />,
            requiresAdmin: true,
          },
        ]
      : []),
  ];

  const handleNavClick = (page: ActivePage) => {
    onNavigate(page);
    onCloseMobile();
  };

  const roleDisplay = {
    ADMINISTRATOR: 'Administrator',
    OWNER: 'Document Owner',
    VIEWER: 'Authorized Viewer',
  }[currentUser.role];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Lockup */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-base font-bold text-white tracking-tight whitespace-nowrap">
              TrustVault
            </span>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Identity Kicker */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-semibold text-white shrink-0">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-400 truncate">{roleDisplay}</p>
            </div>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
            Platform Navigation
          </div>

          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Quick Upload CTA (if authorized) */}
          {canUpload && (
            <div className="pt-4 px-1">
              <button
                onClick={() => {
                  onCloseMobile();
                  onOpenUploadModal();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shadow-xs"
              >
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span>Upload Document</span>
              </button>
            </div>
          )}

          {!canUpload && (
            <div className="pt-4 px-3 text-xs text-slate-500 leading-relaxed">
              <span className="block font-semibold text-slate-400">Viewer Clearance</span>
              You have authorized read access to documents explicitly shared with you.
            </div>
          )}
        </div>

        {/* Platform Compliance Status & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">SOC-2 Type II Certified</span>
          </div>

          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>
    </>
  );
};
