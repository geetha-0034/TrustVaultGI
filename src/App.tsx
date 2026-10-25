import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar, ActivePage } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DevControlsModal } from './components/layout/DevControlsModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { DocumentLibrary } from './components/documents/DocumentLibrary';
import { UploadDocumentModal } from './components/documents/UploadDocumentModal';
import { DocumentViewerModal } from './components/documents/DocumentViewerModal';
import { DocumentEditorModal } from './components/documents/DocumentEditorModal';
import { ManageAccessModal } from './components/documents/ManageAccessModal';
import { DocumentActivityModal } from './components/documents/DocumentActivityModal';
import { AuditLogView } from './components/audit/AuditLogView';
import { UserManagementView } from './components/users/UserManagementView';

const MainLayout: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const toast = useToast();

  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDevControlsOpen, setIsDevControlsOpen] = useState(false);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewerDocId, setViewerDocId] = useState<string | null>(null);
  const [editorDocId, setEditorDocId] = useState<string | null>(null);
  const [manageAccessDocId, setManageAccessDocId] = useState<string | null>(null);
  const [activityDocId, setActivityDocId] = useState<string | null>(null);

  // Key to force refresh of child components on state change
  const [dataVersion, setDataVersion] = useState(0);

  const triggerDataRefresh = () => {
    setDataVersion((v) => v + 1);
  };

  // Enforce role-based access to restricted pages (Audit & Users are Admin-only)
  useEffect(() => {
    if (currentUser) {
      if ((activePage === 'audit' || activePage === 'users') && currentUser.role !== 'ADMINISTRATOR') {
        setActivePage('dashboard');
        toast.warning(
          'Restricted Clearance',
          'Navigated to dashboard. Platform audit logs and user management require Administrator authorization.'
        );
      }
    }
  }, [currentUser?.role, activePage, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">Loading TrustVault Security Console...</p>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <div className="flex-1 flex min-h-0">
        {/* Responsive Sidebar */}
        <Sidebar
          activePage={activePage}
          onNavigate={(page) => setActivePage(page)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenUploadModal={() => setIsUploadOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
          {/* Top Header Bar */}
          <TopBar
            activePage={activePage}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onOpenDevControls={() => setIsDevControlsOpen(true)}
          />

          {/* Primary Viewport Canvas */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {activePage === 'dashboard' && (
              <DashboardView
                key={`dash-${dataVersion}-${currentUser.id}`}
                onNavigate={(page) => setActivePage(page)}
                onOpenUpload={() => setIsUploadOpen(true)}
                onSelectDocument={(docId) => setViewerDocId(docId)}
              />
            )}

            {activePage === 'documents' && (
              <DocumentLibrary
                key={`docs-${dataVersion}-${currentUser.id}`}
                onOpenViewer={(docId) => setViewerDocId(docId)}
                onOpenEditor={(docId) => setEditorDocId(docId)}
                onOpenManageAccess={(docId) => setManageAccessDocId(docId)}
                onOpenActivity={(docId) => setActivityDocId(docId)}
                onOpenUpload={() => setIsUploadOpen(true)}
              />
            )}

            {activePage === 'audit' && currentUser.role === 'ADMINISTRATOR' && (
              <AuditLogView key={`audit-${dataVersion}-${currentUser.id}`} />
            )}

            {activePage === 'users' && currentUser.role === 'ADMINISTRATOR' && (
              <UserManagementView key={`users-${dataVersion}-${currentUser.id}`} />
            )}
          </main>

          {/* Quiet Clean Footer */}
          <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">TrustVault Systems</span>
                <span aria-hidden="true">·</span>
                <span>Document-Level Access Control &amp; Verifiable Audit Trail</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <span>AES-256-GCM Envelope Encryption</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px]">SOC-2 Type II</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Global Modals */}

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => triggerDataRefresh()}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        documentId={viewerDocId}
        isOpen={!!viewerDocId}
        onClose={() => setViewerDocId(null)}
        onOpenEditor={(docId) => setEditorDocId(docId)}
        onOpenManageAccess={(docId) => setManageAccessDocId(docId)}
        onOpenActivity={(docId) => setActivityDocId(docId)}
      />

      {/* Document Editor Modal */}
      <DocumentEditorModal
        documentId={editorDocId}
        isOpen={!!editorDocId}
        onClose={() => setEditorDocId(null)}
        onSaveSuccess={() => triggerDataRefresh()}
      />

      {/* Manage Access Modal */}
      <ManageAccessModal
        documentId={manageAccessDocId}
        isOpen={!!manageAccessDocId}
        onClose={() => setManageAccessDocId(null)}
        onAccessChanged={() => triggerDataRefresh()}
      />

      {/* Document Activity Modal */}
      <DocumentActivityModal
        documentId={activityDocId}
        isOpen={!!activityDocId}
        onClose={() => setActivityDocId(null)}
      />

      {/* Evaluator Test Controls Drawer/Modal */}
      <DevControlsModal
        isOpen={isDevControlsOpen}
        onClose={() => setIsDevControlsOpen(false)}
        onDataReset={() => triggerDataRefresh()}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainLayout />
      </ToastProvider>
    </AuthProvider>
  );
}
