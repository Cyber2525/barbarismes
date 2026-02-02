import React, { useState } from 'react';
import { QuizItem } from '../types/quiz';
import { Check, RefreshCw, Squircle, X } from 'lucide-react';

interface QuizResultsProps {
  items: QuizItem[];
  answers: string[];
  score: number;
  onRestart: () => void;
}

export function QuizResults({ items, answers, score, onRestart }: QuizResultsProps) {
  const percentage = Math.round((score / items.length) * 100);
  const [isPreparingFailedItems, setIsPreparingFailedItems] = useState(false);
  
  const getResultMessage = () => {
    if (percentage >= 90) return "Excel·lent! Ets un expert en català!";
    if (percentage >= 70) return "Molt bé! Tens un bon domini del català.";
    if (percentage >= 50) return "Bé! Estàs aprenent però encara pots millorar.";
    return "Segueix practicant! Amb el temps milloraràs.";
  };

  // Check answer correctness
  const isAnswerCorrect = (index: number): boolean => {
    const answer = answers[index].toLowerCase().trim();
    return items[index].correctForms.some(form => form.toLowerCase() === answer);
  };
  
  // Determine answer state: 0 = incorrect, 1 = corrected, 2 = initially correct
  const getAnswerState = (index: number, item?: QuizItem): number => {
    const currentItem = item || items[index];
    
    // If this is a marked "originally correct" item
    if (currentItem.wasOriginallyCorrect) {
      return 2; // Initially correct
    }
    
    // If answer is incorrect, state is 0
    if (!isAnswerCorrect(index)) {
      return 0;
    }
    
    // Check if this is a practice item marked as correct in the previous round
    if (currentItem.wasCorrectInLastRound) {
      return 1; // Corrected in a previous practice round
    }
    
    // Check if this is from a practice session with original failed items
    if (items[0]?.isPracticeItem && !currentItem.wasOriginallyCorrect) {
      // In practice mode, correct answers that are not marked as "originally correct" 
      // were initially wrong but now corrected
      return 1;
    }
    
    // In normal mode, all correct answers were initially correct
    return 2;
  };
  
  // Get failed items for targeted practice
  const getFailedItems = (): QuizItem[] => {
    // If we're in practice mode, get all items that were:
    // 1. Originally failed items (from prior rounds)
    // 2. Still incorrect in this round
    if (items[0]?.isPracticeItem) {
      // Get the items that are still incorrect in this practice session
      const stillIncorrectItems = items.filter((item, index) => !isAnswerCorrect(index)).map(item => ({
        ...item,
        isPracticeItem: true,  // Mark this as a practice item for tracking
        wasCorrectInLastRound: false // Reset this flag for still incorrect items
      }));
      
      // Also include items that have been corrected in this round
      const correctedItems = items.filter((item, index) => isAnswerCorrect(index)).map(item => {
        // Preserve the wasCorrectInLastRound from previous rounds if exists
        const wasAlreadyCorrected = item.wasCorrectInLastRound === true;
        
        return {
          ...item,
          isPracticeItem: true,  // Mark this as a practice item for tracking
          wasCorrectInLastRound: true, // Mark as corrected in the last round
          // If this was already corrected before, preserve that information
          previouslyCorrectInPractice: wasAlreadyCorrected || false
        };
      });
      
      // Combine both sets of items
      return [...stillIncorrectItems, ...correctedItems];
    } else {
      // For initial quiz, just get the incorrect items
      const failedItems = items.filter((item, index) => !isAnswerCorrect(index)).map(item => ({
        ...item,
        isPracticeItem: true,  // Mark this as a practice item for tracking
        wasCorrectInLastRound: false
      }));
      
      return failedItems;
    }
  };
  
  // Start a new quiz with failed or previously corrected items
  const handlePracticeFailedItems = () => {
    // Get the items to practice - both still incorrect and corrected ones
    const itemsForPractice = getFailedItems();
    
    // If there are no items to practice, just restart a normal quiz
    if (itemsForPractice.length === 0) {
      onRestart();
      return;
    }
    
    // Show loading state
    setIsPreparingFailedItems(true);
    
    // Store the complete quiz state in localStorage - including all items and their answers
    const completeQuizState = {
      items: items,
      answers: answers,
      score: score,
      timestamp: new Date().getTime(),
      isPracticeSession: items[0]?.isPracticeItem || false,
      practiceRound: (localStorage.getItem('practiceRound') ? 
        parseInt(localStorage.getItem('practiceRound') || '0') + 1 : 1)
    };
    
    // Update practice round counter
    localStorage.setItem('practiceRound', 
      completeQuizState.practiceRound.toString());
    
    // If this is the first practice round, we need to make a special effort
    // to preserve ALL the original quiz info
    if (completeQuizState.practiceRound === 1) {
      // This is the first practice round, so save all the original quiz state
      console.log('Saving original quiz state for first practice round');
      localStorage.setItem('firstOriginalQuizState', JSON.stringify(completeQuizState));
    }
    
    // Store current quiz state - this gets updated each practice round
    localStorage.setItem('originalQuizState', JSON.stringify(completeQuizState));
    
    console.log(`Starting practice round ${completeQuizState.practiceRound} with ${itemsForPractice.length} items`);
    console.log(`- Still incorrect: ${itemsForPractice.filter(item => !item.wasCorrectInLastRound).length}`);
    console.log(`- Corrected in previous rounds: ${itemsForPractice.filter(item => item.wasCorrectInLastRound).length}`);
    
    // Custom event to pass practice items back to App component
    setTimeout(() => {
      // Create a custom event with the practice items and practice mode flag
      const event = new CustomEvent('practice-failed-items', {
        detail: { 
          failedItems: itemsForPractice,
          isPracticeMode: true,
          originalItems: items,  // Pass all original items to preserve the initial correct answers
          originalAnswers: answers, // Also pass original answers
          showResultsAfterRound: true, // Indicate we want to show results after each round
          practiceRound: completeQuizState.practiceRound
        }
      });
      
      // Dispatch the event to be caught by App.tsx
      window.dispatchEvent(event);
      
      // Reset loading state (though App will redirect)
      setIsPreparingFailedItems(false);
    }, 500);
  };
  
  // Count failed items
  const failedItemsCount = items.length - score;

  // Get original quiz state from localStorage
  const getOriginalQuizState = () => {
    if (items[0]?.isPracticeItem) {
      try {
        const originalQuizStateString = localStorage.getItem('originalQuizState');
        if (originalQuizStateString) {
          return JSON.parse(originalQuizStateString);
        }
      } catch (error) {
        console.error('Error retrieving original quiz state:', error);
      }
    }
    return null;
  };
  
  // Get originally correct items for practice mode
  const getOriginallyCorrectItems = () => {
    // In practice mode, try to get the FIRST original quiz state from localStorage
    // This ensures we always look at what was correct in the very first quiz
    try {
      const firstQuizStateString = localStorage.getItem('firstOriginalQuizState');
      const currentRound = parseInt(localStorage.getItem('practiceRound') || '1');
      
      // If we're in round 2+, we should use the first original quiz state
      // Otherwise, use the current original quiz state
      const originalQuizStateString = currentRound > 1 && firstQuizStateString 
        ? firstQuizStateString 
        : localStorage.getItem('originalQuizState');
      
      if (originalQuizStateString) {
        const originalQuizState = JSON.parse(originalQuizStateString);
        
        if (originalQuizState && originalQuizState.items && originalQuizState.answers) {
          // Get the original items and answers
          const originalItems = originalQuizState.items;
          const originalAnswers = originalQuizState.answers;
          
          console.log(`Getting originally correct items from ${currentRound > 1 ? 'first' : 'current'} quiz state`);
          console.log(`Practice round: ${currentRound}`);
          
          // Collect items that were correctly answered in the original quiz
          const correctItemsFromOriginal = originalItems
            .filter((originalItem: QuizItem, originalIndex: number) => {
              // Check if this item was correct in the original quiz
              const originalAnswer = originalAnswers[originalIndex].toLowerCase().trim();
              const wasCorrect = originalItem.correctForms.some(form => 
                form.toLowerCase() === originalAnswer
              );
              
              // Check if this item is not already in the current practice set
              // We need to avoid duplicating items that appear in both sets
              const notInCurrentSet = !items.some(currentItem => 
                currentItem.barbarism === originalItem.barbarism
              );
              
              return wasCorrect && notInCurrentSet;
            })
            .map((item: QuizItem) => ({
              ...item,
              wasOriginallyCorrect: true // Mark as originally correct for display
            }));
          
          console.log(`Found ${correctItemsFromOriginal.length} originally correct items`);
          return correctItemsFromOriginal;
        }
      }
    } catch (error) {
      console.error('Error retrieving original correct items:', error);
    }
    
    return [];
  };
  
  // Combine practice items with originally correct items (if in practice mode)
  const getAllDisplayItems = () => {
    // If we're in practice mode, combine practice items with originally correct items
    if (items[0]?.isPracticeItem) {
      const originallyCorrectItems = getOriginallyCorrectItems();
      
      // Only include original correct items if we found any
      if (originallyCorrectItems && originallyCorrectItems.length > 0) {
        console.log('Found originally correct items:', originallyCorrectItems.length);
        
        // Create a map of all the current items by barbarism for quick lookup
        const currentItemsMap = new Map(
          items.map(item => [item.barbarism, item])
        );
        
        // Filter out any originallyCorrectItems that might already be in the items list
        // This prevents duplicates when practice rounds maintain corrected items
        const filteredOriginalItems = originallyCorrectItems.filter(
          origItem => !currentItemsMap.has(origItem.barbarism)
        );
        
        console.log('Filtered to prevent duplicates, now showing:', filteredOriginalItems.length);
        
        // Return combined items
        return [...items, ...filteredOriginalItems];
      }
    }
    
    // If not in practice mode or no original items found, just return current items
    return items;
  };
  
  // Get all items to display in results
  const displayItems = getAllDisplayItems();
  console.log('Display items count:', displayItems.length);
  
  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden p-4 md:p-6 transition-colors duration-300">
      <div className="text-left md:text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors duration-300">Resultats del Quiz</h2>
        <div className="text-5xl font-bold text-red-600 dark:text-red-400 mb-2 transition-colors duration-300">{percentage}%</div>
        <p className="text-gray-600 dark:text-gray-300 font-medium transition-colors duration-300">{getResultMessage()}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-300">Has encertat {score} de {items.length} preguntes</p>
      </div>

      <div className="mb-6">
        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-300">Resum de les teves respostes:</h3>
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {displayItems.map((item, index) => {
            // For originally correct items that were added from localStorage,
            // we need to use a different approach to determine answerState and answer
            const isOriginalItem = item.wasOriginallyCorrect;
            const answerState = isOriginalItem ? 2 : getAnswerState(index, item);
            
            // Get the correct answer for display
            let userAnswer = '';
            
            if (isOriginalItem) {
              // For originally correct items, try to get the answer from localStorage
              try {
                const originalAnswers = JSON.parse(localStorage.getItem('originalQuizAnswers') || '[]');
                // Find the matching answer by searching for this item in original items
                const originalItems = JSON.parse(localStorage.getItem('originalQuizItems') || '[]');
                const originalIndex = originalItems.findIndex((origItem: QuizItem) => 
                  origItem.barbarism === item.barbarism
                );
                
                if (originalIndex >= 0 && originalAnswers[originalIndex]) {
                  userAnswer = originalAnswers[originalIndex];
                } else {
                  // Fallback: use the first correct form
                  userAnswer = item.correctForms[0] + ' (correcte)';
                }
              } catch (error) {
                console.error('Error retrieving original answer:', error);
                userAnswer = item.correctForms[0] + ' (correcte)';
              }
            } else {
              // For current items, use the answer from the answers array
              userAnswer = answers[index];
            }
            
            return (
            <div key={index} className="py-3 flex items-start">
              <div className="mr-3 mt-1">
                {answerState === 0 ? (
                  <X className="text-red-500" size={18} />
                ) : answerState === 1 ? (
                  <Squircle className="text-amber-500" size={18} />
                ) : (
                  <Check className="text-green-500" size={18} />
                )}
              </div>
              <div>
                <div className="font-medium text-gray-800 dark:text-gray-100 transition-colors duration-300">
                  {item.barbarism}
                  {item.isSeptetFunest && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 transition-colors duration-300">
                      Septet Funest
                    </span>
                  )}
                  {isOriginalItem && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 transition-colors duration-300">
                      Encert inicial
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
                  La teva resposta: <span className={
                    answerState === 0 ? "text-red-600 dark:text-red-400" : 
                    answerState === 1 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
                  }>{userAnswer}</span>
                </div>
                {answerState === 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                    Formes correctes: {item.correctForms.join(", ")}
                  </div>
                )}
                {(answerState === 1 || answerState === 2) && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                    Forma correcta: {item.correctForms[0]}
                    {item.correctForms.length > 1 && (
                      <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">
                        (també: {item.correctForms.slice(1).join(", ")})
                      </span>
                    )}
                  </div>
                )}
                {item.hint && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
                    {item.hint}
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
        
        <div className="mt-4 text-xs bg-gray-50 dark:bg-slate-700 p-3 rounded-lg text-gray-700 dark:text-gray-300 transition-colors duration-300">
          <div className="flex items-center mb-1">
            <Check className="text-green-500 dark:text-green-400 mr-2" size={14} />
            <span>Correcte des del principi</span>
          </div>
          <div className="flex items-center mb-1">
            <Squircle className="text-amber-500 dark:text-amber-400 mr-2" size={14} />
            <span>Corregit després de fallar</span>
            {items[0]?.isPracticeItem && (
              <span className="ml-2 text-gray-400 dark:text-gray-500">(es mantindrà a la següent ronda)</span>
            )}
          </div>
          <div className="flex items-center">
            <X className="text-red-500 dark:text-red-400 mr-2" size={14} />
            <span>Incorrecte</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {failedItemsCount > 0 && (
          <button
            onClick={handlePracticeFailedItems}
            disabled={isPreparingFailedItems}
            className="w-full bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            {isPreparingFailedItems ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Preparant...</span>
              </>
            ) : (
              <>
                <span>
                  {items[0]?.isPracticeItem 
                    ? `Continuar practicant els ${failedItemsCount} barbarismes fallats` 
                    : `Practicar els ${failedItemsCount} barbarismes fallats`}
                </span>
              </>
            )}
          </button>
        )}
        
        <button
          onClick={() => {
            // Call onRestart with a small delay to ensure state is updated properly
            setTimeout(() => {
              onRestart();
            }, 10);
          }}
          className="w-full bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300"
        >
          Començar una nova sessió
        </button>
      </div>
    </div>
  );
}
