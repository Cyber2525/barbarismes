import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      return savedTheme;
    }
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Apply theme on mount and when it changes
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-center w-14 h-8 rounded-full bg-gray-200 dark:bg-slate-700 transition-colors duration-300 focus:outline-none"
      aria-label={theme === 'light' ? 'Activar mode fosc' : 'Activar mode clar'}
    >
      {/* Toggle track background icons */}
      <Sun 
        size={14} 
        className="absolute left-1.5 text-amber-500 transition-opacity duration-300"
        style={{ opacity: theme === 'light' ? 0.3 : 1 }}
      />
      <Moon 
        size={14} 
        className="absolute right-1.5 text-slate-400 dark:text-blue-300 transition-opacity duration-300"
        style={{ opacity: theme === 'dark' ? 0.3 : 1 }}
      />
      
      {/* Toggle knob */}
      <span
        className={`absolute w-6 h-6 bg-white dark:bg-slate-900 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
          theme === 'dark' ? 'translate-x-3' : '-translate-x-3'
        }`}
      >
        {theme === 'light' ? (
          <Sun size={14} className="text-amber-500" />
        ) : (
          <Moon size={14} className="text-blue-300" />
        )}
      </span>
    </button>
  );
}
