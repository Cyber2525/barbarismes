import React from 'react';
import { Book, BookOpen, MessageSquareQuote } from 'lucide-react';
import { QuizMode } from '../types/quiz';

interface QuizModeSelectionProps {
  selectedMode: QuizMode;
  onSelectMode: (mode: QuizMode) => void;
}

export function QuizModeSelection({ selectedMode, onSelectMode }: QuizModeSelectionProps) {
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
      icon: <Book size={24} />,
    },
    {
      id: 'tots',
      title: 'Barbarismes + Frases',
      description: 'Mode complet amb paraules i expressions',
      icon: <BookOpen size={24} />,
    },
    {
      id: 'frases',
      title: 'Frases',
      description: 'Centra\'t en expressions i frases fetes',
      icon: <MessageSquareQuote size={24} />,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mb-6 md:mb-8">
      <h2 className="text-xl font-bold text-red-800 mb-4 text-left">Selecciona un tipus de test</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            className={`flex flex-col items-center p-4 md:p-6 bg-white rounded-lg shadow-md transition-colors duration-300 border-2 ${
              selectedMode === mode.id 
                ? 'border-red-600 bg-red-50' 
                : 'border-transparent hover:border-red-200'
            }`}
          >
            <div className={`p-3 rounded-full mb-3 ${
              selectedMode === mode.id ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {mode.icon}
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">{mode.title}</h3>
            <p className="text-sm text-left text-gray-600">{mode.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
