import { Moon, Sun, Cog } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface HeaderProps {
  dark?: boolean;
  toggleDark?: () => void;
}

export default function Header({ dark: _dark, toggleDark }: HeaderProps) {
  const { theme, toggleTheme, canChangeTheme } = useTheme();
  const isLight = theme === 'light';

  const handleToggle = () => {
    if (toggleDark && typeof toggleDark === 'function') {
      toggleDark();
    }
    toggleTheme();
  };

  return (
    <header className="border border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-xl rounded-sm mb-6 shadow-sm transition-colors">
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Cog className="text-white h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-[var(--color-text)] tracking-[-0.01em] m-0 leading-tight">
              Wire Drawing Die Calculator
            </h1>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 tracking-wide uppercase">
              Precision elongation analysis
            </p>
          </div>
        </div>
        {canChangeTheme && (
          <button
            onClick={handleToggle}
            className="wdc-btn wdc-btn-ghost text-xs cursor-pointer"
            title={`Current theme: ${theme}. Click to switch theme.`}
            type="button"
          >
            {isLight ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-400" />}
            <span className="hidden sm:inline capitalize font-mono">{theme}</span>
          </button>
        )}
      </div>
    </header>
  );
}
