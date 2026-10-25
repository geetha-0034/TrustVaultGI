import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { documentService, DocumentFilterParams } from '../../services/documentService';
import { DocumentItem, DocumentCategory, DocumentClassification } from '../../types';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Pagination } from '../common/Pagination';
import { TableSkeleton } from '../common/Skeleton';
import { ConfirmationModal } from '../common/ConfirmationModal';
import {
  Search,
  Filter,
  Eye,
  Download,
  Edit3,
  UserCheck,
  Trash2,
  History,
  Lock,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface DocumentLibraryProps {
  onOpenViewer: (docId: string) => void;
  onOpenEditor: (docId: string) => void;
  onOpenManageAccess: (docId: string) => void;
  onOpenActivity: (docId: string) => void;
  onOpenUpload: () => void;
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'Security Audit', label: 'Security Audit' },
  { value: 'Financial', label: 'Financial' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Legal', label: 'Legal' },
  { value: 'Executive', label: 'Executive' },
  { value: 'Compliance', label: 'Compliance' },
];

const CLASSIFICATIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All Classifications' },
  { value: 'Restricted', label: 'Restricted' },
  { value: 'Confidential', label: 'Confidential' },
  { value: 'Internal', label: 'Internal' },
];

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  onOpenViewer,
  onOpenEditor,
  onOpenManageAccess,
  onOpenActivity,
  onOpenUpload,
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [totalDocs, setTotalDocs] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL');
  const [scope, setScope] = useState<'all' | 'owned' | 'shared'>('all');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'title' | 'sizeBytes'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Deletion modal state
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const params: DocumentFilterParams = {
      search: search.trim() || undefined,
      category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      classification: selectedClassification !== 'ALL' ? selectedClassification : undefined,
      scope,
      sortBy,
      order: sortOrder,
      page: currentPage,
      limit: 8,
    };

    try {
      const res = await documentService.getDocuments(params);
      setDocuments(res.documents);
      setTotalDocs(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      const msg = errorObj.message || 'Failed to retrieve documents from vault.';
      setErrorMessage(msg);
      toast.error('Library Request Failed', msg);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategory, selectedClassification, scope, sortBy, sortOrder, currentPage, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDownload = async (doc: DocumentItem) => {
    setDownloadingId(doc.id);
    try {
      const { fileName, url } = await documentService.downloadDocument(doc.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download Authorized', `Verified and exported ${doc.title}. Event recorded in audit log.`);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error('Download Forbidden', errorObj.message || 'You lack authorization to download this file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await documentService.deleteDocument(docToDelete.id);
      toast.success('Document Expunged', `${docToDelete.title} was permanently removed from storage.`);
      setDocToDelete(null);
      fetchDocuments();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error('Deletion Rejected', errorObj.message || 'Only owner or administrator may delete.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Search, Filters, Quick Upload */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search by title, owner, or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Scope Segmented Control (All / Owned / Shared) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium shrink-0 self-start lg:self-auto">
            <button
              onClick={() => {
                setScope('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                scope === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Accessible
            </button>
            <button
              onClick={() => {
                setScope('owned');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                scope === 'owned' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Owned by Me
            </button>
            <button
              onClick={() => {
                setScope('shared');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                scope === 'shared' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shared with Me
            </button>
          </div>

          {/* Refresh & Upload Action */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchDocuments}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
            {currentUser?.role !== 'VIEWER' && (
              <Button variant="primary" size="sm" onClick={onOpenUpload}>
                Upload Document
              </Button>
            )}
          </div>
        </div>

        {/* Filter dropdowns and sort bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <Select
            label="Category"
            options={CATEGORIES}
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
          />

          <Select
            label="Classification"
            options={CLASSIFICATIONS}
            value={selectedClassification}
            onChange={(e) => {
              setSelectedClassification(e.target.value);
              setCurrentPage(1);
            }}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Sort Column</label>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'updatedAt' | 'title' | 'sizeBytes')}
                className="w-full rounded-lg border border-slate-300 text-sm py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              >
                <option value="updatedAt">Last Modified</option>
                <option value="title">Document Title</option>
                <option value="sizeBytes">File Size</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold">Unable to Load Documents</h4>
            <p className="text-xs text-rose-800 mt-1">{errorMessage}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchDocuments}>
            Retry Request
          </Button>
        </div>
      )}

      {/* Document Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Custodian / Owner</th>
                <th className="py-3 px-4">Your Grant</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Authorized Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <TableSkeleton rows={6} columns={7} />
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No matching documents found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Adjust your search query or filters, or deposit a new document into custody.
                    </p>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const isOwner = doc.userPermission === 'OWNER';
                  const hasEditPermission = isOwner || doc.userPermission === 'EDIT';
                  const canManageAccess =
                    currentUser?.role === 'ADMINISTRATOR' || doc.owner.id === currentUser?.id;
                  const canDelete = canManageAccess;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Title & Version */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate" title={doc.title}>
                          {doc.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-mono">
                          <span>v{doc.version}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatFileSize(doc.sizeBytes)}</span>
                        </div>
                      </td>

                      {/* Classification Badge (Zero-pill text + hairline border) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            doc.classification === 'Restricted'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : doc.classification === 'Confidential'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {doc.classification}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {doc.category}
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900">{doc.owner.name}</span>
                        {doc.owner.id === currentUser?.id && (
                          <span className="ml-1 text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                            You
                          </span>
                        )}
                      </td>

                      {/* User Permission Clearance */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold ${
                            doc.userPermission === 'OWNER'
                              ? 'text-purple-700'
                              : doc.userPermission === 'EDIT'
                              ? 'text-blue-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {doc.userPermission}
                        </span>
                        {canManageAccess && (
                          <span className="text-[11px] text-slate-400 block tabular-nums">
                            {doc.activeGrantsCount} user {doc.activeGrantsCount === 1 ? 'grant' : 'grants'}
                          </span>
                        )}
                      </td>

                      {/* Last Updated */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono tabular-nums">
                        {formatDate(doc.updatedAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1. Open / View */}
                          <button
                            onClick={() => onOpenViewer(doc.id)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Open and preview document"
                            aria-label={`Open document ${doc.title}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 2. Download */}
                          <button
                            onClick={() => handleDownload(doc)}
                            disabled={downloadingId === doc.id}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
                            title="Authorized document download"
                            aria-label={`Download document ${doc.title}`}
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* 3. Edit (Only when user has Edit or Owner permission) */}
                          {hasEditPermission && (
                            <button
                              onClick={() => onOpenEditor(doc.id)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                              title="Edit in-browser"
                              aria-label={`Edit document ${doc.title}`}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* 4. Manage Access (Only Document Owner or Administrator) */}
                          {canManageAccess && (
                            <button
                              onClick={() => onOpenManageAccess(doc.id)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                              title="Manage named-user access grants"
                              aria-label={`Manage access for ${doc.title}`}
                            >
                              <UserCheck className="w-4 h-4 text-indigo-600" />
                            </button>
                          )}

                          {/* 5. View Activity / Audit */}
                          <button
                            onClick={() => onOpenActivity(doc.id)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="View chronological audit history"
                            aria-label={`View audit activity for ${doc.title}`}
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* 6. Delete (Owner or Administrator only) */}
                          {canDelete && (
                            <button
                              onClick={() => setDocToDelete(doc)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Delete document"
                              aria-label={`Delete document ${doc.title}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
          totalItems={totalDocs}
          pageSize={8}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Permanently Expunge Document?"
        message={`Are you sure you want to permanently delete "${docToDelete?.title}"? All existing named-user grants and cryptographic envelopes will be irreversibly destroyed.`}
        details={docToDelete ? `Document ID: ${docToDelete.id} · Checksum: ${docToDelete.checksum.slice(0, 24)}...` : undefined}
        confirmLabel="Permanently Delete"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
};
