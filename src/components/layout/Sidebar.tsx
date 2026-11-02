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
    { path: '/assistant', label: 'SmartBiz Assistant', icon: Bot },

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
        <div className="sidebar-logo-icon">SB</div>
        <div>
          <div className="sidebar-logo-text">SmartBiz AI</div>
          <div className="sidebar-logo-sub">
            {company?.business_category ? company.business_category.replace(/_/g, ' ') : 'Enterprise ERP'}
          </div>
        </div>
      </div>

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

      <div className="p-3 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
        <span>SmartBiz v1.0.0</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Local System Active" />
      </div>
    </aside>
  );
};
