import React from 'react';
import { Info } from 'lucide-react';
import { APP_VERSION } from '../version';

export function PrintFooter() {
  return (
    <div className="dms-print-footer w-full bg-[#0a0a0a] text-[#94a3b8] border-t border-[#2a2a2a] px-3.5 py-1.5 flex justify-between items-center font-mono text-[9.5px] select-none leading-tight">
      <div className="flex items-center space-x-2">
        <span className="text-[#e4e4e4] font-bold uppercase">DMS</span>
        <span className="text-[#334155]">/</span>
        <span>DIE MANAGEMENT SYSTEM</span>
        <span className="text-[#334155]">/</span>
        <span className="font-mono text-[8.5px] text-[#e4e4e4] bg-[#141414] border border-[#2a2a2a] px-1.5 py-0.2 rounded-xs">
          v{APP_VERSION}
        </span>
      </div>

      <div className="flex items-center space-x-2.5">
        <span>
          ENGINEERING:{' '}
          <span className="text-[#e4e4e4] font-bold font-mono uppercase">
            SAHIL & ANTIGRAVITY
          </span>
        </span>
        <span className="text-[#334155]">|</span>
        <div className="flex items-center space-x-1 text-[#e4e4e4] font-bold">
          <Info className="h-2.5 w-2.5 text-blue-400" />
          <span>SYSINFO</span>
        </div>
      </div>
    </div>
  );
}

export default PrintFooter;
