import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, KeyRound, ShieldCheck, ArrowRight, UserPlus, LogIn, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/common/Logo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, registerUser, needsSetup } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form Fields
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMsg('Username is required.');
      setIsLoading(false);
      return;
    }

    if (!password) {
      setErrorMsg('Password is required.');
      setIsLoading(false);
      return;
    }

    if (mode === 'register') {
      if (password.length < 4) {
        setErrorMsg('Password must be at least 4 characters long.');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please verify.');
        setIsLoading(false);
        return;
      }

      try {
        await registerUser({
          username: cleanUsername,
          password,
          full_name: fullName.trim() || cleanUsername,
          email: `${cleanUsername}@smartbiz.local`,
        });
        setSuccessMsg(`Account '${cleanUsername}' created successfully! Signing you in...`);
        setTimeout(() => {
          navigate(needsSetup ? '/onboarding' : '/dashboard');
        }, 600);
      } catch (err: any) {
        setErrorMsg(err.response?.data?.detail || 'Failed to create user account. Please try another username.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login mode
      try {
        await login(cleanUsername, password);
        navigate(needsSetup ? '/onboarding' : '/dashboard');
      } catch (err: any) {
        setErrorMsg(err.response?.data?.detail || 'Incorrect username or password. You can create a new username & password below.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFillDemoAdmin = () => {
    setMode('login');
    setUsername('admin');
    setPassword('admin123');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      {/* Subtle background glow effect */}
      <div className="absolute w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none -top-40 -right-40" />
      <div className="absolute w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-[100px] pointer-events-none -bottom-20 -left-20" />

      <div className="w-full max-w-md bg-[#121217] border border-[#272733] rounded-2xl shadow-2xl p-8 relative z-10 backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Logo variant="icon" size="xl" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>SmartBiz</span>
            <span className="text-orange-500 font-extrabold">AI</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            {mode === 'login'
              ? 'Sign in to access your local billing & inventory'
              : 'Create a new username & password to access SmartBiz AI'}
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="grid grid-cols-2 p-1 bg-[#181820] rounded-xl border border-[#272733] mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'login'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
              if (username === 'admin') setUsername('');
              if (password === 'admin123') setPassword('');
            }}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'register'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserPlus size={15} />
            <span>Create Account</span>
          </button>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-950/40 border border-red-500/50 text-red-300 text-xs text-center font-medium leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div className="mb-5 p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs text-center font-medium flex items-center justify-center gap-2">
            <CheckCircle size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Full Name / Owner Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Amuthan Ilavan"
                  className="bg-[#181820] border-[#292936] text-white w-full pr-10"
                />
                <User size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="bg-[#181820] border-[#292936] text-white w-full pr-10"
                autoCapitalize="none"
              />
              <User size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Choose a password (min 4 chars)' : 'Enter password'}
                className="bg-[#181820] border-[#292936] text-white w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="bg-[#181820] border-[#292936] text-white w-full pr-10"
                />
                <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-lg w-full mt-3 flex justify-center items-center gap-2 font-bold cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" />
                <span>{mode === 'register' ? 'Creating Account...' : 'Signing In...'}</span>
              </>
            ) : (
              <>
                <span>{mode === 'register' ? 'Create Account & Sign In' : 'Sign In'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Helper Links & Default Credentials */}
        <div className="mt-5 space-y-3">
          {mode === 'login' ? (
            <div className="flex flex-col items-center gap-2 text-center text-xs text-zinc-400">
              <div>
                Don't have a username yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                    setUsername('');
                    setPassword('');
                  }}
                  className="text-orange-400 font-bold hover:underline"
                >
                  Create one here
                </button>
              </div>

              <button
                type="button"
                onClick={handleFillDemoAdmin}
                className="text-[11px] text-zinc-500 hover:text-orange-400 border border-[#272733] hover:border-orange-500/40 rounded px-2.5 py-1 transition"
              >
                Quick Fill Default Admin (admin / admin123)
              </button>
            </div>
          ) : (
            <div className="text-center text-xs text-zinc-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className="text-orange-400 font-bold hover:underline"
              >
                Sign In instead
              </button>
            </div>
          )}
        </div>

        <div className="mt-7 pt-5 border-t border-[#252530] text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
          <ShieldCheck size={16} className="text-orange-500" />
          <span>Local-First Offline Architecture • High-Speed SQLite Engine</span>
        </div>
      </div>
    </div>
  );
};
