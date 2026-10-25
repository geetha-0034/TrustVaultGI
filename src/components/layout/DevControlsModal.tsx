import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { apiClient } from '../../services/apiClient';
import { localStore } from '../../services/store';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Sliders, RefreshCw, AlertOctagon, Clock, ShieldCheck } from 'lucide-react';

interface DevControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReset?: () => void;
}

export const DevControlsModal: React.FC<DevControlsModalProps> = ({
  isOpen,
  onClose,
  onDataReset,
}) => {
  const toast = useToast();
  const { refreshCurrentUser } = useAuth();
  const [config, setConfig] = useState(apiClient.getConfig());

  useEffect(() => {
    if (isOpen) {
      setConfig(apiClient.getConfig());
    }
  }, [isOpen]);

  const handleToggleLatency = () => {
    const updated = { simulateLatency: !config.simulateLatency };
    apiClient.setConfig(updated);
    setConfig((prev) => ({ ...prev, ...updated }));
    toast.info('Network Latency Updated', updated.simulateLatency ? '180ms network latency simulated' : 'Instant responses enabled');
  };

  const handleToggleErrors = () => {
    const updated = { simulateErrors: !config.simulateErrors };
    apiClient.setConfig(updated);
    setConfig((prev) => ({ ...prev, ...updated }));
    if (updated.simulateErrors) {
      toast.warning('Simulated 500 Errors Active', 'Upcoming API requests will simulate backend server failures');
    } else {
      toast.success('500 Error Simulation Disabled', 'Normal service operation restored');
    }
  };

  const handleTriggerSessionExpired = () => {
    apiClient.setConfig({ simulateSessionExpired: true });
    toast.warning('Session Expiration Armed', 'The next API request will trigger a 401 Session Expired response');
    onClose();
  };

  const handleResetData = () => {
    localStore.resetToDefaults();
    refreshCurrentUser();
    if (onDataReset) onDataReset();
    toast.success('Seed Data Restored', 'All documents, grants, audit records, and users reset to initial seed state.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Evaluator Test Controls & Diagnostics"
      subtitle="Verify failure modes, loading states, session expiration, and test data"
      maxWidth="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed">
          These controls allow reviewers to test required resilient behavior: server errors (500), expired sessions (401), network latency skeletons, and data reset.
        </div>

        {/* Latency Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Simulate Realistic Network Latency</p>
              <p className="text-xs text-slate-500">Adds 180ms delay to exercise loading skeletons & state spinners</p>
            </div>
          </div>
          <button
            onClick={handleToggleLatency}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              config.simulateLatency ? 'bg-slate-900' : 'bg-slate-300'
            }`}
            aria-label="Toggle network latency"
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                config.simulateLatency ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Server Error Simulation */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Simulate Server Fault (HTTP 500)</p>
              <p className="text-xs text-slate-500">Forces next API requests to throw server-side errors</p>
            </div>
          </div>
          <button
            onClick={handleToggleErrors}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              config.simulateErrors ? 'bg-rose-600' : 'bg-slate-300'
            }`}
            aria-label="Toggle error simulation"
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                config.simulateErrors ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Session Expired Trigger */}
        <div className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Trigger Session Expiration (HTTP 401)</p>
              <p className="text-xs text-slate-500">Next request will fail with 401 Session Expired</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleTriggerSessionExpired}>
            Arm 401
          </Button>
        </div>

        {/* Reset Store */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Reset Factory Demo Data</p>
            <p className="text-xs text-slate-500">Restore all initial users, documents, grants, and audit events</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetData}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Reset Data
          </Button>
        </div>
      </div>
    </Modal>
  );
};
