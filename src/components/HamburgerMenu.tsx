import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Sun, Moon, Download, Globe, Languages, BookOpen, Pencil } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { OfflineButton } from './OfflineButton';

interface SegmentedControllerProps {
  options: { id: string; label: string; icon: React.ReactNode }[];
  selected: string;
  onSelect: (id: string) => void;
}

function SegmentedController({ options, selected, onSelect }: SegmentedControllerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const selectedIndex = options.findIndex(opt => opt.id === selected);
    const buttons = container.querySelectorAll('button');
    if (buttons[selectedIndex]) {
      const button = buttons[selectedIndex] as HTMLButtonElement;
      setIndicatorStyle({
        left: button.offsetLeft,
        width: button.offsetWidth,
      });
    }
  }, [selected, options]);

  return (
    <div 
      ref={containerRef}
      className="relative flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1"
    >
      {/* Sliding indicator */}
      <div
        className="absolute top-1 bottom-1 bg-red-600 rounded-md transition-all duration-300 ease-out"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
      
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onSelect(option.id)}
          className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex-1 justify-center ${
            selected === option.id
              ? 'text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded-full p-1 transition-colors duration-300"
      aria-label={theme === 'dark' ? 'Canviar a mode clar' : 'Canviar a mode fosc'}
    >
      {/* Sliding circle */}
      <div
        className={`absolute w-6 h-6 bg-white dark:bg-gray-900 rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
          theme === 'dark' ? 'translate-x-8' : 'translate-x-0'
        }`}
      >
        {theme === 'dark' ? (
          <Moon size={14} className="text-yellow-400" />
        ) : (
          <Sun size={14} className="text-yellow-500" />
        )}
      </div>
      
      {/* Background icons */}
      <div className="flex w-full justify-between px-1.5 pointer-events-none">
        <Sun size={14} className={`transition-opacity duration-300 ${theme === 'dark' ? 'opacity-30 text-gray-400' : 'opacity-0'}`} />
        <Moon size={14} className={`transition-opacity duration-300 ${theme === 'light' ? 'opacity-30 text-gray-400' : 'opacity-0'}`} />
      </div>
    </button>
  );
}

interface HamburgerMenuProps {
  appSection: 'barbarismes' | 'dialectes';
  onSectionChange: (section: 'barbarismes' | 'dialectes') => void;
  isStudyMode: boolean;
  onModeChange: (isStudy: boolean) => void;
}

export function HamburgerMenu({ 
  appSection, 
  onSectionChange, 
  isStudyMode, 
  onModeChange 
}: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const sectionOptions = [
    { id: 'dialectes', label: 'Dialectes', icon: <Globe size={16} /> },
    { id: 'barbarismes', label: 'Barbarismes', icon: <Languages size={16} /> },
  ];

  const modeOptions = [
    { id: 'study', label: 'Estudi', icon: <BookOpen size={16} /> },
    { id: 'quiz', label: 'Quiz', icon: <Pencil size={16} /> },
  ];

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-40 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label="Obrir menú"
      >
        <Menu size={24} className="text-red-600 dark:text-red-400" />
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Menu panel */}
      <div
        ref={menuRef}
        className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header with blur */}
        <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-red-800 dark:text-red-400">Menú</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Tancar menú"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Menu content */}
        <div className="bg-white dark:bg-gray-900 h-[calc(100%-64px)] overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Section selector */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Contingut
              </h3>
              <SegmentedController
                options={sectionOptions}
                selected={appSection}
                onSelect={(id) => {
                  onSectionChange(id as 'barbarismes' | 'dialectes');
                }}
              />
            </div>

            {/* Mode selector */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Mode
              </h3>
              <SegmentedController
                options={modeOptions}
                selected={isStudyMode ? 'study' : 'quiz'}
                onSelect={(id) => {
                  onModeChange(id === 'study');
                }}
              />
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Dark mode toggle */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Aparença
              </h3>
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon size={20} className="text-yellow-400" />
                  ) : (
                    <Sun size={20} className="text-yellow-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {theme === 'dark' ? 'Mode fosc' : 'Mode clar'}
                  </span>
                </div>
                <ThemeToggle />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Download section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Mode offline
              </h3>
              <OfflineButton />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default HamburgerMenu;
