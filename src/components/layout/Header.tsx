import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { LogOut, User as UserIcon, Building2, ShieldCheck } from 'lucide-react';

export const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { user, logout } = useAuth();
  const { company } = useBusiness();

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <Building2 className="text-blue-400" size={20} />
        <span className="font-semibold text-slate-100 text-sm">
          {company?.name || 'SmartBiz AI'}
        </span>
        {company?.gstin && (
          <span className="badge badge-gray text-xs">GST: {company.gstin}</span>
        )}
      </div>

      {title && (
        <div className="ml-6 pl-6 border-l border-slate-700 font-medium text-slate-300 text-sm">
          {title}
        </div>
      )}

      <div className="topbar-spacer" />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
          <ShieldCheck size={16} className="text-emerald-400" />
          <span className="text-xs text-slate-300 font-medium capitalize">{user?.role || 'Staff'}</span>
        </div>

        <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
          <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold text-xs">
            {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
          </div>
          <span className="text-xs text-slate-200">{user?.full_name || user?.username}</span>
        </div>

        <button
          onClick={logout}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
