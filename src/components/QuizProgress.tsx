import React from 'react';

interface QuizProgressProps {
  current: number;
  total: number;
  score: number;
}

export function QuizProgress({ current, total, score }: QuizProgressProps) {
  const percentage = (current / total) * 100;
  
  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium text-gray-600">
          Pregunta {current + 1} de {total}
        </div>
        <div className="text-sm font-medium text-red-600">
          Puntuació: {score} de {current}
        </div>
      </div>
      <div className="w-full bg-gray-200/20 rounded-full h-2.5">
        <div 
          className="bg-red-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
