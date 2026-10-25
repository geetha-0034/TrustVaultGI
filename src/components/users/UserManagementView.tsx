import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userService, UserFilterParams } from '../../services/userService';
import { User, UserRole, UserStatus } from '../../types';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Pagination } from '../common/Pagination';
import { TableSkeleton } from '../common/Skeleton';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { Modal } from '../common/Modal';
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  RefreshCw,
  KeyRound,
  FileText,
  Clock,
  AlertTriangle,
} from 'lucide-react';

const ROLE_OPTIONS: { value: UserRole | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'ADMINISTRATOR', label: 'Administrator' },
  { value: 'OWNER', label: 'Document Owner' },
  { value: 'VIEWER', label: 'Authorized Viewer' },
];

const STATUS_OPTIONS: { value: UserStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Account Statuses' },
  { value: 'ACTIVE', label: 'Active Credentials' },
  { value: 'SUSPENDED', label: 'Suspended / Revoked' },
];

export const UserManagementView: React.FC = () => {
  const { currentUser, refreshCurrentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<UserStatus | 'ALL'>('ALL');

  // Deactivate/Activate modal state
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [toggleReason, setToggleReason] = useState<string>('');
  const [isToggling, setIsToggling] = useState<boolean>(false);

  // Role edit modal state
  const [userToEditRole, setUserToEditRole] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('VIEWER');
  const [isChangingRole, setIsChangingRole] = useState<boolean>(false);

  // User detail inspection
  const [inspectedUser, setInspectedUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const params: UserFilterParams = {
      search: search.trim() || undefined,
      role: selectedRole !== 'ALL' ? selectedRole : undefined,
      status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      page: currentPage,
      limit: 10,
    };

    try {
      const res = await userService.getUsers(params);
      setUsers(res.users);
      setTotalUsers(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      const msg = errorObj.message || 'Failed to retrieve directory users.';
      setErrorMessage(msg);
      toast.error('Directory Request Failed', msg);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedRole, selectedStatus, currentPage, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleConfirmToggleStatus = async () => {
    if (!userToToggle) return;
    setIsToggling(true);
    const targetStatus = userToToggle.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    try {
      await userService.updateUserStatus(userToToggle.id, targetStatus, toggleReason.trim());
      toast.success(
        targetStatus === 'ACTIVE' ? 'User Credentials Activated' : 'User Account Suspended',
        `${userToToggle.name}'s account status set to ${targetStatus}. Action logged to audit trail.`
      );
      setUserToToggle(null);
      setToggleReason('');
      fetchUsers();
      refreshCurrentUser();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error('Action Blocked', errorObj.message || 'Failed to update account status.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!userToEditRole) return;
    setIsChangingRole(true);
    try {
      await userService.updateUserRole(userToEditRole.id, newRole);
      toast.success(
        'Role Assignment Updated',
        `Elevated/adjusted ${userToEditRole.name} to ${newRole}. Event recorded in audit trail.`
      );
      setUserToEditRole(null);
      fetchUsers();
      refreshCurrentUser();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error('Role Change Failed', errorObj.message || 'Failed to update role.');
    } finally {
      setIsChangingRole(false);
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
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Identity &amp; Access Governance</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-medium">Administrator Clearance Required</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Enterprise Directory &amp; Roles</h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
              Activate, suspend, or adjust system roles. Suspended accounts are immediately barred from logging in or requesting document payloads.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchUsers}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh Directory
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-6">
            <Input
              type="text"
              placeholder="Search by name, email, or department..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              options={ROLE_OPTIONS}
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value as UserRole | 'ALL');
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              options={STATUS_OPTIONS}
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as UserStatus | 'ALL');
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">User Identity</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Document Clearance</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <TableSkeleton rows={6} columns={7} />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No users found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Adjust your query filters to list directory identities.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isSuspended = u.status === 'SUSPENDED';

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSuspended ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                            {u.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{u.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-slate-600">{u.department}</td>

                      {/* Role */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                            u.role === 'ADMINISTRATOR'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : u.role === 'OWNER'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold text-[11px] px-2 py-0.5 rounded border ${
                            isSuspended
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSuspended ? 'bg-rose-600' : 'bg-emerald-600'
                            }`}
                          />
                          {u.status}
                        </span>
                      </td>

                      {/* Documents Count */}
                      <td className="py-3.5 px-4 whitespace-nowrap tabular-nums text-slate-600">
                        <span>{u.ownedDocumentsCount} owned</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span>{u.accessibleDocumentsCount} accessible</span>
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-500 tabular-nums">
                        {formatDate(u.lastLogin)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role Change Button */}
                          <button
                            onClick={() => {
                              setUserToEditRole(u);
                              setNewRole(u.role);
                            }}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                            title="Manage role assignment"
                            aria-label={`Change role for ${u.name}`}
                          >
                            <KeyRound className="w-4 h-4 text-slate-600" />
                          </button>

                          {/* Toggle Active / Suspended Button */}
                          {!isCurrent ? (
                            <button
                              onClick={() => {
                                setUserToToggle(u);
                                setToggleReason('');
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                isSuspended
                                  ? 'text-emerald-700 hover:bg-emerald-50'
                                  : 'text-rose-600 hover:bg-rose-50'
                              }`}
                              title={isSuspended ? 'Reactivate account' : 'Suspend account'}
                              aria-label={`${isSuspended ? 'Activate' : 'Suspend'} account for ${u.name}`}
                            >
                              {isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-2">Current</span>
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
          totalItems={totalUsers}
          pageSize={10}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {/* Confirmation Modal for Suspend/Activate */}
      <ConfirmationModal
        isOpen={!!userToToggle}
        onClose={() => {
          setUserToToggle(null);
          setToggleReason('');
        }}
        onConfirm={handleConfirmToggleStatus}
        title={
          userToToggle?.status === 'ACTIVE'
            ? `Suspend Account for ${userToToggle?.name}?`
            : `Reactivate Account for ${userToToggle?.name}?`
        }
        message={
          userToToggle?.status === 'ACTIVE'
            ? 'Suspending this user will immediately invalidate their active cryptographic session. All subsequent requests to read, edit, or download will be denied.'
            : 'Reactivating this user will restore their authorization grants and allow them to authenticate.'
        }
        details={userToToggle ? `Identity: ${userToToggle.email} · Department: ${userToToggle.department}` : undefined}
        confirmLabel={userToToggle?.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
        isDestructive={userToToggle?.status === 'ACTIVE'}
        isLoading={isToggling}
      />

      {/* Role Management Dialog */}
      {userToEditRole && (
        <Modal
          isOpen={!!userToEditRole}
          onClose={() => setUserToEditRole(null)}
          title={`Adjust Role for ${userToEditRole.name}`}
          subtitle={`Current Role: ${userToEditRole.role} · Email: ${userToEditRole.email}`}
          maxWidth="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setUserToEditRole(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmRoleChange}
                isLoading={isChangingRole}
              >
                Apply Role Change
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Select
              label="Select New System Role"
              options={[
                { value: 'VIEWER', label: 'VIEWER — Can only access explicitly shared documents' },
                { value: 'OWNER', label: 'OWNER — Can deposit, manage custody, and grant access' },
                { value: 'ADMINISTRATOR', label: 'ADMINISTRATOR — Global governance and audit inspection' },
              ]}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
            />

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
              Role modifications take effect immediately and are permanently recorded in the verifiable audit trail.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
