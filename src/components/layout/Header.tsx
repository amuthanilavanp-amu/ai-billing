import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { LogOut, Store, ShieldCheck } from 'lucide-react';

export const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { user, logout } = useAuth();
  const { company } = useBusiness();

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
          <Store size={18} />
        </div>
        <div>
          <span className="font-bold text-white text-sm tracking-tight">
            {company?.name || 'SmartBiz AI'}
          </span>
          {company?.gstin && (
            <span className="badge badge-gray text-[10px] ml-2">GST: {company.gstin}</span>
          )}
        </div>
      </div>

      {title && (
        <div className="ml-6 pl-6 border-l border-zinc-800 font-semibold text-white text-sm">
          {title}
        </div>
      )}

      <div className="topbar-spacer" />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-zinc-900/90 px-3 py-1.5 rounded-lg border border-zinc-800">
          <ShieldCheck size={15} className="text-orange-400" />
          <span className="text-xs text-zinc-300 font-semibold capitalize">{user?.role || 'Admin'}</span>
        </div>

        <div className="flex items-center gap-2.5 text-zinc-300 text-sm font-medium">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 border border-orange-400/40 flex items-center justify-center text-white font-extrabold text-xs shadow-sm shadow-orange-500/20">
            {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
          </div>
          <span className="text-xs text-white font-semibold">{user?.full_name || user?.username}</span>
        </div>

        <button
          onClick={logout}
          className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-400 transition"
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
