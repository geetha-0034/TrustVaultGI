import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { AccessGrant, DocumentItem, User } from '../../types';
import { accessService } from '../../services/accessService';
import { documentService } from '../../services/documentService';
import { userService } from '../../services/userService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { TableSkeleton } from '../common/Skeleton';
import {
  UserPlus,
  Shield,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Info,
  Lock,
} from 'lucide-react';

interface ManageAccessModalProps {
  documentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAccessChanged: () => void;
}

export const ManageAccessModal: React.FC<ManageAccessModalProps> = ({
  documentId,
  isOpen,
  onClose,
  onAccessChanged,
}) => {
  const toast = useToast();
  const { currentUser } = useAuth();

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New grant form state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newPermission, setNewPermission] = useState<'READ' | 'EDIT'>('READ');
  const [isGranting, setIsGranting] = useState<boolean>(false);

  // Revocation modal state
  const [grantToRevoke, setGrantToRevoke] = useState<AccessGrant | null>(null);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  // Edit permission in-place
  const [updatingGrantId, setUpdatingGrantId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!documentId) return;
    setIsLoading(true);
    try {
      const [doc, docGrants, userList] = await Promise.all([
        documentService.getDocumentById(documentId),
        accessService.getDocumentGrants(documentId),
        userService.getUsers({ limit: 50, status: 'ACTIVE' }),
      ]);
      setDocument(doc);
      setGrants(docGrants);
      setDirectoryUsers(userList.users);
      if (userList.users.length > 0) {
        // Pick first user who doesn't already have a grant and isn't the owner
        const available = userList.users.find(
          (u) => u.id !== doc.owner.id && !docGrants.some((g) => g.userId === u.id)
        );
        if (available) setSelectedUserId(available.id);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error('Failed to Load Grants', errorObj.message || 'Cannot inspect access list.');
    } finally {
      setIsLoading(false);
    }
  }, [documentId, toast]);

  useEffect(() => {
    if (isOpen && documentId) {
      loadData();
    }
  }, [isOpen, documentId, loadData]);

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId || !selectedUserId) return;

    setIsGranting(true);
    try {
      const newGrant = await accessService.grantAccess(
        documentId,
        selectedUserId,
        newPermission
      );
      toast.success(
        'Access Granted',
        `Granted ${newPermission} permission to ${newGrant.user.name}. Audit trail updated.`
      );
      await loadData();
      onAccessChanged();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error('Grant Rejected', errorObj.message || 'Failed to grant access.');
    } finally {
      setIsGranting(false);
    }
  };

  const handleChangePermission = async (grant: AccessGrant, nextPerm: 'READ' | 'EDIT') => {
    if (!documentId || grant.permission === nextPerm) return;
    setUpdatingGrantId(grant.id);
    try {
      await accessService.updateGrant(documentId, grant.id, nextPerm);
      toast.success('Permission Updated', `Modified ${grant.user.name}'s clearance to ${nextPerm}.`);
      await loadData();
      onAccessChanged();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error('Update Failed', errorObj.message || 'Failed to update grant.');
    } finally {
      setUpdatingGrantId(null);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!documentId || !grantToRevoke) return;
    setIsRevoking(true);
    try {
      await accessService.revokeGrant(documentId, grantToRevoke.id);
      toast.success(
        'Access Revoked Immediately',
        `${grantToRevoke.user.name} was revoked. Subsequent attempts by this user to read, edit, or download will be denied.`
      );
      setGrantToRevoke(null);
      await loadData();
      onAccessChanged();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error('Revocation Failed', errorObj.message || 'Failed to revoke grant.');
    } finally {
      setIsRevoking(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  // Filter available users to grant
  const availableUsers = directoryUsers.filter(
    (u) => u.id !== document?.owner.id && !grants.some((g) => g.userId === u.id)
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Named-User Access Grants"
        subtitle={document ? `Document: ${document.title}` : undefined}
        maxWidth="2xl"
        footer={
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Important Security Notice: Immediate Revocation & Local Copy Disclaimer */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Access Control Policy Enforcement</span>
            </div>
            <p className="leading-relaxed">
              Named-user grants are enforced authoritatively by the security gateway. Revoking a user's grant immediately blocks any future requests to view, edit, or download. Note: Previously downloaded offline files cannot be remotely erased.
            </p>
          </div>

          {/* Add New Grant Section */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Grant Document Access to Named User</span>
            </h4>

            {availableUsers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                All eligible directory users already possess active grants or ownership on this document.
              </p>
            ) : (
              <form onSubmit={handleGrantAccess} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6">
                  <Select
                    label="Select Enterprise User"
                    options={availableUsers.map((u) => ({
                      value: u.id,
                      label: `${u.name} (${u.email}) · ${u.department}`,
                    }))}
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-3">
                  <Select
                    label="Permission"
                    options={[
                      { value: 'READ', label: 'Read-Only' },
                      { value: 'EDIT', label: 'Read & Edit' },
                    ]}
                    value={newPermission}
                    onChange={(e) => setNewPermission(e.target.value as 'READ' | 'EDIT')}
                  />
                </div>

                <div className="sm:col-span-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isGranting}
                    className="w-full"
                    disabled={!selectedUserId}
                  >
                    Grant Access
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Current Grants Table */}
          <div>
            <div className="flex items-center justify-between pb-2 text-xs">
              <span className="font-semibold text-slate-900">Active Named-User Grants</span>
              <span className="text-slate-500 tabular-nums">{grants.length} Active</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase">
                    <th className="py-2.5 px-3">Authorized User</th>
                    <th className="py-2.5 px-3">Permission</th>
                    <th className="py-2.5 px-3">Granted By</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Revocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <TableSkeleton rows={3} columns={5} />
                      </td>
                    </tr>
                  ) : grants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No external user grants active. Only the custodian has access.
                      </td>
                    </tr>
                  ) : (
                    grants.map((grant) => (
                      <tr key={grant.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900">{grant.user.name}</p>
                          <p className="text-[11px] text-slate-500">{grant.user.email}</p>
                        </td>

                        <td className="py-3 px-3">
                          <select
                            value={grant.permission}
                            disabled={updatingGrantId === grant.id}
                            onChange={(e) =>
                              handleChangePermission(grant, e.target.value as 'READ' | 'EDIT')
                            }
                            className="rounded border border-slate-300 text-xs py-1 px-2 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                          >
                            <option value="READ">Read</option>
                            <option value="EDIT">Read &amp; Edit</option>
                          </select>
                        </td>

                        <td className="py-3 px-3 text-slate-600">{grant.grantedBy.name}</td>

                        <td className="py-3 px-3 font-mono text-slate-500 tabular-nums">
                          {formatDate(grant.grantedAt)}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setGrantToRevoke(grant)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Revoke access"
                            aria-label={`Revoke access for ${grant.user.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* Revocation Confirmation Dialog */}
      <ConfirmationModal
        isOpen={!!grantToRevoke}
        onClose={() => setGrantToRevoke(null)}
        onConfirm={handleConfirmRevoke}
        title="Revoke Access Immediately?"
        message={`Are you sure you want to revoke ${grantToRevoke?.user.name}'s access to "${document?.title}"?`}
        details="The user will immediately receive 403 Forbidden on any future view, edit, or download requests."
        confirmLabel="Revoke Access"
        isDestructive
        isLoading={isRevoking}
      />
    </>
  );
};
