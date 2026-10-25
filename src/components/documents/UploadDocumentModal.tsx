import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useToast } from '../../context/ToastContext';
import { documentService, UploadDocumentPayload } from '../../services/documentService';
import { DocumentCategory, DocumentClassification } from '../../types';
import { UploadCloud, File, X, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'Security Audit', label: 'Security Audit' },
  { value: 'Financial', label: 'Financial' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Legal', label: 'Legal' },
  { value: 'Executive', label: 'Executive' },
  { value: 'Compliance', label: 'Compliance' },
  { value: 'HR Policy', label: 'HR Policy' },
];

const CLASSIFICATIONS: { value: DocumentClassification; label: string }[] = [
  { value: 'Restricted', label: 'Restricted — Highly sensitive, restricted to explicit named grants' },
  { value: 'Confidential', label: 'Confidential — Internal business, sensitive' },
  { value: 'Internal', label: 'Internal — Default organization-wide access' },
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXTENSIONS = ['md', 'txt', 'pdf', 'json', 'csv', 'yaml', 'yml'];

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Security Audit');
  const [classification, setClassification] = useState<DocumentClassification>('Restricted');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  // Validation & progress state
  const [titleError, setTitleError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const resetForm = () => {
    setTitle('');
    setCategory('Security Audit');
    setClassification('Restricted');
    setDescription('');
    setFile(null);
    setFileContent('');
    setTitleError(null);
    setFileError(null);
    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelection = (selectedFile: File) => {
    setFileError(null);

    // Validate size
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setFileError('File size exceeds the 25MB maximum threshold.');
      return;
    }

    // Validate extension
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setFileError(`File type .${ext} is not allowed. Supported: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    setFile(selectedFile);
    if (!title) {
      // Auto-populate title from clean filename
      const cleanTitle = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
    }

    // Read content
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text || '');
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    setTitleError(null);
    setFileError(null);

    if (!title.trim()) {
      setTitleError('Document title is required');
      valid = false;
    }

    if (!file && !fileContent) {
      setFileError('Please select or drag a document file to deposit');
      valid = false;
    }

    if (!valid) return;

    setIsUploading(true);
    setUploadProgress(15);

    // Simulated progress ticks
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 120);

    try {
      const payload: UploadDocumentPayload = {
        title: title.trim(),
        category,
        classification,
        description: description.trim(),
        content: fileContent || `# ${title}\n\nUploaded content placeholder.`,
        fileName: file ? file.name : `${title.toLowerCase().replace(/\s+/g, '_')}.md`,
        fileSizeBytes: file ? file.size : 10240,
      };

      await documentService.uploadDocument(payload);
      clearInterval(interval);
      setUploadProgress(100);

      toast.success('Document Deposited', `"${title}" has been encrypted with envelope keys and added to custody.`);
      resetForm();
      onUploadSuccess();
      onClose();
    } catch (err: unknown) {
      clearInterval(interval);
      const errorObj = err as { message?: string };
      setFileError(errorObj.message || 'Deposit failed due to security validation error.');
      toast.error('Deposit Rejected', errorObj.message || 'Document upload rejected by policy.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isUploading) {
          resetForm();
          onClose();
        }
      }}
      title="Deposit New Document into Vault"
      subtitle="Hardware-isolated envelope encryption will be applied on ingest"
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isUploading}
            leftIcon={<UploadCloud className="w-4 h-4" />}
          >
            Encrypt &amp; Deposit
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dropzone Area */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Document File <span className="text-rose-500">*</span>
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-emerald-500 bg-emerald-50/50'
                : file
                ? 'border-slate-300 bg-slate-50'
                : 'border-slate-300 hover:border-slate-400 bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelection(e.target.files[0]);
                }
              }}
            />

            {file ? (
              <div className="flex items-center justify-between gap-3 text-left p-2 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded text-slate-700">
                    <File className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 truncate max-w-xs">{file.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setFileContent('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-900">
                  Click to browse or drag and drop document file
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: Markdown (.md), PDF, Text (.txt), JSON, CSV. Max 25 MB.
                </p>
              </div>
            )}
          </div>
          {fileError && <p className="text-xs text-rose-600 mt-1.5">{fileError}</p>}
        </div>

        {/* Upload Progress Bar (if uploading) */}
        {isUploading && (
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Applying AES-256-GCM Envelope Encryption...</span>
              <span className="font-mono text-slate-500 tabular-nums">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-200 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Title */}
        <Input
          label="Document Title"
          requiredIndicator
          placeholder="e.g., Q4 Enterprise SOC-2 Compliance Audit"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={titleError || undefined}
        />

        {/* Category & Classification */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            options={CATEGORIES}
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          />

          <Select
            label="Classification Level"
            options={CLASSIFICATIONS}
            value={classification}
            onChange={(e) => setClassification(e.target.value as DocumentClassification)}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Description &amp; Metadata (Optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief scope of document contents and intended recipients..."
            className="w-full rounded-lg border border-slate-300 text-sm py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
          />
        </div>

        {/* Security Notice */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            As the depositing owner, you will hold administrative custody over this document and may grant named access to other users.
          </div>
        </div>
      </form>
    </Modal>
  );
};
