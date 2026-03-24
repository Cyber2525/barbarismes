import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Sun, Moon, Globe, Languages, BookOpen, Pencil } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { OfflineButton } from './OfflineButton';

// ---------------------------------------------------------------------------
// Segmented controller with sliding pill indicator
// ---------------------------------------------------------------------------
interface SegmentOption {
  id: string;
  label: string;
  icon: React.ReactNode;
}

function SegmentedController({
  options,
  selected,
  onSelect,
}: {
  options: SegmentOption[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const idx = options.findIndex((o) => o.id === selected);
    const btn = container.querySelectorAll('button')[idx] as HTMLButtonElement | undefined;
    if (btn) setPill({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [selected, options]);

  return (
    <div
      ref={containerRef}
      className="relative flex bg-gray-200 dark:bg-gray-700 rounded-xl p-1 gap-0"
    >
      {/* sliding pill */}
      <div
        className="absolute top-1 bottom-1 bg-red-600 rounded-lg shadow-sm transition-all duration-300 ease-out pointer-events-none"
        style={{ left: pill.left, width: pill.width }}
      />
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium flex-1 transition-colors duration-200 ${
            selected === opt.id
              ? 'text-white'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          {opt.icon}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dark mode toggle switch
// ---------------------------------------------------------------------------
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Canviar a mode clar' : 'Canviar a mode fosc'}
      className={`relative flex items-center w-14 h-7 rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${
        isDark ? 'bg-red-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`flex items-center justify-center w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${
          isDark ? 'translate-x-7' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon size={13} className="text-red-600" />
        ) : (
          <Sun size={13} className="text-yellow-500" />
        )}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
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
  onModeChange,
}: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const popupRef = useRef<HTMLDivElement>(null);

  // lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const sectionOptions: SegmentOption[] = [
    { id: 'dialectes', label: 'Dialectes', icon: <Globe size={15} /> },
    { id: 'barbarismes', label: 'Barbarismes', icon: <Languages size={15} /> },
  ];

  const modeOptions: SegmentOption[] = [
    { id: 'study', label: 'Estudi', icon: <BookOpen size={15} /> },
    { id: 'quiz', label: 'Quiz', icon: <Pencil size={15} /> },
  ];

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Fixed blurred header bar                                             */}
      {/* ------------------------------------------------------------------ */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-4
        bg-white/70 dark:bg-gray-900/70 backdrop-blur-md
        border-b border-gray-200/60 dark:border-gray-700/60
        shadow-sm">
        {/* Title */}
        <span className="text-base font-bold text-red-700 dark:text-red-400 tracking-tight select-none">
          Estudiar Catala CSI
        </span>

        {/* Hamburger button */}
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Obrir menu"
          className="flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg
            hover:bg-red-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="block w-5 h-0.5 bg-red-700 dark:bg-red-400 rounded-full" />
          <span className="block w-5 h-0.5 bg-red-700 dark:bg-red-400 rounded-full" />
          <span className="block w-5 h-0.5 bg-red-700 dark:bg-red-400 rounded-full" />
        </button>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Backdrop                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Centered popup panel                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none`}
        aria-modal="true"
        role="dialog"
      >
        <div
          ref={popupRef}
          className={`pointer-events-auto w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl
            bg-white dark:bg-gray-900
            border border-gray-200 dark:border-gray-700
            transition-all duration-300 ease-out
            ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        >
          {/* Popup header */}
          <div className="flex items-center justify-between px-5 py-4
            bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm
            border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Menu</h2>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Tancar menu"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-100
                hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Popup body */}
          <div className="px-5 py-5 space-y-6">

            {/* Section: Contingut */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Contingut
              </p>
              <SegmentedController
                options={sectionOptions}
                selected={appSection}
                onSelect={(id) => onSectionChange(id as 'barbarismes' | 'dialectes')}
              />
            </div>

            {/* Section: Mode */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Mode
              </p>
              <SegmentedController
                options={modeOptions}
                selected={isStudyMode ? 'study' : 'quiz'}
                onSelect={(id) => onModeChange(id === 'study')}
              />
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* Section: Aparença */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Aparenca
              </p>
              <div className="flex items-center justify-between rounded-xl
                bg-gray-50 dark:bg-gray-800
                px-4 py-3">
                <div className="flex items-center gap-3">
                  {theme === 'dark'
                    ? <Moon size={18} className="text-yellow-400" />
                    : <Sun size={18} className="text-yellow-500" />
                  }
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {theme === 'dark' ? 'Mode fosc' : 'Mode clar'}
                  </span>
                </div>
                <ThemeToggle />
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* Section: Offline */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Mode offline
              </p>
              <OfflineButton />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default HamburgerMenu;
