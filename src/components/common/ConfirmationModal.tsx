import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  details?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  details,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4 items-start">
        <div
          className={`shrink-0 p-2.5 rounded-lg border ${
            isDestructive
              ? 'bg-rose-50 border-rose-200 text-rose-600'
              : 'bg-amber-50 border-amber-200 text-amber-600'
          }`}
        >
          {isDestructive ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
          {details && (
            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
              {details}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
