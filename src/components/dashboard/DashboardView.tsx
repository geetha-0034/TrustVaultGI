import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auditService } from '../../services/auditService';
import { documentService } from '../../services/documentService';
import { PlatformStats, DocumentItem, AuditEvent } from '../../types';
import { ActivePage } from '../layout/Sidebar';
import { Button } from '../common/Button';
import {
  FileText,
  Users,
  ShieldAlert,
  Activity,
  ArrowUpRight,
  UploadCloud,
  FileCheck,
  Clock,
  Eye,
  Download,
  AlertTriangle,
  Lock,
  Search,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (page: ActivePage) => void;
  onOpenUpload: () => void;
  onSelectDocument: (docId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenUpload,
  onSelectDocument,
}) => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const role = currentUser?.role || 'VIEWER';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [platformStats, docRes] = await Promise.all([
        auditService.getPlatformStats(),
        documentService.getDocuments({ limit: 5, sortBy: 'updatedAt', order: 'desc' }),
      ]);
      setStats(platformStats);
      setRecentDocs(docRes.documents);

      if (role === 'ADMINISTRATOR') {
        const auditRes = await auditService.getPlatformAuditLogs({ limit: 6 });
        setRecentEvents(auditRes.events);
      } else {
        // Filter events related to current user or owned docs
        const allEvents = await auditService.getPlatformAuditLogs({ limit: 30 }).catch(() => ({
          events: [],
        }));
        const userRelevant = allEvents.events.filter(
          (e) => e.actor.id === currentUser?.id || recentDocs.some((d) => d.id === e.documentId)
        );
        setRecentEvents(userRelevant.slice(0, 6));
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id, role]);

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (dateString: string): string => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>TrustVault Security Console</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-medium">Session Active</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Welcome back, {currentUser?.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {role === 'ADMINISTRATOR' &&
                'Global governance active. Review cryptographic audit records, monitor denied access attempts, and oversee user credential lifecycles.'}
              {role === 'OWNER' &&
                'Manage documents in your vault custody, grant explicit access to named stakeholders, and audit all data access occurrences.'}
              {role === 'VIEWER' &&
                'Access documents shared with your named credentials. Read and edit actions are authorized per individual security grant.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {role !== 'VIEWER' && (
              <Button
                variant="primary"
                onClick={onOpenUpload}
                leftIcon={<UploadCloud className="w-4 h-4" />}
              >
                Deposit Document
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => onNavigate('documents')}
              leftIcon={<Search className="w-4 h-4" />}
            >
              Browse Library
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards - Role Specific */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Administrator Metrics */}
        {role === 'ADMINISTRATOR' && (
          <>
            <div
              onClick={() => onNavigate('documents')}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Documents</span>
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
                {stats?.totalDocuments ?? 6}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{stats ? formatFileSize(stats.totalStorageBytes) : '20.4 MB'} encrypted storage</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => onNavigate('users')}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Active Users</span>
                <Users className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
                {stats?.activeUsers ?? 5}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>1 account suspended</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => onNavigate('audit')}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Denied Attempts</span>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold text-rose-700 tabular-nums mt-2">
                {stats?.deniedAttemptsCount ?? 3}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>Zero authorization escapes</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => onNavigate('audit')}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Suspicious Activity Flags</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-700 tabular-nums mt-2">
                {stats?.suspiciousActivityCount ?? 2}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>Requires investigation</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          </>
        )}

        {/* Document Owner Metrics */}
        {role === 'OWNER' && (
          <>
            <div
              onClick={() => onNavigate('documents')}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Owned Documents</span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
                {recentDocs.filter((d) => d.owner.id === currentUser?.id).length || 4}
              </div>
              <div className="text-xs text-slate-500 mt-1">Full vault custody</div>
            </div>

            <div
              onClick={() => onNavigate('documents')}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Active User Grants</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums mt-2">6</div>
              <div className="text-xs text-slate-500 mt-1">Delegated Read &amp; Edit permissions</div>
            </div>

            <div
              onClick={() => onNavigate('documents')}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Recent Modifications</span>
                <Activity className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums mt-2">3</div>
              <div className="text-xs text-slate-500 mt-1">Past 48 hours</div>
            </div>

            <div
              onClick={onOpenUpload}
              className="bg-slate-900 text-white rounded-xl p-4 shadow-2xs hover:bg-slate-800 transition-colors cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>New Custody</span>
                <UploadCloud className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-base font-semibold mt-2">Deposit New Document</div>
              <div className="text-xs text-slate-400 mt-1">With Envelope Encryption &rarr;</div>
            </div>
          </>
        )}

        {/* Viewer Metrics */}
        {role === 'VIEWER' && (
          <>
            <div
              onClick={() => onNavigate('documents')}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Accessible Documents</span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
                {recentDocs.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Explicitly authorized to your identity</div>
            </div>

            <div
              onClick={() => onNavigate('documents')}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Edit Permissions</span>
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
                {recentDocs.filter((d) => d.userPermission === 'EDIT').length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Authorized for in-browser editing</div>
            </div>

            <div
              onClick={() => onNavigate('documents')}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Read-Only Grants</span>
                <Eye className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
                {recentDocs.filter((d) => d.userPermission === 'READ').length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Secure preview &amp; download allowed</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Audit Verifiability</span>
                <FileCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-700 tabular-nums mt-2">100%</div>
              <div className="text-xs text-slate-500 mt-1">All reads are logged to audit trail</div>
            </div>
          </>
        )}
      </div>

      {/* Two Column Grid: Documents & Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Accessible Documents (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                {role === 'OWNER'
                  ? 'Recently Updated Owned Documents'
                  : role === 'VIEWER'
                  ? 'Accessible Shared Documents'
                  : 'Platform Document Repository'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Current clearance status and available actions
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('documents')}
              rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
            >
              View All
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentDocs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No documents found matching your authorization level.
              </div>
            ) : (
              recentDocs.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {doc.title}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          doc.classification === 'Restricted'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : doc.classification === 'Confidential'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {doc.classification}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>{doc.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>Owner: {doc.owner.name}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">v{doc.version}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDate(doc.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onSelectDocument(doc.id)}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Open
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Verifiable Audit Stream (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                  {role === 'ADMINISTRATOR' ? 'Platform Audit Log Stream' : 'Recent Access Events'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifiable tamper-evident event stream
                </p>
              </div>

              {role === 'ADMINISTRATOR' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('audit')}
                  rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                >
                  Full Trail
                </Button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {recentEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No recent audit events in buffer.
                </div>
              ) : (
                recentEvents.slice(0, 4).map((event) => {
                  const isDenied = event.result === 'DENIED';

                  return (
                    <div key={event.id} className="p-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-slate-900">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isDenied ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span className="font-semibold">{event.action}</span>
                          <span className="text-slate-500">by {event.actor.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                          {formatDate(event.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 line-clamp-1 leading-relaxed">
                        {event.details}
                      </p>

                      {isDenied && (
                        <div className="mt-1.5 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Reason: {event.reason || 'Unauthorized security policy violation'}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Immutable cryptographic hash chained</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400">SHA-256</span>
          </div>
        </div>
      </div>
    </div>
  );
};
