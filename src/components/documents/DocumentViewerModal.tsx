import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { DocumentItem } from '../../types';
import { documentService } from '../../services/documentService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Skeleton } from '../common/Skeleton';
import {
  Download,
  Edit3,
  UserCheck,
  History,
  Lock,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Calendar,
  CheckCircle,
  Copy,
  Hash,
  Eye,
} from 'lucide-react';

interface DocumentViewerModalProps {
  documentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenEditor: (docId: string) => void;
  onOpenManageAccess: (docId: string) => void;
  onOpenActivity: (docId: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  documentId,
  isOpen,
  onClose,
  onOpenEditor,
  onOpenManageAccess,
  onOpenActivity,
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDenied, setIsDenied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !documentId) {
      setDocument(null);
      setContent('');
      setIsDenied(false);
      setErrorMessage(null);
      return;
    }

    const loadDocumentData = async () => {
      setIsLoading(true);
      setIsDenied(false);
      setErrorMessage(null);

      try {
        const doc = await documentService.getDocumentById(documentId);
        setDocument(doc);
        const preview = await documentService.getDocumentContent(documentId);
        setContent(preview.content);
      } catch (err: unknown) {
        const errorObj = err as { status?: number; message?: string };
        if (errorObj.status === 403) {
          setIsDenied(true);
          setErrorMessage('Access Denied: You do not possess an authorized grant for this document.');
        } else {
          setErrorMessage(errorObj.message || 'Failed to decrypt and render document content.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDocumentData();
  }, [isOpen, documentId]);

  const handleDownload = async () => {
    if (!document) return;
    setIsDownloading(true);
    try {
      const { fileName, url } = await documentService.downloadDocument(document.id);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = fileName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download Complete', `Exported verified copy of "${document.title}".`);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error('Download Forbidden', errorObj.message || 'You lack authorization to download this file.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyChecksum = () => {
    if (document) {
      navigator.clipboard.writeText(document.checksum);
      toast.info('Checksum Copied', 'Cryptographic SHA-256 integrity hash copied to clipboard.');
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  const isOwner = document?.userPermission === 'OWNER';
  const hasEditPermission = isOwner || document?.userPermission === 'EDIT';
  const canManageAccess =
    currentUser?.role === 'ADMINISTRATOR' || (document && document.owner.id === currentUser?.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={document?.title || (isDenied ? 'Security Clearance Denied' : 'Secure Document Viewer')}
      subtitle={
        document
          ? `${document.category} · Classification: ${document.classification} · Version ${document.version}`
          : undefined
      }
      maxWidth="4xl"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {document && (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Integrity Verified ({document.checksum.slice(0, 16)}...)</span>
                <button
                  onClick={handleCopyChecksum}
                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                  title="Copy complete SHA-256 checksum"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>

            {document && (
              <>
                {/* Activity Trail Button */}
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onOpenActivity(document.id);
                  }}
                  leftIcon={<History className="w-4 h-4" />}
                >
                  Activity
                </Button>

                {/* Manage Access Button */}
                {canManageAccess && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onClose();
                      onOpenManageAccess(document.id);
                    }}
                    leftIcon={<UserCheck className="w-4 h-4 text-indigo-600" />}
                  >
                    Manage Access
                  </Button>
                )}

                {/* Edit Button */}
                {hasEditPermission && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onClose();
                      onOpenEditor(document.id);
                    }}
                    leftIcon={<Edit3 className="w-4 h-4" />}
                  >
                    Edit
                  </Button>
                )}

                {/* Download Button */}
                <Button
                  variant="primary"
                  onClick={handleDownload}
                  isLoading={isDownloading}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-4 py-4">
          <Skeleton className="w-3/4 h-6" />
          <Skeleton className="w-1/2 h-4" />
          <div className="space-y-2 pt-4">
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-5/6 h-4" />
            <Skeleton className="w-4/6 h-4" />
          </div>
        </div>
      ) : isDenied ? (
        /* Access Denied State */
        <div className="py-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Access Denied by Security Policy</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Your identity (<span className="font-semibold">{currentUser?.email}</span>) does not possess an active clearance grant for this document.
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 font-mono text-left">
            Event Logged: ACCESS_DENIED
            <br />
            Target Document ID: {documentId}
            <br />
            Enforcement: Zero-Trust Envelope Isolation
          </div>
          <Button variant="secondary" onClick={onClose}>
            Return to Library
          </Button>
        </div>
      ) : errorMessage ? (
        /* Generic Error State */
        <div className="py-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-900">{errorMessage}</p>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Back
          </Button>
        </div>
      ) : document ? (
        /* Populated Document Content & Permitted Metadata */
        <div className="space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block">Custodian / Owner</span>
              <span className="font-semibold text-slate-900">{document.owner.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Your Clearance Level</span>
              <span className="font-semibold text-purple-700">{document.userPermission}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Last Modified</span>
              <span className="font-mono text-slate-800">{formatDate(document.updatedAt)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Classification</span>
              <span
                className={`inline-block font-semibold mt-0.5 px-1.5 py-0.2 rounded border text-[11px] ${
                  document.classification === 'Restricted'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : document.classification === 'Confidential'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {document.classification}
              </span>
            </div>
          </div>

          {/* Description */}
          {document.description && (
            <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
              <span className="font-semibold text-slate-800">Scope Overview: </span>
              {document.description}
            </p>
          )}

          {/* Rendered Preview Area */}
          <div className="border border-slate-200 rounded-xl bg-slate-950 text-slate-100 p-6 font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed select-text">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Decrypted Payload Stream</span>
              </span>
              <span>MIME: {document.mimeType}</span>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-slate-200">{content}</pre>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
