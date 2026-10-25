import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { auditService, AuditFilterParams } from '../../services/auditService';
import { AuditEvent, AuditAction, AuditResult } from '../../types';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Pagination } from '../common/Pagination';
import { TableSkeleton } from '../common/Skeleton';
import { Modal } from '../common/Modal';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  FileText,
  User,
  Monitor,
  Calendar,
  Lock,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';

const ACTION_OPTIONS: { value: AuditAction | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Security Actions' },
  { value: 'DOCUMENT_VIEW', label: 'DOCUMENT_VIEW — View Decrypted Preview' },
  { value: 'DOCUMENT_DOWNLOAD', label: 'DOCUMENT_DOWNLOAD — Binary File Export' },
  { value: 'DOCUMENT_EDIT', label: 'DOCUMENT_EDIT — Content Modifications' },
  { value: 'DOCUMENT_UPLOAD', label: 'DOCUMENT_UPLOAD — Ingest / Deposit' },
  { value: 'ACCESS_GRANTED', label: 'ACCESS_GRANTED — Named Grant Issued' },
  { value: 'ACCESS_MODIFIED', label: 'ACCESS_MODIFIED — Permission Changed' },
  { value: 'ACCESS_REVOKED', label: 'ACCESS_REVOKED — Immediate Revocation' },
  { value: 'DOCUMENT_DELETED', label: 'DOCUMENT_DELETED — Permanent Expunge' },
  { value: 'ACCESS_DENIED', label: 'ACCESS_DENIED — Unauthorized Access Attempt' },
  { value: 'SUSPICIOUS_ATTEMPT', label: 'SUSPICIOUS_ATTEMPT — Anomaly Flagged' },
  { value: 'USER_LOGIN', label: 'USER_LOGIN — Session Authenticated' },
  { value: 'USER_STATUS_CHANGE', label: 'USER_STATUS_CHANGE — Account Status Changed' },
];

const RESULT_OPTIONS: { value: AuditResult | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Results' },
  { value: 'ALLOWED', label: 'Allowed Operations' },
  { value: 'DENIED', label: 'Denied Security Breaches' },
];

