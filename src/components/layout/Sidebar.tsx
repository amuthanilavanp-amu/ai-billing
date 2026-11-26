import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  BookOpen,
  FileSpreadsheet,
  Boxes,
  TrendingUp,
  Users,
  Truck,
  DollarSign,
  FileBarChart,
  Bot,
  Settings,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { Logo } from '../common/Logo';

export const Sidebar: React.FC = () => {
  const { company } = useBusiness();

  const navItems = [
    { section: 'MAIN' },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/billing', label: 'Billing / POS', icon: ReceiptText },

    { section: 'CATALOGUE & STOCK' },
    { path: '/products', label: 'Products & Stock', icon: Package },
    { path: '/catalogue', label: 'Starter Catalogue', icon: BookOpen },
    { path: '/bulk-import', label: 'Bulk Import / Export', icon: FileSpreadsheet },
    { path: '/inventory', label: 'Stock Movements', icon: Boxes },

    { section: 'INTELLIGENCE' },
    { path: '/forecasting', label: 'Replenishment AI', icon: TrendingUp },
    { path: '/assistant', label: 'Cronus Assistant', icon: Bot },

    { section: 'OPERATIONS' },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/suppliers', label: 'Suppliers', icon: Truck },
    { path: '/expenses', label: 'Expenses', icon: DollarSign },
    { path: '/reports', label: 'GST & Reports', icon: FileBarChart },

    { section: 'SYSTEM' },
    { path: '/settings', label: 'Settings & Backups', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Logo variant="full" size="md" />
      </div>

      {company?.name && (
        <div className="px-4 py-2.5 bg-black/50 border-b border-zinc-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate pr-1">
            {company.logo_path ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/60 border border-zinc-700/80 flex items-center justify-center p-0.5 flex-shrink-0">
                <img src={company.logo_path} alt={company.name} className="w-full h-full object-contain rounded" />
              </div>
            ) : null}
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate" title={company.name}>{company.name}</div>
              <div className="text-[10px] text-amber-400 capitalize truncate font-medium">
                {company.business_category ? company.business_category.replace(/_/g, ' ') : 'Store'}
              </div>
            </div>
          </div>
          <NavLink
            to="/onboarding"
            className="text-[10px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30 font-semibold transition flex-shrink-0"
            title="Change business category & setup wizard"
          >
            Switch
          </NavLink>
        </div>
      )}

      <nav className="flex-1 py-2">
        {navItems.map((item, index) => {
          if ('section' in item && item.section) {
            return (
              <div key={index} className="sidebar-section-label">
                {item.section}
              </div>
            );
          }

          const Icon = item.icon!;
          return (
            <NavLink
              key={item.path}
              to={item.path!}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3.5 border-t border-zinc-800/80 bg-black/30 text-xs text-zinc-500 flex items-center justify-between">
        <span className="text-[11px] font-mono font-semibold text-zinc-400">The Cronus v1.0.0</span>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>Local Engine</span>
        </div>
      </div>
    </aside>
  );
};
