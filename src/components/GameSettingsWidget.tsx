import React, { useState } from 'react';
import { Book, BookOpen, MessageSquareQuote, Settings } from 'lucide-react';
import { QuizMode } from '../types/quiz';

interface GameSettingsWidgetProps {
  selectedMode: QuizMode;
  onSelectMode: (mode: QuizMode) => void;
  currentSize: number;
  onSelectQuizSize: (size: number) => void;
}

export function GameSettingsWidget({ 
  selectedMode, 
  onSelectMode, 
  currentSize, 
  onSelectQuizSize 
}: GameSettingsWidgetProps) {
  const [customSize, setCustomSize] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const presetSizes = [10, 20, 30, 50];
  
  // Handle quiz size selection
  const handleSelectSize = (size: number) => {
    onSelectQuizSize(size);
    setShowCustomInput(false);
  };
  
  // Enable custom size input
  const handleCustomSizeSelect = () => {
    setShowCustomInput(true);
  };
  
  // Submit custom size
  const handleCustomSizeSubmit = () => {
    const size = parseInt(customSize);
    if (size >= 5 && size <= 100) {
      onSelectQuizSize(size);
      setShowCustomInput(false);
      setCustomSize('');
    }
  };
  
  // Define quiz modes
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
      description: 'Centra\'t en expressions i frases fetes',
      icon: <MessageSquareQuote size={22} />,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 transition-colors duration-300">
        <h2 className="text-xl font-bold text-red-800 dark:text-red-400 mb-4 text-left md:text-center transition-colors duration-300">Configuració del joc</h2>
        
        {/* Mode selection section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-3 text-left md:text-center transition-colors duration-300">Tipus de test</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                className={`flex items-start md:flex-col md:items-center p-4 rounded-lg transition-all duration-300 border-2 ${
                  selectedMode === mode.id 
                    ? 'border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-900/30' 
                    : 'border-gray-200 dark:border-slate-600 hover:border-red-200 dark:hover:border-red-700'
                }`}
              >
                <div className={`p-2 rounded-full mb-1 mr-3 md:mr-0 md:mb-2 transition-colors duration-300 ${
                  selectedMode === mode.id ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {mode.icon}
                </div>
                <div className="text-left md:text-center w-full">
                  <h4 className="text-base font-medium text-gray-800 dark:text-gray-100 transition-colors duration-300">{mode.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-300">{mode.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Quiz size section - integrated directly in the widget */}
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-3 text-left md:text-center transition-colors duration-300">Nombre de preguntes</h3>
          
          {!showCustomInput ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {presetSizes.map(size => (
                  <button 
                    key={size}
                    onClick={() => handleSelectSize(size)}
                    className={`py-3 px-4 rounded-lg text-sm md:text-base font-medium transition-all duration-300 ${
                      currentSize === size 
                        ? 'bg-red-600 dark:bg-red-500 text-white' 
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={handleCustomSizeSelect}
                className="w-full py-3 px-4 rounded-lg text-sm md:text-base font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all duration-300"
              >
                Personalitzat
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="custom-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">
                  Nombre personalitzat (5-100):
                </label>
                <input
                  type="number"
                  id="custom-size"
                  min="5"
                  max="100"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-red-500 focus:ring-red-300 focus:outline-none transition-colors duration-300"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomInput(false)}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all duration-300"
                >
                  Tornar
                </button>
                <button
                  onClick={handleCustomSizeSubmit}
                  disabled={!customSize || parseInt(customSize) < 5 || parseInt(customSize) > 100}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 transition-all duration-300 disabled:bg-red-300 dark:disabled:bg-red-800 disabled:cursor-not-allowed"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
          
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-left md:text-center transition-colors duration-300">
            <span>La configuració es guardarà per a futures sessions.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
