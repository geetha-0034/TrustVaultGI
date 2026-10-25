import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AuditEvent, DocumentItem } from '../../types';
import { auditService } from '../../services/auditService';
import { documentService } from '../../services/documentService';
import { TableSkeleton } from '../common/Skeleton';
import {
  History,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
  Monitor,
  AlertTriangle,
  FileText,
} from 'lucide-react';

interface DocumentActivityModalProps {
  documentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentActivityModal: React.FC<DocumentActivityModalProps> = ({
  documentId,
  isOpen,
  onClose,
}) => {
  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  useEffect(() => {
    if (!isOpen || !documentId) {
      setEvents([]);
      setDocument(null);
      setSelectedEvent(null);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [doc, auditEvents] = await Promise.all([
          documentService.getDocumentById(documentId),
          auditService.getDocumentAuditLogs(documentId),
        ]);
        setDocument(doc);
        setEvents(auditEvents);
      } catch {
        // Handle error
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, documentId]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Document Audit Trail & Access History"
      subtitle={document ? `${document.title} · ${events.length} Historical Records` : undefined}
      maxWidth="4xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Tamper Evident Banner */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cryptographic Chain: All reads, edits, downloads, and grants are immutably logged.</span>
          </div>
          <span className="font-mono text-slate-400 text-[11px]">Audit Mode: Authoritative</span>
        </div>

        {/* Audit List Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Result</th>
                <th className="py-2.5 px-3">Details &amp; Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-0">
                    <TableSkeleton rows={4} columns={5} />
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No activity recorded for this document yet.
                  </td>
                </tr>
              ) : (
                events.map((e) => {
                  const isDenied = e.result === 'DENIED';

                  return (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedEvent(e)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        selectedEvent?.id === e.id ? 'bg-slate-50' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                        {formatDate(e.timestamp)}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">{e.actor.name}</span>
                        <span className="text-[11px] text-slate-500">{e.actor.role}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {e.action}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded border ${
                            isDenied
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isDenied ? (
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                          ) : (
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          )}
                          {e.result}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <p className="text-slate-700 line-clamp-1">{e.details}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>IP: {e.ipAddress}</span>
                          {e.reason && <span className="text-rose-600">· {e.reason}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Event Detail Drawer/Card */}
        {selectedEvent && (
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-emerald-400 font-bold">Event Audit Certificate: {selectedEvent.id}</span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                Close Certificate
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div>Actor: {selectedEvent.actor.name} ({selectedEvent.actor.email})</div>
              <div>Role: {selectedEvent.actor.role}</div>
              <div>Timestamp: {selectedEvent.timestamp}</div>
              <div>Result: {selectedEvent.result}</div>
              <div>Client IP: {selectedEvent.ipAddress}</div>
              <div className="truncate">User-Agent: {selectedEvent.userAgent}</div>
            </div>
            <p className="text-slate-200 pt-1 border-t border-slate-800">{selectedEvent.details}</p>
            {selectedEvent.reason && (
              <p className="text-rose-400 font-semibold">Violation Reason: {selectedEvent.reason}</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
