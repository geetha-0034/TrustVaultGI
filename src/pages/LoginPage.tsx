import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react';

interface LoginPageProps {
  sessionExpired?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ sessionExpired }) => {
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    sessionExpired ? 'Your session has expired. Please re-authenticate to continue.' : null
  );
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validate = (): boolean => {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);
    setErrorMessage(null);

    if (!email.trim()) {
      setEmailError('Email or enterprise identity is required');
      isValid = false;
    }
    if (!password) {
      setPasswordError('Passphrase is required');
      isValid = false;
    }
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const targetEmail = email.trim();
      const targetPassword = password;
      await login({ email: targetEmail, password: targetPassword });
      toast.success('Access Granted', 'Welcome to TrustVault Platform.');
    } catch (err: unknown) {
      const errorObj = err as { message?: string; status?: number };
      const msg = errorObj.message || 'Authentication failed. Please check your credentials.';
      setErrorMessage(msg);
      toast.error('Authentication Rejected', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Logo Lockup */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 shadow-lg">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">TrustVault Platform</h2>
          <p className="mt-1 text-xs text-slate-400">
            Document-Level Access Control &amp; Verifiable Audit Trail
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Enterprise Identity or Email <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="username"
                  className={`w-full rounded-lg border text-sm py-2 pl-9 pr-3.5 bg-slate-950 text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                    emailError ? 'border-rose-500 text-rose-200' : 'border-slate-700'
                  }`}
                />
              </div>
              {emailError && <p className="text-xs text-rose-400 mt-1">{emailError}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Passphrase <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your passphrase"
                  autoComplete="current-password"
                  className={`w-full rounded-lg border text-sm py-2 pl-9 pr-10 bg-slate-950 text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                    passwordError ? 'border-rose-500 text-rose-200' : 'border-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && <p className="text-xs text-rose-400 mt-1">{passwordError}</p>}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5"
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Sign In / Enter Vault
              </Button>
            </div>
          </form>
        </div>

        {/* Security architecture footer note */}
        <p className="mt-6 text-center text-xs text-slate-500 leading-relaxed">
          TrustVault Enterprise Document Security
          <br />
          All authentication attempts are recorded in the verifiable audit log.
        </p>
      </div>
    </div>
  );
};
