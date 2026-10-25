import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { DocumentItem } from '../../types';
import { documentService } from '../../services/documentService';
import { useToast } from '../../context/ToastContext';
import { Skeleton } from '../common/Skeleton';
import {
  Save,
  X,
  AlertTriangle,
  History,
  CheckCircle2,
  FileEdit,
  Lock,
} from 'lucide-react';

interface DocumentEditorModalProps {
  documentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export const DocumentEditorModal: React.FC<DocumentEditorModalProps> = ({
  documentId,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const toast = useToast();

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [content, setContent] = useState<string>('');
  const [initialContent, setInitialContent] = useState<string>('');
  const [changeSummary, setChangeSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Unsaved changes confirmation dialog
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !documentId) {
      setDocument(null);
      setContent('');
      setInitialContent('');
      setChangeSummary('');
      setErrorMessage(null);
      return;
    }

    const loadDoc = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const doc = await documentService.getDocumentById(documentId);
        setDocument(doc);
        const data = await documentService.getDocumentContent(documentId);
        setContent(data.content);
        setInitialContent(data.content);
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        setErrorMessage(errorObj.message || 'Failed to load document for editing.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDoc();
  }, [isOpen, documentId]);

  const hasUnsavedChanges = content !== initialContent;

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    if (!document) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updated = await documentService.updateDocumentContent(
        document.id,
        content,
        changeSummary.trim() || undefined
      );
      setDocument(updated);
      setInitialContent(content);
      toast.success(
        'Changes Saved Securely',
        `Version bumped to v${updated.version}. Timestamp: ${new Date(updated.updatedAt).toLocaleTimeString()}`
      );
      onSaveSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string; status?: number };
      const msg = errorObj.message || 'Failed to commit edits to vault.';
      setErrorMessage(msg);
      toast.error('Save Rejected', msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title={document ? `Editing: ${document.title}` : 'Document Editor'}
        subtitle={
          document
            ? `Current version: v${document.version} · Permission: ${document.userPermission}`
            : undefined
        }
        maxWidth="4xl"
        footer={
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              {hasUnsavedChanges ? (
                <span className="text-amber-600 flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes pending
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  All changes synced
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleRequestClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={!hasUnsavedChanges}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </div>
        }
      >
        {isLoading ? (
          <div className="space-y-4 py-6">
            <Skeleton className="w-full h-8" />
            <Skeleton className="w-full h-64" />
          </div>
        ) : errorMessage ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Permission Denied or Error</span>
            </div>
            <p className="text-xs text-rose-800">{errorMessage}</p>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Dismiss
            </Button>
          </div>
        ) : document ? (
          <div className="space-y-4">
            {/* Change summary note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Revision Note (Optional)
              </label>
              <input
                type="text"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="e.g., Updated mitigation dates for SOC-2 remediation roadmap"
                className="w-full rounded-lg border border-slate-300 text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white"
              />
            </div>

            {/* Code / Markdown Content Textarea */}
            <div>
              <div className="flex items-center justify-between pb-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Document Source Editor</span>
                <span className="font-mono text-[11px] tabular-nums">
                  {content.length} characters · {content.split('\n').length} lines
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                className="w-full rounded-xl border border-slate-300 p-4 font-mono text-xs text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors leading-relaxed"
                placeholder="Document content..."
              />
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Unsaved Changes Confirmation Modal */}
      <ConfirmationModal
        isOpen={showUnsavedPrompt}
        onClose={() => setShowUnsavedPrompt(false)}
        onConfirm={() => {
          setShowUnsavedPrompt(false);
          onClose();
        }}
        title="Discard Unsaved Changes?"
        message="You have unsaved edits in this document. If you navigate away now, your edits will not be committed to the vault."
        confirmLabel="Discard & Exit"
        cancelLabel="Continue Editing"
        isDestructive
      />
    </>
  );
};
