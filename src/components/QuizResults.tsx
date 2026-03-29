import React, { useEffect, useState } from 'react';
import { QuizItem } from '../types/quiz';
import { Check, CheckSquare, RefreshCw, Squircle, X } from 'lucide-react';
import { getDoneItems, markAsDone, markManyAsDone } from '../utils/doneItems';

interface QuizResultsProps {
  items: QuizItem[];
  answers: string[];
  score: number;
  onRestart: () => void;
}

export function QuizResults({ items, answers, score, onRestart }: QuizResultsProps) {
  const percentage = Math.round((score / items.length) * 100);
  const [isPreparingFailedItems, setIsPreparingFailedItems] = useState(false);

  // Items corrected after failing (orange) that need the dialog
  const [correctedPendingItems, setCorrectedPendingItems] = useState<QuizItem[]>([]);
  // Whether the "register corrected as done?" dialog is shown
  const [showCorrectedDialog, setShowCorrectedDialog] = useState(false);
  const [isExitingDialog, setIsExitingDialog] = useState(false);

  const handleCloseCorrectedDialog = () => {
    setIsExitingDialog(true);
    setTimeout(() => {
      setIsExitingDialog(false);
      setShowCorrectedDialog(false);
    }, 200);
  };

  const getResultMessage = () => {
    if (percentage >= 90) return "Excel·lent! Ets un expert en català!";
    if (percentage >= 70) return "Molt bé! Tens un bon domini del català.";
    if (percentage >= 50) return "Bé! Estàs aprenent però encara pots millorar.";
    return "Segueix practicant! Amb el temps milloraràs.";
  };

  const isAnswerCorrect = (index: number): boolean => {
    const answer = answers[index].toLowerCase().trim();
    return items[index].correctForms.some(form => form.toLowerCase() === answer);
  };

  // 0 = incorrect, 1 = corrected (orange), 2 = initially correct (green)
  const getAnswerState = (index: number, item?: QuizItem): number => {
    const currentItem = item || items[index];
    if (currentItem.wasOriginallyCorrect) return 2;
    if (!isAnswerCorrect(index)) return 0;
    if (currentItem.wasCorrectInLastRound) return 1;
    if (items[0]?.isPracticeItem && !currentItem.wasOriginallyCorrect) return 1;
    return 2;
  };

  // Auto-mark initially correct items on first mount
  useEffect(() => {
    const initiallyCorrect: string[] = [];
    const doneSet = getDoneItems();

    displayItems.forEach((item, index) => {
      const state = getAnswerState(index, item);
      if (state === 2 && !item.wasOriginallyCorrect) {
        // Initially correct in this quiz run — auto-mark as done
        if (!doneSet.has(item.barbarism)) {
          initiallyCorrect.push(item.barbarism);
        }
      }
      // wasOriginallyCorrect items are from prior sessions, already handled
    });

    if (initiallyCorrect.length > 0) {
      markManyAsDone(initiallyCorrect);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegisterCorrected = () => {
    markManyAsDone(correctedPendingItems.map(i => i.barbarism));
    setShowCorrectedDialog(false);
    setCorrectedPendingItems([]);
  };

  const handleSkipCorrected = () => {
    handleCloseCorrectedDialog();
  };

  const getFailedItems = (): QuizItem[] => {
    if (items[0]?.isPracticeItem) {
      const stillIncorrectItems = items.filter((item, index) => !isAnswerCorrect(index)).map(item => ({
        ...item,
        isPracticeItem: true,
        wasCorrectInLastRound: false
      }));
      const correctedItems = items.filter((item, index) => isAnswerCorrect(index)).map(item => {
        const wasAlreadyCorrected = item.wasCorrectInLastRound === true;
        return {
          ...item,
          isPracticeItem: true,
          wasCorrectInLastRound: true,
          previouslyCorrectInPractice: wasAlreadyCorrected || false
        };
      });
      return [...stillIncorrectItems, ...correctedItems];
    } else {
      return items.filter((item, index) => !isAnswerCorrect(index)).map(item => ({
        ...item,
        isPracticeItem: true,
        wasCorrectInLastRound: false
      }));
    }
  };

  const handlePracticeFailedItems = () => {
    const itemsForPractice = getFailedItems();
    if (itemsForPractice.length === 0) {
      onRestart();
      return;
    }
    setIsPreparingFailedItems(true);
    const completeQuizState = {
      items,
      answers,
      score,
      timestamp: new Date().getTime(),
      isPracticeSession: items[0]?.isPracticeItem || false,
      practiceRound: (localStorage.getItem('practiceRound') ?
        parseInt(localStorage.getItem('practiceRound') || '0') + 1 : 1)
    };
    localStorage.setItem('practiceRound', completeQuizState.practiceRound.toString());
    if (completeQuizState.practiceRound === 1) {
      localStorage.setItem('firstOriginalQuizState', JSON.stringify(completeQuizState));
    }
    localStorage.setItem('originalQuizState', JSON.stringify(completeQuizState));
    setTimeout(() => {
      const event = new CustomEvent('practice-failed-items', {
        detail: {
          failedItems: itemsForPractice,
          isPracticeMode: true,
          originalItems: items,
          originalAnswers: answers,
          showResultsAfterRound: true,
          practiceRound: completeQuizState.practiceRound
        }
      });
      window.dispatchEvent(event);
      setIsPreparingFailedItems(false);
    }, 500);
  };

  const failedItemsCount = items.length - score;

  // Show the corrected items dialog only when quiz is 100% complete (no failed items left)
  useEffect(() => {
    if (failedItemsCount === 0) {
      const corrected: QuizItem[] = [];
      const doneSet = getDoneItems();

      displayItems.forEach((item, index) => {
        const state = getAnswerState(index, item);
        if (state === 1 && !item.wasOriginallyCorrect) {
          // Corrected after failing — show dialog only if not already done
          if (!doneSet.has(item.barbarism)) {
            corrected.push(item);
          }
        }
      });

      if (corrected.length > 0) {
        setCorrectedPendingItems(corrected);
        setShowCorrectedDialog(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failedItemsCount]);

  const getOriginallyCorrectItems = () => {
    if (items[0]?.isPracticeItem) {
      try {
        const firstQuizStateString = localStorage.getItem('firstOriginalQuizState');
        const currentRound = parseInt(localStorage.getItem('practiceRound') || '1');
        const originalQuizStateString = currentRound > 1 && firstQuizStateString
          ? firstQuizStateString
          : localStorage.getItem('originalQuizState');
        if (originalQuizStateString) {
          const originalQuizState = JSON.parse(originalQuizStateString);
          if (originalQuizState?.items && originalQuizState?.answers) {
            const originalItems = originalQuizState.items;
            const originalAnswers = originalQuizState.answers;
            return originalItems
              .filter((originalItem: QuizItem, originalIndex: number) => {
                const originalAnswer = originalAnswers[originalIndex].toLowerCase().trim();
                const wasCorrect = originalItem.correctForms.some(
                  (form: string) => form.toLowerCase() === originalAnswer
                );
                const notInCurrentSet = !items.some(
                  currentItem => currentItem.barbarism === originalItem.barbarism
                );
                return wasCorrect && notInCurrentSet;
              })
              .map((item: QuizItem) => ({ ...item, wasOriginallyCorrect: true }));
          }
        }
      } catch (error) {
        // silently fail
      }
    }
    return [];
  };

  const getAllDisplayItems = () => {
    if (items[0]?.isPracticeItem) {
      const originallyCorrectItems = getOriginallyCorrectItems();
      if (originallyCorrectItems?.length > 0) {
        const currentItemsMap = new Map(items.map(item => [item.barbarism, item]));
        const filteredOriginalItems = originallyCorrectItems.filter(
          (origItem: QuizItem) => !currentItemsMap.has(origItem.barbarism)
        );
        return [...items, ...filteredOriginalItems];
      }
    }
    return items;
  };

  const displayItems = getAllDisplayItems();

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-4 md:p-6">

      {/* Dialog for orange (corrected) items */}
      {showCorrectedDialog && correctedPendingItems.length > 0 && (
        <div className={`modal-container ${isExitingDialog ? 'exiting' : ''}`}>
          <div className={`modal-content bg-white rounded-xl shadow-xl p-5 max-w-sm w-full ${isExitingDialog ? 'exiting' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <Squircle className="text-amber-500 flex-shrink-0" size={22} />
              <h3 className="text-base font-semibold text-gray-800">
                Registrar com a fets?
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Has corregit {correctedPendingItems.length} element{correctedPendingItems.length > 1 ? 's' : ''} després de fallar:
            </p>
            <ul className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mb-4 space-y-1 max-h-36 overflow-y-auto">
              {correctedPendingItems.map(item => (
                <li key={item.barbarism} className="flex items-center gap-1.5">
                  <Squircle size={12} className="flex-shrink-0" />
                  <span className="font-medium">{item.barbarism}</span>
                  <span className="text-gray-500">→ {item.correctForms[0]}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mb-4">
              Si els marques com a fets, podràs filtrar-los al quiz i al full d'estudi.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSkipCorrected}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Ometre
              </button>
              <button
                onClick={handleRegisterCorrected}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckSquare size={15} />
                Marcar com a fets
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-left md:text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Resultats del Quiz</h2>
        <div className="text-5xl font-bold text-red-600 mb-2">{percentage}%</div>
        <p className="text-gray-600 font-medium">{getResultMessage()}</p>
        <p className="text-sm text-gray-500 mt-1">Has encertat {score} de {items.length} preguntes</p>
      </div>

      <div className="mb-6">
        <h3 className="text-md font-semibold text-gray-700 mb-2">Resum de les teves respostes:</h3>
        <div className="divide-y divide-gray-100">
          {displayItems.map((item, index) => {
            const isOriginalItem = item.wasOriginallyCorrect;
            const answerState = isOriginalItem ? 2 : getAnswerState(index, item);

            let userAnswer = '';
            if (isOriginalItem) {
              try {
                const originalAnswers = JSON.parse(localStorage.getItem('originalQuizAnswers') || '[]');
                const originalItems = JSON.parse(localStorage.getItem('originalQuizItems') || '[]');
                const originalIndex = originalItems.findIndex((origItem: QuizItem) =>
                  origItem.barbarism === item.barbarism
                );
                if (originalIndex >= 0 && originalAnswers[originalIndex]) {
                  userAnswer = originalAnswers[originalIndex];
                } else {
                  userAnswer = item.correctForms[0] + ' (correcte)';
                }
              } catch {
                userAnswer = item.correctForms[0] + ' (correcte)';
              }
            } else {
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
                  <div className="font-medium text-gray-800">
                    {item.barbarism}
                    {item.isSeptetFunest && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Septet Funest
                      </span>
                    )}
                    {isOriginalItem && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Encert inicial
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    La teva resposta:{' '}
                    <span className={
                      answerState === 0 ? 'text-red-600' :
                        answerState === 1 ? 'text-amber-600' : 'text-green-600'
                    }>{userAnswer}</span>
                  </div>
                  {answerState === 0 && (
                    <div className="text-sm text-gray-600">
                      Formes correctes: {item.correctForms.join(', ')}
                    </div>
                  )}
                  {(answerState === 1 || answerState === 2) && (
                    <div className="text-sm text-gray-600">
                      Forma correcta: {item.correctForms[0]}
                      {item.correctForms.length > 1 && (
                        <span className="text-xs text-gray-500 ml-1">
                          (també: {item.correctForms.slice(1).join(', ')})
                        </span>
                      )}
                    </div>
                  )}
                  {item.hint && (
                    <div className="text-xs text-gray-500 mt-1 italic">{item.hint}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-xs bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center mb-1">
            <Check className="text-green-500 mr-2" size={14} />
            <span>Correctes a la primera</span>
          </div>
          <div className="flex items-center mb-1">
            <Squircle className="text-amber-500 mr-2" size={14} />
            <span>Corregides després</span>
          </div>
          <div className="flex items-center">
            <X className="text-red-500 mr-2" size={14} />
            <span>Incorrectes</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {failedItemsCount > 0 && (
          <button
            onClick={handlePracticeFailedItems}
            disabled={isPreparingFailedItems}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            {isPreparingFailedItems ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Preparant...</span>
              </>
            ) : (
              <span>
                {items[0]?.isPracticeItem
                  ? `Continuar practicant els ${failedItemsCount} barbarismes fallats`
                  : `Practicar els ${failedItemsCount} barbarismes fallats`}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => {
            setTimeout(() => { onRestart(); }, 10);
          }}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300"
        >
          Començar una nova sessió
        </button>
      </div>
    </div>
  );
}
