import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, KeyRound, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/common/Logo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, registerFirstAdmin, needsSetup } = useAuth();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [fullName, setFullName] = useState('Store Administrator');
  const [email, setEmail] = useState('admin@smartbiz.local');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (needsSetup) {
        await registerFirstAdmin({
          username,
          password,
          full_name: fullName,
          email,
        });
        navigate('/onboarding');
      } else {
        await login(username, password);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      {/* Subtle background glow effect */}
      <div className="absolute w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none -top-40 -right-40" />
      <div className="absolute w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-[100px] pointer-events-none -bottom-20 -left-20" />

      <div className="w-full max-w-md bg-[#121217] border border-[#272733] rounded-2xl shadow-2xl p-8 relative z-10 backdrop-blur-md">
        <div className="text-center mb-7">
          <div className="flex justify-center mb-4">
            <Logo variant="icon" size="xl" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>SmartBiz</span>
            <span className="text-orange-500 font-extrabold">AI</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1.5 font-medium">
            {needsSetup
              ? 'First-Time Setup: Create Primary Administrator Account'
              : 'Sign in to access your local billing & inventory'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-950/30 border border-red-500/40 text-red-300 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {needsSetup && (
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Full Legal Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="bg-[#181820] border-[#292936]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="bg-[#181820] border-[#292936]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="bg-[#181820] border-[#292936]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-lg w-full mt-3 flex justify-center items-center gap-2 font-bold"
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" />
                <span>{needsSetup ? 'Initializing Account...' : 'Signing In...'}</span>
              </>
            ) : (
              <>
                <span>{needsSetup ? 'Create Account & Begin Onboarding' : 'Sign In'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-7 pt-5 border-t border-[#252530] text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
          <ShieldCheck size={16} className="text-orange-500" />
          <span>Local-First Offline Architecture • High-Speed SQLite Engine</span>
        </div>
      </div>
    </div>
  );
};
