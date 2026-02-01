import React, { useState, useEffect } from 'react';
import { Info, Settings } from 'lucide-react';

interface QuizSettingsProps {
  onSelectQuizSize: (size: number) => void;
  currentSize: number;
}

export function QuizSettings({ onSelectQuizSize, currentSize }: QuizSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExitingModal, setIsExitingModal] = useState(false);
  
  // Handle modal close with animation
  const handleCloseModal = () => {
    setIsExitingModal(true);
    setTimeout(() => {
      setIsExitingModal(false);
      setIsOpen(false);
    }, 200); // Match animation duration
  };
  const [customSize, setCustomSize] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const presetSizes = [10, 20, 30, 50];
  
  const handleSelectSize = (size: number) => {
    onSelectQuizSize(size);
    handleCloseModal();
    setShowCustomInput(false);
  };
  
  const handleCustomSizeSelect = () => {
    setShowCustomInput(true);
  };
  
  // Control body scroll locking when settings modal is open
  useEffect(() => {
    if (isOpen) {
      // Lock scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      // Restore scrolling
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    
    // Cleanup function to ensure scrolling is restored if component unmounts
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);
  
  const handleCustomSizeSubmit = () => {
    const size = parseInt(customSize);
    if (size >= 5 && size <= 100) {
      onSelectQuizSize(size);
      handleCloseModal();
      setShowCustomInput(false);
      setCustomSize('');
    }
  };
  
  return (
    <div className="relative">
      <h3 className="text-xl font-bold text-red-800 mb-4 text-left md:text-center">Nombre de preguntes</h3>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 py-1 px-2 rounded-lg transition duration-200 mx-auto"
        aria-label="Configuració del Quiz"
      >
        <Settings size={16} />
        <span>Configuració ({currentSize} preguntes)</span>
      </button>
      
      {isOpen && (
        <div className={`modal-container bg-black bg-opacity-30 p-4 ${isExitingModal ? 'exiting' : ''}`} 
          onClick={handleCloseModal}>
          <div className={`modal-content bg-white rounded-lg p-4 shadow-lg max-w-[280px] w-full ${isExitingModal ? 'exiting' : ''}`} 
            onClick={e => e.stopPropagation()}>
            <h3 className="text-md font-semibold text-gray-800 mb-3">Nombre de preguntes</h3>
            
            {!showCustomInput ? (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {presetSizes.map(size => (
                    <button 
                      key={size}
                      onClick={() => handleSelectSize(size)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
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
                  className="w-full py-2 px-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-300"
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
            
            <div className="mt-3 text-xs text-gray-500 flex items-start gap-1">
              <Info size={12} className="mt-0.5 flex-shrink-0" />
              <span>La configuració es guardarà per a futures sessions.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
