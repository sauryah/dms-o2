import React from 'react';
import { useLocation } from 'react-router-dom';
import { Layers, LogOut } from 'lucide-react';
import { useAuth } from '../contexts';

export function PrintHeader() {
  const { role, username } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  const userDisplayName = username || 'root';
  const roleDisplayName = (role || 'ROOT').toUpperCase();

  const navItems = [
    { label: 'DASHBOARD', active: pathname === '/' },
    { label: 'INVENTORY', active: pathname.startsWith('/inventory') || pathname.startsWith('/dies') },
    { label: 'MACHINES', active: pathname.startsWith('/machines') },
    { label: 'AUDIT LOG', active: pathname.startsWith('/history') },
    { label: 'TOOLS', active: pathname.startsWith('/tools') || pathname.startsWith('/wire-drawing') || pathname.startsWith('/die-series') },
    { label: 'BULK IMPORT', active: pathname.startsWith('/import') },
    { label: 'USERS', active: pathname.startsWith('/users') },
  ];

  return (
    <div className="dms-print-header w-full bg-[#0a0a0a] text-[#e4e4e4] border-b border-[#2a2a2a] px-3.5 py-1.5 flex justify-between items-center font-mono text-[11px] select-none leading-tight">
      <div className="flex items-center space-x-3.5">
        {/* DMS Logo */}
        <div className="flex items-center space-x-1.5">
          <div className="p-1 bg-[#141414] border border-[#2a2a2a] rounded-xs flex items-center justify-center">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <span className="font-bold text-xs tracking-widest text-[#e4e4e4] uppercase font-mono">
            DMS
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1">
          {navItems.map((item) => (
            <span
              key={item.label}
              className={`px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider font-mono border rounded-xs ${
                item.active
                  ? 'bg-[#1e293b] text-white border-[#2a2a2a] border-b-2 border-b-blue-500 font-bold'
                  : 'bg-[#141414] text-[#94a3b8] border-[#2a2a2a]'
              }`}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Right Status Badges & User Profile */}
      <div className="flex items-center space-x-2.5">
        {/* LIVE Badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-[9px] font-mono font-bold tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          <span>LIVE</span>
        </div>

        {/* User Info */}
        <div className="text-right font-mono leading-none">
          <span className="block text-[10.5px] font-medium text-[#e4e4e4]">{userDisplayName}</span>
          <span className="block text-[8.5px] text-[#6b7280] uppercase tracking-wider mt-0.5">{roleDisplayName}</span>
        </div>

        {/* Logout Badge */}
        <div className="flex items-center space-x-1 bg-[#141414] border border-[#2a2a2a] text-[#e4e4e4] px-2 py-0.5 rounded-xs text-[9.5px] uppercase font-mono tracking-wider font-semibold">
          <LogOut className="h-3 w-3 text-red-400" />
          <span>LOGOUT</span>
        </div>
      </div>
    </div>
  );
}

export default PrintHeader;
