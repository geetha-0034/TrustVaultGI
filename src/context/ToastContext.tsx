import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface ToastContextType {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addMessage = useCallback((type: ToastMessage['type'], title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newMsg: ToastMessage = { id, type, title, message, timestamp: Date.now() };

    setMessages((prev) => [...prev, newMsg]);

    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 4500);
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const toast = {
    success: (title: string, message?: string) => addMessage('success', title, message),
    error: (title: string, message?: string) => addMessage('error', title, message),
    warning: (title: string, message?: string) => addMessage('warning', title, message),
    info: (title: string, message?: string) => addMessage('info', title, message),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0"
        role="region"
        aria-live="polite"
        aria-label="Notifications"
      >
        {messages.map((m) => {
          const isError = m.type === 'error';
          const isSuccess = m.type === 'success';
          const isWarning = m.type === 'warning';

          return (
            <div
              key={m.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-sm transition-all duration-200 ${
                isError
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : isSuccess
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : isWarning
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isError && <AlertCircle className="w-5 h-5 text-rose-600" />}
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                {!isError && !isSuccess && !isWarning && <Info className="w-5 h-5 text-slate-600" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{m.title}</p>
                {m.message && <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{m.message}</p>}
              </div>

              <button
                onClick={() => removeMessage(m.id)}
                className="shrink-0 p-1 rounded hover:bg-black/5 text-current transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};
