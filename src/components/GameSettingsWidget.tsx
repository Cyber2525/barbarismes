import React, { useState } from 'react';
import { Book, BookOpen, CheckSquare, MessageSquareQuote, Square } from 'lucide-react';
import { DoneQuizFilter, QuizMode } from '../types/quiz';
import { countAvailableItems } from '../data/quizData';

const MIN_ITEMS = 5;

interface GameSettingsWidgetProps {
  selectedMode: QuizMode;
  onSelectMode: (mode: QuizMode) => void;
  currentSize: number;
  onSelectQuizSize: (size: number) => void;
  doneFilter: DoneQuizFilter;
  onSelectDoneFilter: (filter: DoneQuizFilter) => void;
}

export function GameSettingsWidget({
  selectedMode,
  onSelectMode,
  currentSize,
  onSelectQuizSize,
  doneFilter,
  onSelectDoneFilter,
}: GameSettingsWidgetProps) {
  const [customSize, setCustomSize] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const presetSizes = [10, 20, 30, 50];

  const handleSelectSize = (size: number) => {
    onSelectQuizSize(size);
    setShowCustomInput(false);
  };

  const handleCustomSizeSelect = () => {
    setShowCustomInput(true);
  };

  const handleCustomSizeSubmit = () => {
    const size = parseInt(customSize);
    if (size >= 5 && size <= 100) {
      onSelectQuizSize(size);
      setShowCustomInput(false);
      setCustomSize('');
    }
  };

  // When mode changes, auto-fallback doneFilter to 'all' if result < MIN_ITEMS
  const handleModeChange = (mode: QuizMode) => {
    if (doneFilter !== 'all') {
      const count = countAvailableItems(mode, doneFilter);
      if (count < MIN_ITEMS) {
        onSelectDoneFilter('all');
      }
    }
    onSelectMode(mode);
  };

  const modes: Array<{ id: QuizMode; title: string; description: string; icon: React.ReactNode }> = [
    {
      id: 'tots',
      title: 'Tots',
      description: 'Mode complet amb paraules i expressions',
      icon: <BookOpen size={22} />,
    },
    {
      id: 'barbarismes',
      title: 'Barbarismes',
      description: 'Practica amb paraules incorrectes en català',
      icon: <Book size={22} />,
    },
    {
      id: 'frases',
      title: 'Frases',
      description: "Centra't en expressions i frases fetes",
      icon: <MessageSquareQuote size={22} />,
    },
  ];

  const doneFilters: Array<{ id: DoneQuizFilter; label: string; description: string; icon: React.ReactNode }> = [
    {
      id: 'all',
      label: 'Tots',
      description: 'Inclou tots els elements',
      icon: <BookOpen size={18} />,
    },
    {
      id: 'not-done',
      label: 'No fets',
      description: 'Només elements no marcats com a fets',
      icon: <Square size={18} />,
    },
    {
      id: 'done',
      label: 'Fets',
      description: 'Només elements ja marcats com a fets',
      icon: <CheckSquare size={18} />,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-red-800 mb-4 text-left md:text-center">Configuració del joc</h2>

        {/* Mode selection */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3 text-left md:text-center">Tipus de test</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className={`flex items-start md:flex-col md:items-center p-4 rounded-lg transition-colors duration-300 border-2 ${
                  selectedMode === mode.id
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-red-200'
                }`}
              >
                <div className={`p-2 rounded-full mb-1 mr-3 md:mr-0 md:mb-2 ${
                  selectedMode === mode.id ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {mode.icon}
                </div>
                <div className="text-left md:text-center w-full">
                  <h4 className="text-base font-medium text-gray-800">{mode.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{mode.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Done filter */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3 text-left md:text-center">Filtre per estat (fets)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {doneFilters.map((f) => {
              const available = f.id === 'all' ? Infinity : countAvailableItems(selectedMode, f.id);
              const isDisabled = f.id !== 'all' && available < MIN_ITEMS;
              return (
                <button
                  key={f.id}
                  onClick={() => !isDisabled && onSelectDoneFilter(f.id)}
                  disabled={isDisabled}
                  title={isDisabled ? `Menys de ${MIN_ITEMS} elements disponibles` : undefined}
                  className={`flex items-start md:flex-col md:items-center p-3 rounded-lg transition-colors duration-300 border-2 ${
                    isDisabled
                      ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                      : doneFilter === f.id
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-green-200'
                  }`}
                >
                  <div className={`p-2 rounded-full mb-1 mr-3 md:mr-0 md:mb-2 ${
                    isDisabled
                      ? 'bg-gray-100 text-gray-400'
                      : doneFilter === f.id ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {f.icon}
                  </div>
                  <div className="text-left md:text-center w-full">
                    <h4 className="text-base font-medium text-gray-800">{f.label}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {isDisabled ? `Menys de ${MIN_ITEMS} disponibles` : f.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quiz size */}
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3 text-left md:text-center">Nombre de preguntes</h3>

          {!showCustomInput ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {presetSizes.map(size => (
                  <button
                    key={size}
                    onClick={() => handleSelectSize(size)}
                    className={`py-3 px-4 rounded-lg text-sm md:text-base font-medium transition-all duration-300 ${
                      currentSize === size
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCustomSizeSelect}
                className="w-full py-3 px-4 rounded-lg text-sm md:text-base font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-300"
              >
                Personalitzat
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="custom-size" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre personalitzat (5-100):
                </label>
                <input
                  type="number"
                  id="custom-size"
                  min="5"
                  max="100"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-red-300 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomInput(false)}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-300"
                >
                  Tornar
                </button>
                <button
                  onClick={handleCustomSizeSubmit}
                  disabled={!customSize || parseInt(customSize) < 5 || parseInt(customSize) > 100}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all duration-300 disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500 text-left md:text-center">
            <span>La configuració es guardarà per a futures sessions.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
  selectedMode: QuizMode;
  onSelectMode: (mode: QuizMode) => void;
  currentSize: number;
  onSelectQuizSize: (size: number) => void;
  doneFilter: DoneQuizFilter;
  onSelectDoneFilter: (filter: DoneQuizFilter) => void;
}

export function GameSettingsWidget({
  selectedMode,
  onSelectMode,
  currentSize,
  onSelectQuizSize,
  doneFilter,
  onSelectDoneFilter,
}: GameSettingsWidgetProps) {
  const [customSize, setCustomSize] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const presetSizes = [10, 20, 30, 50];

  const handleSelectSize = (size: number) => {
    onSelectQuizSize(size);
    setShowCustomInput(false);
  };

  const handleCustomSizeSelect = () => {
    setShowCustomInput(true);
  };

  const handleCustomSizeSubmit = () => {
    const size = parseInt(customSize);
    if (size >= 5 && size <= 100) {
      onSelectQuizSize(size);
      setShowCustomInput(false);
      setCustomSize('');
    }
  };

  const modes: Array<{
    id: QuizMode;
    title: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'barbarismes',
      title: 'Barbarismes',
      description: 'Practica amb paraules incorrectes en català',
      icon: <Book size={22} />,
    },
    {
      id: 'tots',
      title: 'Barbarismes + Frases',
      description: 'Mode complet amb paraules i expressions',
      icon: <BookOpen size={22} />,
    },
    {
      id: 'frases',
      title: 'Frases',
      description: "Centra't en expressions i frases fetes",
      icon: <MessageSquareQuote size={22} />,
    },
  ];

  const doneFilters: Array<{ id: DoneQuizFilter; label: string; description: string; icon: React.ReactNode }> = [
    {
      id: 'all',
      label: 'Tots',
      description: 'Inclou tots els elements',
      icon: <BookOpen size={18} />,
    },
    {
      id: 'not-done',
      label: 'No fets',
      description: 'Només elements no marcats com a fets',
      icon: <Square size={18} />,
    },
    {
      id: 'done',
      label: 'Fets',
      description: 'Només elements ja marcats com a fets',
      icon: <CheckSquare size={18} />,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-red-800 mb-4 text-left md:text-center">Configuració del joc</h2>

        {/* Mode selection */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3 text-left md:text-center">Tipus de test</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                className={`flex items-start md:flex-col md:items-center p-4 rounded-lg transition-colors duration-300 border-2 ${
                  selectedMode === mode.id
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-red-200'
                }`}
              >
                <div className={`p-2 rounded-full mb-1 mr-3 md:mr-0 md:mb-2 ${
                  selectedMode === mode.id ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {mode.icon}
                </div>
                <div className="text-left md:text-center w-full">
                  <h4 className="text-base font-medium text-gray-800">{mode.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{mode.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Done filter */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3 text-left md:text-center">Filtre per estat (fets)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {doneFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => onSelectDoneFilter(f.id)}
                className={`flex items-start md:flex-col md:items-center p-3 rounded-lg transition-colors duration-300 border-2 ${
                  doneFilter === f.id
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-200'
                }`}
              >
                <div className={`p-2 rounded-full mb-1 mr-3 md:mr-0 md:mb-2 ${
                  doneFilter === f.id ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {f.icon}
                </div>
                <div className="text-left md:text-center w-full">
                  <h4 className="text-base font-medium text-gray-800">{f.label}</h4>
                  <p className="text-xs text-gray-500 mt-1">{f.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quiz size */}
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3 text-left md:text-center">Nombre de preguntes</h3>

          {!showCustomInput ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {presetSizes.map(size => (
                  <button
                    key={size}
                    onClick={() => handleSelectSize(size)}
                    className={`py-3 px-4 rounded-lg text-sm md:text-base font-medium transition-all duration-300 ${
                      currentSize === size
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCustomSizeSelect}
                className="w-full py-3 px-4 rounded-lg text-sm md:text-base font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-300"
              >
                Personalitzat
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="custom-size" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre personalitzat (5-100):
                </label>
                <input
                  type="number"
                  id="custom-size"
                  min="5"
                  max="100"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-red-300 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomInput(false)}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-300"
                >
                  Tornar
                </button>
                <button
                  onClick={handleCustomSizeSubmit}
                  disabled={!customSize || parseInt(customSize) < 5 || parseInt(customSize) > 100}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all duration-300 disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500 text-left md:text-center">
            <span>La configuració es guardarà per a futures sessions.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
