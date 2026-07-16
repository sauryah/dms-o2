import { Moon, Sun, Cog } from 'lucide-react';

interface HeaderProps {
  dark: boolean;
  toggleDark: () => void;
}

export default function Header({ dark, toggleDark }: HeaderProps) {
  return (
    <header className="border-b border-white/[0.06] bg-[#0B1220]/80 backdrop-blur-xl rounded-2xl mb-6">
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Cog className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-[#F8FAFC] tracking-[-0.01em] m-0 leading-tight">
              Wire Drawing Die Calculator
            </h1>
            <p className="text-[11px] text-[#64748B] mt-0.5 tracking-wide uppercase">
              Precision elongation analysis
            </p>
          </div>
        </div>
        <button
          onClick={toggleDark}
          className="wdc-btn wdc-btn-ghost text-xs"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
