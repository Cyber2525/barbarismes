import { useEffect, useState, useRef } from 'react';
import './index.css';
import { QuizItem, QuizState, QuizMode } from './types/quiz';
import { getRandomQuizItems } from './data/quizData';
import { QuizQuestion } from './components/QuizQuestion';
import { QuizProgress } from './components/QuizProgress';
import { QuizResults } from './components/QuizResults';
import { QuizSettings } from './components/QuizSettings';
import { QuizModeSelection } from './components/QuizModeSelection';
import { GameSettingsWidget } from './components/GameSettingsWidget';
import { StudySheet } from './components/StudySheet';
import { DialectStudySheet } from './components/DialectStudySheet';
import { DialectQuiz } from './components/DialectQuiz';
import { OfflineButton } from './components/OfflineButton';
import { BookOpen, Globe, Languages, Menu, Pencil, X } from 'lucide-react';

// Default quiz size
const DEFAULT_QUIZ_SIZE = 20;

export function App() {
  const [appSection, setAppSection] = useState<'barbarismes' | 'dialectes'>(() => {
    const savedSection = localStorage.getItem('appSection');
    return (savedSection as 'barbarismes' | 'dialectes') || 'barbarismes';
  });

  const [quizSize, setQuizSize] = useState<number>(() => {
    const savedSize = localStorage.getItem('quizSize');
    return savedSize ? parseInt(savedSize) : DEFAULT_QUIZ_SIZE;
  });
  
  const [quizMode, setQuizMode] = useState<QuizMode>(() => {
    const savedMode = localStorage.getItem('quizMode');
    return (savedMode as QuizMode) || 'tots';
  });
  
  const [quizState, setQuizState] = useState<QuizState>({
    items: [],
    currentIndex: 0,
    score: 0,
    answers: [],
    completed: false,
    isPracticeMode: false,
    originalFailedItems: []
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Single study mode state for both content types
  const [isStudyMode, setIsStudyMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('isStudyMode');
    return saved === 'true';
  });
  
  // Save study mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('isStudyMode', isStudyMode.toString());
  }, [isStudyMode]);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Initialize quiz
  useEffect(() => {
    startNewQuiz();
    // Ensure quiz state is reset properly after any update to these dependencies
    setQuizState(prevState => ({
      ...prevState,
      completed: false
    }));
  }, [quizSize, quizMode]);
  
  // Listen for practice failed items event
  useEffect(() => {
    const handlePracticeFailedItems = (event: CustomEvent) => {
      const { failedItems, isPracticeMode, originalItems, originalAnswers, showResultsAfterRound } = event.detail;
      if (failedItems && failedItems.length > 0) {
        // Store original items and answers in localStorage to access them later
        if (originalItems) {
          // We've already stored the full state in QuizResults component,
          // but we'll keep this for backward compatibility
          localStorage.setItem('originalQuizItems', JSON.stringify(originalItems));
          
          // Also store original answers if available
          if (originalAnswers) {
            localStorage.setItem('originalQuizAnswers', JSON.stringify(originalAnswers));
          }
        }
        
        // Ensure quizState is reset properly to show questions
        setQuizState(prevState => ({
          ...prevState,
          completed: false
        }));
        
        // Small delay to ensure state updates before starting new quiz
        setTimeout(() => {
          startNewQuiz(failedItems, isPracticeMode);
        }, 50);
      }
    };
    
    window.addEventListener('practice-failed-items', handlePracticeFailedItems as EventListener);
    
    return () => {
      window.removeEventListener('practice-failed-items', handlePracticeFailedItems as EventListener);
    };
  }, []);
  
  // Save quiz size to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('quizSize', quizSize.toString());
  }, [quizSize]);
  
  // Save quiz mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('quizMode', quizMode);
  }, [quizMode]);
  
  // Save app section to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('appSection', appSection);
  }, [appSection]);
  
  // This effect is now handled above
  
  // Listen for hash changes to handle dialect quiz navigation
  useEffect(() => {
    const handleHashChange = () => {
      // Force re-render when hash changes
      setAppSection(prev => {
        if (prev === 'dialectes') {
          // Just trigger a re-render
          return prev;
        }
        return prev;
      });
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const startNewQuiz = (specificItems?: QuizItem[], isPracticeMode: boolean = false) => {
    setIsLoading(true);
    
    // Force quiz completed state to false immediately to ensure UI update
    setQuizState(prevState => ({
      ...prevState,
      completed: false
    }));
    
    // Simulate loading for a smoother transition
    setTimeout(() => {
      // Use provided items if available, otherwise generate random items
      let quizItems = specificItems || getRandomQuizItems(quizSize, quizMode);
      
      // If specific items are provided and it's practice mode, preserve their practice state
      if (specificItems && isPracticeMode) {
        quizItems = quizItems.map(item => {
          // Preserve existing practice indicators if they exist
          return {
            ...item,
            isPracticeItem: true,
            // Ensure these flags are preserved if they already exist
            wasCorrectInLastRound: item.wasCorrectInLastRound || false,
            previouslyCorrectInPractice: item.previouslyCorrectInPractice || false
          };
        });
      }
      
      // If we're starting a new regular quiz (not practice mode), clear any stored original items
      if (!isPracticeMode) {
        localStorage.removeItem('originalQuizItems');
        localStorage.removeItem('originalQuizAnswers');
        localStorage.removeItem('originalQuizState');
        localStorage.removeItem('firstOriginalQuizState');
        localStorage.removeItem('practiceRound');
      }
      
      setQuizState({
        items: quizItems,
        currentIndex: 0,
        score: 0,
        answers: new Array(quizItems.length).fill(''),
        completed: false,
        isPracticeMode: isPracticeMode,
        originalFailedItems: isPracticeMode ? [...quizItems] : []
      });
      setIsLoading(false);
    }, 1000);
  };

  const handleAnswer = (answer: string, isCorrect: boolean) => {
    const updatedState = { ...quizState };
    updatedState.answers[quizState.currentIndex] = answer;
    
    if (isCorrect) {
      updatedState.score += 1;
    }
    
    // Update state immediately without moving to next question
    setQuizState(updatedState);
  };
  
  const handleContinue = () => {
    const updatedState = { ...quizState };
    
    if (quizState.currentIndex < quizState.items.length - 1) {
      updatedState.currentIndex += 1;
      setQuizState(updatedState);
    } else {
      // Mark the quiz as completed to show results
      updatedState.completed = true;
      setQuizState(updatedState);
      return;
      
      // Otherwise, mark as completed normally
      updatedState.completed = true;
      setQuizState(updatedState);
    }
  };
  
  const handleQuizSizeChange = (size: number) => {
    if (size !== quizSize) {
      setQuizSize(size);
      // The quiz will restart due to the useEffect dependency on quizSize
    }
  };
  
  const handleQuizModeChange = (mode: QuizMode) => {
    if (mode !== quizMode) {
      setQuizMode(mode);
      // The quiz will restart due to the useEffect dependency on quizMode
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-yellow-50 to-red-100 flex flex-col items-center justify-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute h-16 w-16 rounded-full animate-spin bg-gradient-to-b from-red-600 to-transparent"></div>
          <div className="absolute flex items-center justify-center bg-white rounded-full h-14 w-14">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4V6M12 18V20M6 12H4M20 12H18M18.364 5.636L16.95 7.05M7.05 16.95L5.636 18.364M7.05 7.05L5.636 5.636M18.364 18.364L16.95 16.95" 
                stroke="#C8102E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-red-800">Mots Correctes</h1>
        <p className="text-red-600 mt-2">Preparant el teu quiz...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-red-100 py-6 md:py-8 px-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="container mx-auto">
        <header className="flex flex-col items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center mb-4 w-full justify-between">
            <div className="flex items-center">
              <button 
                className="md:hidden mr-3 p-2 text-red-800 hover:bg-red-100 rounded-lg"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-red-800">Català Correcte</h1>
                <p className="text-sm md:text-base text-red-600 text-left">Aprèn català amb les nostres eines</p>
              </div>
            </div>
          </div>
          
          {/* App Section Selector */}
          <div className="flex flex-wrap justify-center gap-3 mb-4 w-full">
            <button 
              onClick={() => setAppSection('barbarismes')} 
              className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-colors ${
                appSection === 'barbarismes' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
              }`}
            >
              <Languages size={18} />
              <span>Barbarismes</span>
            </button>
            <button 
              onClick={() => setAppSection('dialectes')} 
              className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-colors ${
                appSection === 'dialectes' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
              }`}
            >
              <Globe size={18} />
              <span>Dialectes</span>
            </button>
          </div>
          
          {/* Mode Selector - Show for both sections */}
          <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex items-center justify-center flex-row space-x-2 md:space-x-4 w-full md:w-auto`}>
            <button 
              onClick={() => setIsStudyMode(false)} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                !isStudyMode 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-red-600 hover:bg-red-50'
              }`}
            >
              <Pencil size={18} />
              <span>Mode Quiz</span>
            </button>
            <button 
              onClick={() => setIsStudyMode(true)} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isStudyMode 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-red-600 hover:bg-red-50'
              }`}
            >
              <BookOpen size={18} />
              <span>Mode Estudi</span>
            </button>
          </div>
        </header>

        <main className="flex flex-col items-center">
          {appSection === 'dialectes' ? (
            window.location.hash === 'dialect-quiz' ?
              <DialectQuiz onBack={() => window.location.hash = ''} /> :
              isStudyMode ?
                <DialectStudySheet onBack={() => {
                  // This function will be called when navigating back to quiz from study mode
                  window.location.hash = 'dialect-quiz';
                  setIsStudyMode(false);
                }} /> :
                <DialectQuiz onBack={() => setAppSection('barbarismes')} />
          ) : (
            <>
              {isStudyMode ? (
                <StudySheet 
                  mode={quizMode} 
                  onBack={() => setIsStudyMode(false)} 
                />
              ) : (
                <>
                  {!quizState.completed ? (
                    <>
                      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-4 mb-6">
                        <QuizProgress 
                          current={quizState.currentIndex} 
                          total={quizState.items.length}
                          score={quizState.score} 
                        />
                      </div>
                      
                      {quizState.items.length > 0 && (
                        <QuizQuestion 
                          item={quizState.items[quizState.currentIndex]} 
                          onAnswer={handleAnswer}
                          onContinue={handleContinue}
                          onRestart={startNewQuiz}
                          answered={quizState.answers[quizState.currentIndex] !== ''}
                        />
                      )}
                      
                      <div className="w-full mb-6 mt-6">
                        <GameSettingsWidget
                          selectedMode={quizMode}
                          onSelectMode={handleQuizModeChange}
                          currentSize={quizSize}
                          onSelectQuizSize={handleQuizSizeChange}
                        />
                      </div>
                    </>
                  ) : (
                    <QuizResults 
                      items={quizState.items} 
                      answers={quizState.answers} 
                      score={quizState.score} 
                      onRestart={startNewQuiz} 
                    />
                  )}
                </>
              )}
            </>
          )}
        </main>

        <footer className="text-center mt-8 md:mt-12 flex flex-col items-center">
          <OfflineButton />
          <p className="mt-4 text-sm text-red-400 text-left md:text-center">© 2026 Estudiar Català CSI - Colegio Sant Ignacio - El 10, hecho posible por VICTOR DE NADAL</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
