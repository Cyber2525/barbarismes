import React, { useState, useEffect } from 'react';
import { dialectGroups, dialectItems } from '../data/dialectData';
import { ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, X } from 'lucide-react';
import { DialectQuestion, DialectQuizMode, DialectQuizType } from '../types/dialect';

interface DialectQuizProps {
  onBack: () => void;
}

export function DialectQuiz({ onBack }: DialectQuizProps) {
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizMode, setQuizMode] = useState<DialectQuizMode>('single');
  const [quizType, setQuizType] = useState<DialectQuizType>('dialect');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<DialectQuestion[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizSize, setQuizSize] = useState(10);
  const [randomSeed, setRandomSeed] = useState<number>(Math.random());

  // Generate questions when quiz parameters change or app reloads
  useEffect(() => {
    if (quizStarted) {
      const newQuestions = generateQuestions(quizType, quizSize);
      setQuestions(newQuestions);
      resetQuiz();
    }
  }, [quizStarted, quizType, quizSize]);
  
  // Add a reload effect to ensure new random sequence on each app load
  useEffect(() => {
    // Force randomness on component mount by setting a new random seed
    setRandomSeed(Math.random());
  }, []);

  const resetQuiz = () => {
    setCurrentIndex(0);
    setScore(0);
    setAnswered(false);
    setSelectedOptions([]);
    setIsCorrect(false);
    setIsAnswered(false);
    setQuizCompleted(false);
  };

  const generateQuestions = (type: DialectQuizType, size: number): DialectQuestion[] => {
    let questions: DialectQuestion[] = [];
    
    if (type === 'bloc') {
      // Generate bloc identification questions
      const traits = [...dialectGroups[0].characteristics, ...dialectGroups[1].characteristics];
      const shuffledTraits = shuffleArray([...traits]);
      
      // Create questions about bloc identification based on traits
      for (let i = 0; i < shuffledTraits.length && questions.length < size; i++) {
        const trait = shuffledTraits[i];
        // Determine which bloc this trait belongs to
        const isOriental = dialectGroups[0].characteristics.includes(trait);
        const correctBloc = isOriental ? 'oriental' : 'occidental';
        
        // Randomize option order
        const options = shuffleArray(['oriental', 'occidental']);
        
        // Determine if this trait is about pronunciation
        const isPronunciation = trait.includes('pronunci') || 
                                trait.includes('vocal') || 
                                trait.includes('fonema') ||
                                trait.includes('neutralitz');
        
        questions.push({
          id: `bloc-${i}`,
          type: 'bloc',
          prompt: `A quin bloc dialectal pertany aquest tret?`,
          content: trait,
          options: options,
          correctAnswer: correctBloc,
          multipleCorrect: false,
          explanation: `Aquest tret és característic del bloc ${correctBloc}.`,
          isPronunciation: isPronunciation
        });
      }
      
      // If we don't have enough questions from traits, add some based on dialect examples
      if (questions.length < size) {
        const examples = dialectItems.flatMap(dialect => 
          dialect.examples.map(ex => ({
            text: ex.dialectText,
            standard: ex.standardText,
            dialectId: dialect.id,
            group: dialect.group
          }))
        );
        
        const shuffledExamples = shuffleArray([...examples]);
        
        for (let i = 0; i < shuffledExamples.length && questions.length < size; i++) {
          const example = shuffledExamples[i];
          // Randomize option order
          const options = shuffleArray(['oriental', 'occidental']);
          
          questions.push({
            id: `bloc-example-${i}`,
            type: 'bloc',
            prompt: `A quin bloc dialectal pertany aquest exemple?`,
            content: example.text,
            additionalInfo: `Català estàndard: "${example.standard}"`,
            options: options,
            correctAnswer: example.group,
            multipleCorrect: false,
            explanation: `Aquesta expressió és característica del bloc ${example.group}.`,
            isPronunciation: example.text.includes('cantu') || 
                             example.text.includes('canti') || 
                             example.text.includes('aigo') || 
                             example.text.includes('famili') ||
                             example.text.includes('histori')
          });
        }
      }
    } else {
      // Generate dialect-specific questions
      const allDialects = [...dialectItems];
      const shuffledDialects = shuffleArray([...allDialects]);
      
      // Questions to identify dialects based on characteristics
      for (let i = 0; i < shuffledDialects.length && questions.length < size; i++) {
        const dialect = shuffledDialects[i];
        
        if (dialect.characteristics.length > 0) {
          // Randomly select a characteristic to use for the question
          const charIndex = Math.floor(Math.random() * dialect.characteristics.length);
          const characteristic = dialect.characteristics[charIndex];
          
          // Create all dialects as options and shuffle them
          const dialectOptions = shuffleArray(dialectItems.map(d => d.name));
          
          questions.push({
            id: `dialect-char-${i}`,
            type: 'dialect',
            prompt: `A quin dialecte pertany aquesta característica?`,
            content: characteristic,
            options: dialectOptions,
            correctAnswer: dialect.name,
            multipleCorrect: false,
            explanation: `Aquesta característica és pròpia del dialecte ${dialect.name}.`
          });
        }
        
        // If the dialect has examples, create a question from an example
        if (dialect.examples.length > 0 && questions.length < size) {
          const exIndex = Math.floor(Math.random() * dialect.examples.length);
          const example = dialect.examples[exIndex];
          
          // Create all dialects as options and shuffle them
          const dialectOptions = shuffleArray(dialectItems.map(d => d.name));
          
          questions.push({
            id: `dialect-example-${i}`,
            type: 'dialect',
            prompt: `A quin dialecte pertany aquesta expressió?`,
            content: example.dialectText,
            additionalInfo: `Català estàndard: "${example.standardText}"`,
            options: dialectOptions,
            correctAnswer: dialect.name,
            multipleCorrect: false,
            explanation: `Aquesta expressió és característica del dialecte ${dialect.name}.`,
            isPronunciation: example.isPronunciation || false
          });
        }
      }
      
      // For multiple selection questions (identifying multiple traits)
      if (questions.length < size) {
        const shuffledDialects2 = shuffleArray([...allDialects]);
        
        for (let i = 0; i < shuffledDialects2.length && questions.length < size; i++) {
          const dialect = shuffledDialects2[i];
          
          if (dialect.characteristics.length >= 3) {
            // Create a question where multiple traits belong to a dialect
            const correctTraits = shuffleArray([...dialect.characteristics]).slice(0, 3);
            
            // Find some incorrect traits (from other dialects)
            const otherDialects = allDialects.filter(d => d.id !== dialect.id);
            const incorrectTraits = otherDialects
              .flatMap(d => d.characteristics)
              .filter(c => !correctTraits.includes(c));
            
            // Combine correct and incorrect traits and shuffle
            const allTraits = [...correctTraits, ...shuffleArray(incorrectTraits).slice(0, 3)];
            const options = shuffleArray(allTraits);
            
            questions.push({
              id: `dialect-multi-${i}`,
              type: 'dialect',
              prompt: `Quines característiques pertanyen al dialecte ${dialect.name}?`,
              content: `Selecciona totes les característiques que pertanyen al dialecte ${dialect.name}.`,
              options: options,
              correctAnswer: correctTraits,
              multipleCorrect: true,
              explanation: `Aquestes característiques són pròpies del dialecte ${dialect.name}.`
            });
          }
        }
      }
    }
    
    // Ensure we have the requested number of questions (or less if not enough data)
    const finalQuestions = shuffleArray(questions).slice(0, size);
    
    // Make some questions multi-select even if they're not naturally multi-answer
    // This is only if quizMode is 'multiple' - we'll convert some single-answer questions
    if (quizMode === 'multiple') {
      finalQuestions.forEach(q => {
        // Only convert bloc questions or dialect identification questions
        if (!q.multipleCorrect && Math.random() > 0.5) {
          // Add additional correct answers for variety (only for certain question types)
          if (q.type === 'bloc' && Array.isArray(q.options)) {
            q.multipleCorrect = true;
            
            // For bloc questions, we sometimes want to allow both as correct
            // (when a trait is shared between blocs)
            if (Math.random() > 0.8) {
              q.correctAnswer = q.options;
              q.explanation = "Aquest tret és compartit pels dos blocs dialectals.";
            }
          }
        }
      });
    }
    
    return finalQuestions;
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const arrayCopy = [...array];
    for (let i = arrayCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
    }
    return arrayCopy;
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setQuizCompleted(false);
  };

  const handleOptionChange = (option: string) => {
    if (answered) return;

    if (quizMode === 'single') {
      setSelectedOptions([option]);
    } else {
      // Toggle selection for multiple choice
      setSelectedOptions(prev => 
        prev.includes(option) 
          ? prev.filter(o => o !== option) 
          : [...prev, option]
      );
    }
  };

  const checkAnswer = () => {
    if (questions.length === 0 || answered) return;
    
    const currentQuestion = questions[currentIndex];
    let correct = false;
    
    if (currentQuestion.multipleCorrect) {
      // For multi-select questions, check if selected options match the correct answers
      const correctAnswers = Array.isArray(currentQuestion.correctAnswer) 
        ? currentQuestion.correctAnswer 
        : [currentQuestion.correctAnswer];
      
      // All correct options must be selected, and no incorrect ones
      const allCorrectSelected = correctAnswers.every(answer => selectedOptions.includes(answer));
      const noIncorrectSelected = selectedOptions.every(selected => correctAnswers.includes(selected));
      
      correct = allCorrectSelected && noIncorrectSelected;
    } else {
      // For single-select questions
      correct = selectedOptions.length === 1 && selectedOptions[0] === currentQuestion.correctAnswer;
    }
    
    if (correct) {
      setScore(prev => prev + 1);
    }
    
    setIsCorrect(correct);
    setAnswered(true);
    setIsAnswered(true);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOptions([]);
      setAnswered(false);
      setIsCorrect(false);
      setIsAnswered(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const CurrentQuestion = () => {
    if (questions.length === 0 || currentIndex >= questions.length) {
      return <div className="text-center p-4">No hi ha prou preguntes disponibles.</div>;
    }

    const question = questions[currentIndex];
    const options = question.options;
    
    return (
      <div className="w-full">
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">{question.prompt}</h3>
          <p className="text-gray-700 p-3 bg-yellow-50 rounded-lg">
              {question.isPronunciation ? (
                <>pronuncia: {question.content}</>
              ) : (
                <>{question.content}</>
              )}
            </p>
            {question.isPronunciation && (
              <div className="text-xs text-amber-600 mt-1 italic">
                <span className="font-medium">Nota:</span> Aquesta és la forma parlada, representa la pronunciació, no l'escriptura.
              </div>
            )}
          {question.additionalInfo && (
            <p className="text-sm text-gray-500 mt-2 italic">{question.additionalInfo}</p>
          )}
        </div>
        
        <div className="space-y-3 mb-6">
          {Array.isArray(options) && options.map((option, index) => (
            <div 
              key={index}
              onClick={() => handleOptionChange(option)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedOptions.includes(option)
                  ? answered
                    ? isCorrect
                      ? 'bg-green-100 border-green-300'
                      : Array.isArray(question.correctAnswer)
                        ? question.correctAnswer.includes(option)
                          ? 'bg-green-100 border-green-300'
                          : 'bg-red-100 border-red-300'
                        : option === question.correctAnswer
                          ? 'bg-green-100 border-green-300'
                          : 'bg-red-100 border-red-300'
                    : 'bg-red-50 border-red-300'
                  : answered && (
                    Array.isArray(question.correctAnswer)
                      ? question.correctAnswer.includes(option)
                        ? 'bg-green-100 border-green-300'
                        : 'border-gray-200'
                      : option === question.correctAnswer
                        ? 'bg-green-100 border-green-300'
                        : 'border-gray-200'
                  )
              }`}
            >
              <div className="flex items-center">
                <div className={`w-6 h-6 flex-shrink-0 rounded-full border mr-3 flex items-center justify-center ${
                  selectedOptions.includes(option)
                    ? answered
                      ? isCorrect
                        ? 'bg-green-600 border-green-600 text-white' // Selected and correct
                        : 'bg-red-600 border-red-600 text-white'     // Selected but incorrect
                      : 'bg-red-600 border-red-600 text-white'       // Selected but not yet answered
                    : 'border-gray-300'                              // Not selected
                }`}>
                  {selectedOptions.includes(option) && (
                    quizMode === 'single' ? <ChevronRight size={14} /> : <Check size={14} />
                  )}
                </div>
                <span className="text-gray-800">{option}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className={`expandable-content ${answered ? 'expanded' : ''}`}>
            <div className={`p-4 rounded-lg mb-6 ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="flex items-start">
                {isCorrect ? 
                  <Check className="text-green-600 mt-0.5 mr-2" size={18} /> : 
                  <X className="text-red-600 mt-0.5 mr-2" size={18} />
                }
                <div>
                  <p className={`font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {isCorrect ? 'Correcte!' : 'Incorrecte'}
                  </p>
                  <p className="text-gray-700 text-sm mt-1">{questions[currentIndex].explanation}</p>
                </div>
              </div>
            </div>
          </div>
        
        <div className="flex justify-between">
          {!answered ? (
            <button
              onClick={checkAnswer}
              disabled={selectedOptions.length === 0}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-all duration-300 disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              Comprovar
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-all duration-300 flex items-center gap-2"
            >
              {currentIndex < questions.length - 1 ? 'Següent pregunta' : 'Veure resultats'}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const QuizResults = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-50 mb-4">
          <div className="text-3xl font-bold text-red-600">{score}/{questions.length}</div>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Has obtingut {score} de {questions.length} punts
        </h3>
        <p className="text-gray-600">
          {score === questions.length 
            ? 'Perfecte! Ets un expert en dialectes catalans!'
            : score > questions.length / 2 
              ? 'Bon resultat! Coneixes bé els dialectes catalans.'
              : 'Segueix practicant per millorar el teu coneixement dels dialectes catalans.'}
        </p>
      </div>
      
      <div className="flex flex-col gap-3 mt-6">
        <button
          onClick={() => {
            resetQuiz();
            setCurrentIndex(0);
          }}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
        >
          <CircleHelp size={18} />
          Fer una altra prova
        </button>
        <button
          onClick={() => {
            resetQuiz();
            setQuizStarted(false);
          }}
          className="bg-white hover:bg-gray-50 text-red-600 border border-red-200 font-medium py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
        >
          <BookOpen size={18} />
          Canviar la configuració
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-red-800">
          {quizStarted ? 'Quiz de Dialectes Catalans' : 'Configuració del Quiz'}
        </h2>
        <div className="flex gap-2">
          {window.location.hash === 'dialect-quiz' && (
            <button
              onClick={() => {
                // Just update the hash, parent component will handle mode switching
                window.location.hash = '';
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300"
            >
              Mode Estudi
            </button>
          )}
        </div>
      </div>
      
      {!quizStarted ? (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tipus de preguntes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setQuizMode('single')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                  quizMode === 'single' 
                    ? 'border-red-600 bg-red-50' 
                    : 'border-gray-200 hover:border-red-200'
                }`}
              >
                <h4 className="font-medium text-gray-800 mb-2">Selecció única</h4>
                <p className="text-sm text-gray-600">Selecciona una sola resposta correcta per cada pregunta.</p>
              </div>
              <div
                onClick={() => setQuizMode('multiple')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                  quizMode === 'multiple' 
                    ? 'border-red-600 bg-red-50' 
                    : 'border-gray-200 hover:border-red-200'
                }`}
              >
                <h4 className="font-medium text-gray-800 mb-2">Selecció múltiple</h4>
                <p className="text-sm text-gray-600">Selecciona totes les respostes correctes per cada pregunta.</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tema del quiz</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setQuizType('bloc')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                  quizType === 'bloc' 
                    ? 'border-red-600 bg-red-50' 
                    : 'border-gray-200 hover:border-red-200'
                }`}
              >
                <h4 className="font-medium text-gray-800 mb-2">Blocs dialectals</h4>
                <p className="text-sm text-gray-600">Identificar si un tret pertany al bloc Oriental o Occidental.</p>
              </div>
              <div
                onClick={() => setQuizType('dialect')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                  quizType === 'dialect' 
                    ? 'border-red-600 bg-red-50' 
                    : 'border-gray-200 hover:border-red-200'
                }`}
              >
                <h4 className="font-medium text-gray-800 mb-2">Dialectes específics</h4>
                <p className="text-sm text-gray-600">Identificar a quin dialecte pertany un tret o característica.</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Nombre de preguntes</h3>
            <div className="flex flex-wrap gap-3">
              {[5, 10, 15, 20].map(num => (
                <button
                  key={num}
                  onClick={() => setQuizSize(num)}
                  className={`py-2 px-5 rounded-lg transition-colors transform hover:scale-[1.02] active:scale-[0.98] ${
                    quizSize === num 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={startQuiz}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 mt-8 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Començar Quiz
          </button>
        </div>
      ) : (
        <div>
          {!quizCompleted ? (
            <div className="space-y-6">
              <div className="w-full bg-gray-200 h-2 rounded-full mb-6">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${((currentIndex + (answered ? 1 : 0)) / questions.length) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mb-4">
                <span>Pregunta {currentIndex + 1} de {questions.length}</span>
                <span>Puntuació: {score}/{currentIndex + (answered ? 1 : 0)}</span>
              </div>
              
              <CurrentQuestion />
            </div>
          ) : (
            <QuizResults />
          )}
        </div>
      )}
    </div>
  );
}

export default DialectQuiz;
