import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  CheckCircle,
  Store,
  Upload,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/common/Logo';
import apiClient from '../../api/client';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, registerUser } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form Fields
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Shop / Business profile fields for registration
  const [shopName, setShopName] = useState('');
  const [shopLogo, setShopLogo] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setShopLogo(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setShopLogo('');
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

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
      if (!shopName.trim()) {
        setErrorMsg('Please enter your Business / Shop Name.');
        setIsLoading(false);
        return;
      }
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
          email: `${cleanUsername}@cronus.local`,
          shop_name: shopName.trim(),
          shop_logo: shopLogo || undefined,
        });
        setSuccessMsg(`Account created for ${shopName.trim()}! Opening business setup...`);
        setTimeout(() => {
          navigate('/onboarding');
        }, 500);
      } catch (err: any) {
        setErrorMsg(err.response?.data?.detail || 'Failed to create user account. Please try another username.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login mode
      try {
        await login(cleanUsername, password);
        // Verify if company onboarding is needed
        try {
          const res = await apiClient.get('/companies/current');
          if (!res.data || !res.data.is_onboarding_complete) {
            navigate('/onboarding');
          } else {
            navigate('/dashboard');
          }
        } catch {
          navigate('/onboarding');
        }
      } catch (err: any) {
        setErrorMsg(
          err.response?.data?.detail ||
            'Incorrect username or password. You can create a new username & password below.'
        );
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
    <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center p-4 text-white relative overflow-y-auto">
      {/* Subtle background glow effect */}
      <div className="absolute w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none -top-40 -right-40" />
      <div className="absolute w-[400px] h-[400px] bg-yellow-600/5 rounded-full blur-[120px] pointer-events-none -bottom-20 -left-20" />

      <div className={`w-full ${mode === 'register' ? 'max-w-xl' : 'max-w-md'} bg-[#121217] border border-[#272733] rounded-2xl shadow-2xl p-7 relative z-10 backdrop-blur-md my-8 transition-all`}>
        {/* Brand Header: The Cronus */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Logo variant="icon" size="xl" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide flex items-center justify-center gap-2 font-serif uppercase">
            <span>The Cronus</span>
          </h1>
          <p className="text-[11px] font-bold tracking-widest text-amber-400 uppercase mt-0.5">
            Billing Software
          </p>
          <p className="text-xs text-zinc-400 mt-2 font-medium">
            {mode === 'login'
              ? 'Sign in to access your local billing & inventory'
              : 'Create your account and set up your shop details for customer bills'}
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="grid grid-cols-2 p-1 bg-[#181820] rounded-xl border border-[#272733] mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'login'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold shadow-md'
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
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserPlus size={15} />
            <span>Create Account</span>
          </button>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/50 text-red-300 text-xs text-center font-medium leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs text-center font-medium flex items-center justify-center gap-2">
            <CheckCircle size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              {/* Shop / Business Name */}
              <div className="p-3.5 bg-[#171720] border border-[#2e2e3f] rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Store size={15} />
                  <span>Your Shop & Billing Details</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Shop / Business Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Sri Krishna Stores or Apex Supermarket"
                    className="bg-[#101016] border-[#292936] text-white w-full text-xs"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    This shop name will appear on the top of your printed customer bills & invoices.
                  </p>
                </div>

                {/* Shop Logo Upload */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Shop Logo (For Customer Bills)
                  </label>
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />

                  {shopLogo ? (
                    <div className="flex items-center gap-3 p-2 bg-[#101016] border border-amber-500/30 rounded-lg">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-black/60 border border-zinc-700 p-0.5 flex items-center justify-center flex-shrink-0">
                        <img src={shopLogo} alt="Shop Logo" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle size={13} />
                          <span>Shop Logo Attached</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">
                          Will be printed on receipts instead of software logo
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="px-2 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-600"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded"
                          title="Remove logo"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full py-2.5 px-3 border border-dashed border-[#3a3a4d] hover:border-amber-500/50 bg-[#101016]/80 hover:bg-[#14141c] rounded-lg text-xs text-zinc-300 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Upload size={15} className="text-amber-400" />
                      <span>Upload Shop Logo (Image)</span>
                    </button>
                  )}
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Your shop logo is printed at the top of your bills and POS receipts.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Owner / Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Amuthan Ilavan"
                    className="bg-[#181820] border-[#292936] text-white w-full pr-10 text-xs"
                  />
                  <User size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>
            </>
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
                className="bg-[#181820] border-[#292936] text-white w-full pr-10 text-xs"
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
                className="bg-[#181820] border-[#292936] text-white w-full pr-10 text-xs"
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
                  className="bg-[#181820] border-[#292936] text-white w-full pr-10 text-xs"
                />
                <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-lg w-full mt-3 flex justify-center items-center gap-2 font-bold cursor-pointer bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black border-none"
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" />
                <span>{mode === 'register' ? 'Creating Account...' : 'Signing In...'}</span>
              </>
            ) : (
              <>
                <span>{mode === 'register' ? 'Create Account & Continue' : 'Sign In'}</span>
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
                  className="text-amber-400 font-bold hover:underline"
                >
                  Create one here
                </button>
              </div>

              <button
                type="button"
                onClick={handleFillDemoAdmin}
                className="text-[11px] text-zinc-500 hover:text-amber-400 border border-[#272733] hover:border-amber-500/40 rounded px-2.5 py-1 transition"
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
                className="text-amber-400 font-bold hover:underline"
              >
                Sign In instead
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-[#252530] text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
          <ShieldCheck size={16} className="text-amber-400" />
          <span>Local-First Offline Architecture • High-Speed SQLite Engine</span>
        </div>
      </div>
    </div>
  );
};
