import React, { useState, useEffect } from 'react';
import { QuizItem } from '../types/quiz';
import { Check, ChevronRight, RotateCcw, X } from 'lucide-react';

interface QuizQuestionProps {
  item: QuizItem;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  onContinue: () => void;
  onRestart: () => void;
  answered: boolean;
}

export function QuizQuestion({ item, onAnswer, onContinue, onRestart, answered }: QuizQuestionProps) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [isExitingModal, setIsExitingModal] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  // Handle modal close with animation
  const handleCloseModal = () => {
    setIsExitingModal(true);
    setTimeout(() => {
      setIsExitingModal(false);
      setShowRestartConfirm(false);
    }, 200); // Match animation duration
  };

  // Update local state when a new question is shown
  React.useEffect(() => {
    setAnswer('');
    setSubmitted(false);
    setIsCorrect(false);
    setShowHint(false);

    // Focus the input field when a new question appears
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  }, [item.barbarism]);

  // Handle keyboard events for Enter key navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process Enter key
      if (e.key !== 'Enter') return;
      
      // If the restart confirm modal is open, ignore keyboard input
      if (showRestartConfirm) return;

      // Prevent default behavior for Enter to avoid form submission
      e.preventDefault();
      
      if (submitted) {
        // If answer already submitted, continue to next question
        onContinue();
      } else if (answer.trim() !== '') {
        // If answer provided but not submitted, submit it
        handleSubmit(new Event('enter-key') as unknown as React.FormEvent);
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [submitted, answer, onContinue, showRestartConfirm]);

  // Update submitted state when answered prop changes
  React.useEffect(() => {
    if (answered && !submitted) {
      setSubmitted(true);
    }
  }, [answered]);
  
  // Control body scroll locking when confirmation modal is open
  React.useEffect(() => {
    if (showRestartConfirm) {
      // Lock scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      // Restore scrolling
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      
      // Focus the input field when modal closes
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
    
    // Cleanup function to ensure scrolling is restored if component unmounts
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [showRestartConfirm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitted) return;
    
    const trimmedAnswer = answer.trim().toLowerCase();
    const correct = item.correctForms.some(
      form => form.toLowerCase() === trimmedAnswer
    );
    
    setIsCorrect(correct);
    setSubmitted(true);
    onAnswer(answer, correct);
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-4 md:p-6 bg-white rounded-xl shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Corregeix aquest barbarisme:</h2>
        <div className="text-3xl font-bold text-red-600 p-4 bg-yellow-50 rounded-lg text-left md:text-center">
          {item.barbarism}
        </div>
      </div>

      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setShowRestartConfirm(true)}
          className="flex items-center gap-1 text-sm bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 py-1.5 px-3 rounded-lg shadow-sm transition duration-200"
          aria-label="Reiniciar quiz"
        >
          <RotateCcw size={16} />
          <span>Reiniciar</span>
        </button>
      </div>

      {showRestartConfirm && (
        <div className={`modal-container bg-black bg-opacity-50 p-4 ${isExitingModal ? 'exiting' : ''}`}>
          <div className={`modal-content bg-white rounded-lg p-5 max-w-xs w-full shadow-lg ${isExitingModal ? 'exiting' : ''}`}>
            <h3 className="text-lg font-bold text-gray-800 mb-3">Confirmar reinici</h3>
            <p className="text-gray-600 mb-4">Estàs segur que vols reiniciar el quiz? Perdràs tot el progrés actual.</p>
            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-300"
              >
                Cancel·lar
              </button>
              <button
                onClick={() => {
                  setIsExitingModal(true);
                  setTimeout(() => {
                    setIsExitingModal(false);
                    setShowRestartConfirm(false);
                    onRestart();
                  }, 200);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-1">
            Escriu la forma correcta:
          </label>
          <input
            type="text"
            id="answer"
            ref={inputRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border ${
              submitted
                ? isCorrect
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
                : 'border-gray-300 focus:border-red-500 focus:ring-red-300'
            } focus:outline-none transition duration-200`}
            placeholder="La teva resposta..."
            disabled={submitted}
            autoComplete="off"
          />
          <div className="mt-1 text-xs text-gray-500">
            <span className="italic">Prem Enter per enviar</span>
          </div>
        </div>

        {!submitted ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300"
              >
                Comprovar
              </button>
              <button
                type="button"
                onClick={() => setShowHint(true)}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium py-2 px-4 rounded-lg transition-all duration-300"
              >
                Pista
              </button>
            </div>
            <div className="text-xs text-center text-gray-500">
              <span className="italic">Prem Enter per comprovar</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-100' : 'bg-red-100'} animate-fadeIn`}
                 style={{animation: 'fadeIn 0.3s ease-in-out'}}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <Check className="text-green-600" size={20} />
                ) : (
                  <X className="text-red-600" size={20} />
                )}
                <span className={`font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {isCorrect ? 'Correcte!' : 'Incorrecte'}
                </span>
              </div>
              {!isCorrect && (
                <div className="text-gray-700">
                  <p className="mb-1">Les formes correctes són:</p>
                  <ul className="list-disc pl-5">
                    {item.correctForms.map((form, index) => (
                      <li key={index}>{form}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => {
                onContinue();
                // Focus input on next question
                setTimeout(() => {
                  if (inputRef.current) {
                    inputRef.current.focus();
                  }
                }, 100);
              }}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300"
            >
              <span>Continuar</span>
              <ChevronRight size={18} />
              <div className="flex items-center">
                <span className="text-xs opacity-70 ml-1 whitespace-nowrap">(o prem Enter)</span>
              </div>
            </button>
          </div>
        )}
        
        {showHint && !submitted && (
          <div className="text-gray-600 text-sm p-3 bg-gray-100 rounded-lg">
            {item.hint ? (
              <p>Pista: {item.hint}</p>
            ) : (
              <p>Pista: La paraula té {item.correctForms[0].length} lletres i comença per '{item.correctForms[0][0]}'</p>
            )}
            {item.isSeptetFunest && (
              <p className="mt-1 text-red-600 font-medium">Aquesta paraula forma part del "Septet Funest" - els 7 errors més comuns en català!</p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