export const AuditLogView: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<AuditAction | 'ALL'>('ALL');
  const [selectedResult, setSelectedResult] = useState<AuditResult | 'ALL'>('ALL');
  const [suspiciousOnly, setSuspiciousOnly] = useState<boolean>(false);

  // Inspector modal for single audit event
  const [inspectedEvent, setInspectedEvent] = useState<AuditEvent | null>(null);

  // Export loading state
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const params: AuditFilterParams = {
      search: search.trim() || undefined,
      action: selectedAction !== 'ALL' ? selectedAction : undefined,
      result: selectedResult !== 'ALL' ? selectedResult : undefined,
      isSuspiciousOnly: suspiciousOnly,
      page: currentPage,
      limit: 12,
    };

    try {
      const res = await auditService.getPlatformAuditLogs(params);
      setEvents(res.events);
      setTotalEvents(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      const msg = errorObj.message || 'Failed to query platform audit records.';
      setErrorMessage(msg);
      toast.error('Audit Query Failed', msg);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedAction, selectedResult, suspiciousOnly, currentPage, toast]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const file = await auditService.exportAuditLogs(format);
      const blob = new Blob([file.data], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Audit Log Exported', `Generated verifiable ${format.toUpperCase()} archive with SHA-256 seal.`);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error('Export Failed', errorObj.message || 'Failed to export audit logs.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Tamper-Evident Verification Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Cryptographic Compliance Ledger</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-medium">SOC-2 Type II Chained</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Verifiable Platform Audit Trail
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
              Every document upload, view, edit, download, access grant, revocation, and denied attempt is recorded immutably. Audit entries cannot be modified or purged by any user.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              disabled={isExporting}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export JSON
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={fetchAuditLogs}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh Trail
            </Button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5">
            <Input
              type="text"
              placeholder="Search by actor, IP address, details, or document title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="sm:col-span-4">
            <Select
              options={ACTION_OPTIONS}
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value as AuditAction | 'ALL');
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              options={RESULT_OPTIONS}
              value={selectedResult}
              onChange={(e) => {
                setSelectedResult(e.target.value as AuditResult | 'ALL');
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Suspicious Only Toggle & Quick Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={suspiciousOnly}
                onChange={(e) => {
                  setSuspiciousOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900"
              />
              <span className="flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Show Suspicious Threat Anomalies Only
              </span>
            </label>
          </div>

          <div className="text-slate-500 tabular-nums font-mono text-[11px]">
            {totalEvents} verifiable records indexed
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Target Document / Object</th>
                <th className="py-3 px-4">Client Telemetry</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <TableSkeleton rows={8} columns={7} />
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No matching audit events</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Clear your search or filters to review the complete chain of custody.
                    </p>
                  </td>
                </tr>
              ) : (
                events.map((e) => {
                  const isDenied = e.result === 'DENIED';
                  const isThreat = e.isSuspicious;

                  return (
                    <tr
                      key={e.id}
                      onClick={() => setInspectedEvent(e)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isThreat ? 'bg-amber-50/30' : isDenied ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                        {formatDate(e.timestamp)}
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">{e.actor.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{e.actor.email}</span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <span className="font-semibold text-slate-800">{e.action}</span>
                      </td>

                      {/* Result */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded border uppercase tracking-wider ${
                            isDenied
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isDenied ? (
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                          ) : (
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          )}
                          {e.result}
                        </span>
                        {isThreat && (
                          <span className="ml-1 text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-semibold">
                            SUSPICIOUS
                          </span>
                        )}
                      </td>

                      {/* Target Document */}
                      <td className="py-3 px-4 max-w-xs">
                        {e.documentTitle ? (
                          <span className="text-slate-800 font-medium truncate block" title={e.documentTitle}>
                            {e.documentTitle}
                          </span>
                        ) : e.documentId ? (
                          <span className="font-mono text-slate-500 text-[11px]">{e.documentId}</span>
                        ) : (
                          <span className="text-slate-400 italic">System Scope</span>
                        )}
                      </td>

                      {/* Client Telemetry */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500 tabular-nums">
                        <div>{e.ipAddress}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{e.userAgent}</div>
                      </td>

                      {/* Details & inspect button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setInspectedEvent(e);
                          }}
                          className="text-slate-600 hover:text-slate-900 font-semibold p-1 rounded hover:bg-slate-100"
                        >
                          Inspect &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalEvents}
          pageSize={12}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {/* Inspect Certificate Modal */}
      {inspectedEvent && (
        <Modal
          isOpen={!!inspectedEvent}
          onClose={() => setInspectedEvent(null)}
          title={`Audit Certificate: ${inspectedEvent.id}`}
          subtitle={`Recorded on ${formatDate(inspectedEvent.timestamp)}`}
          maxWidth="2xl"
          footer={
            <Button variant="secondary" onClick={() => setInspectedEvent(null)}>
              Close Certificate
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>SHA-256 Verifiable Block</span>
                </span>
                <span className="text-slate-400 text-[11px]">{inspectedEvent.result}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-400 block">Actor:</span>
                  {inspectedEvent.actor.name} ({inspectedEvent.actor.email})
                </div>
                <div>
                  <span className="text-slate-400 block">Role:</span>
                  {inspectedEvent.actor.role}
                </div>
                <div>
                  <span className="text-slate-400 block">Action Type:</span>
                  <span className="text-white font-bold">{inspectedEvent.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Client IP Address:</span>
                  {inspectedEvent.ipAddress}
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block">Client User Agent:</span>
                  <span className="break-all">{inspectedEvent.userAgent}</span>
                </div>
                {inspectedEvent.documentTitle && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Document Subject:</span>
                    <span className="text-white">{inspectedEvent.documentTitle}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 block text-[11px]">Event Narrative:</span>
                <p className="text-slate-200 mt-0.5">{inspectedEvent.details}</p>
              </div>

              {inspectedEvent.reason && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-300">
                  <span className="font-bold text-rose-200 block">Security Policy Denial Reason:</span>
                  <p className="mt-0.5">{inspectedEvent.reason}</p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
