import { useState, useEffect } from 'react';

export function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('wire-draw-dark-mode');
    if (saved !== null) return saved === 'true';
    return true; // default to dark in our dark-themed application
  });

  useEffect(() => {
    localStorage.setItem('wire-draw-dark-mode', String(dark));
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const toggle = () => setDark((d) => !d);
  return [dark, toggle];
}
