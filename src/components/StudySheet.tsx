import React, { useState, useEffect, useCallback } from 'react';
import { quizData } from '../data/quizData';
import { AlignJustify, ArrowDownAZ, ArrowDownZA, ArrowUpDown, Book, BookOpen, CheckSquare, ChevronDown, ChevronUp, FileWarning, MessageSquareQuote, RefreshCw, Search, SlidersHorizontal, Square, Tags, X } from 'lucide-react';
import { QuizMode } from '../types/quiz';
import { scrollToTop } from '../utils/scrollHelper';
import { getDoneItems, toggleDone, PROGRESS_UPDATED_EVENT } from '../utils/doneItems';

// Helper function to remove accents from a character
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

interface StudySheetProps {
  mode: QuizMode;
  onBack: () => void;
}

type SortOption = 'alphabetical-asc' | 'type' | 'septet-funest' | 'complexity' | 'random' | 'done-first' | 'done-last';
type DoneFilter = 'all' | 'done' | 'not-done';

export function StudySheet({ mode: initialMode, onBack }: StudySheetProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const savedSort = localStorage.getItem('studySheetSort');
    return (savedSort as SortOption) || 'alphabetical-asc';
  });
  const [doneFilter, setDoneFilter] = useState<DoneFilter>('all');
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [currentMode, setCurrentMode] = useState<QuizMode>(initialMode);
  const [randomSeed, setRandomSeed] = useState<number>(Math.random());
  const [doneItems, setDoneItems] = useState<Set<string>>(() => getDoneItems());

  // Save sort preference when it changes
  useEffect(() => {
    localStorage.setItem('studySheetSort', sortBy);
  }, [sortBy]);

  // Refresh done items from localStorage (in case they changed from quiz or cloud sync)
  useEffect(() => {
    setDoneItems(getDoneItems());
    
    // Listen for progress updates from cloud sync/import
    const handleProgressUpdate = () => {
      setDoneItems(getDoneItems());
    };
    window.addEventListener(PROGRESS_UPDATED_EVENT, handleProgressUpdate);
    return () => window.removeEventListener(PROGRESS_UPDATED_EVENT, handleProgressUpdate);
  }, []);

  const handleToggleDone = useCallback((barbarism: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleDone(barbarism);
    setDoneItems(getDoneItems());
  }, []);

  // Filter data based on mode and search term
  let filteredData = [...quizData];

  if (currentMode === 'barbarismes') {
    filteredData = filteredData.filter(item => item.type === 'barbarisme');
  } else if (currentMode === 'frases') {
    filteredData = filteredData.filter(item => item.type === 'frase');
  }

  // Done filter
  if (doneFilter === 'done') {
    filteredData = filteredData.filter(item => doneItems.has(item.barbarism));
  } else if (doneFilter === 'not-done') {
    filteredData = filteredData.filter(item => !doneItems.has(item.barbarism));
  }

  // Search functionality
  if (searchTerm) {
    const term = removeAccents(searchTerm.toLowerCase());
    filteredData = filteredData.filter(item =>
      removeAccents(item.barbarism.toLowerCase()).includes(term) ||
      item.correctForms.some(form => removeAccents(form.toLowerCase()).includes(term))
    );
  }

  // Sort data based on selected sort option
  filteredData.sort((a, b) => {
    switch (sortBy) {
      case 'alphabetical-asc':
        return a.barbarism.localeCompare(b.barbarism);

      case 'type': {
        const typeA = a.type || 'barbarisme';
        const typeB = b.type || 'barbarisme';
        if (typeA !== typeB) return typeA.localeCompare(typeB);
        return a.barbarism.localeCompare(b.barbarism);
      }

      case 'septet-funest':
        if (a.isSeptetFunest && !b.isSeptetFunest) return -1;
        if (!a.isSeptetFunest && b.isSeptetFunest) return 1;
        return a.barbarism.localeCompare(b.barbarism);

      case 'complexity': {
        const diff = b.correctForms.length - a.correctForms.length;
        if (diff !== 0) return diff;
        return a.barbarism.localeCompare(b.barbarism);
      }

      case 'done-first': {
        const aDone = doneItems.has(a.barbarism);
        const bDone = doneItems.has(b.barbarism);
        if (aDone && !bDone) return -1;
        if (!aDone && bDone) return 1;
        return a.barbarism.localeCompare(b.barbarism);
      }

      case 'done-last': {
        const aDone = doneItems.has(a.barbarism);
        const bDone = doneItems.has(b.barbarism);
        if (!aDone && bDone) return -1;
        if (aDone && !bDone) return 1;
        return a.barbarism.localeCompare(b.barbarism);
      }

      case 'random': {
        const randomValueA = Math.sin(randomSeed * (
          a.barbarism.length +
          a.correctForms.length +
          (a.isSeptetFunest ? 7 : 3) +
          a.barbarism.charCodeAt(Math.min(0, a.barbarism.length - 1))
        ));
        const randomValueB = Math.sin(randomSeed * (
          b.barbarism.length +
          b.correctForms.length +
          (b.isSeptetFunest ? 7 : 3) +
          b.barbarism.charCodeAt(Math.min(0, b.barbarism.length - 1))
        ));
        return randomValueA - randomValueB;
      }

      default:
        return a.barbarism.localeCompare(b.barbarism);
    }
  });

  const refreshRandomOrder = () => {
    setRandomSeed(Math.random());
  };

  const toggleItemExpand = (barbarism: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [barbarism]: !prev[barbarism]
    }));
  };

  const isAlphabeticalSort = sortBy === 'alphabetical-asc';
  const isRandomSort = sortBy === 'random';
  const groupedData: Record<string, typeof filteredData> = {};
  let letters: string[] = [];

  if (isAlphabeticalSort) {
    filteredData.forEach(item => {
      const firstLetterWithAccent = item.barbarism[0].toUpperCase();
      const firstLetter = removeAccents(firstLetterWithAccent);
      if (!groupedData[firstLetter]) groupedData[firstLetter] = [];
      groupedData[firstLetter].push(item);
    });
    letters = Object.keys(groupedData).sort();
  } else {
    groupedData['all'] = filteredData;
    letters = ['all'];
  }

  const totalItems = filteredData.length;
  const doneCount = filteredData.filter(item => doneItems.has(item.barbarism)).length;
  const septetFunestCount = filteredData.filter(item => item.isSeptetFunest).length;
  const barbarismsCount = filteredData.filter(item => item.type === 'barbarisme').length;
  const phrasesCount = filteredData.filter(item => item.type === 'frase').length;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-red-800">Full d'Estudi</h2>
        {doneCount > 0 && (
          <span className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
            {doneCount} / {quizData.filter(i => currentMode === 'tots' ? true : i.type === currentMode.slice(0, -1) + (currentMode === 'barbarismes' ? 'barbarisme' : 'frase')).length || totalItems} fets
          </span>
        )}
      </div>

      {/* Mode Selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <button
          onClick={() => setCurrentMode('tots')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            currentMode === 'tots'
              ? 'bg-red-600 text-white'
              : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
          }`}
        >
          <BookOpen size={16} />
          <span>Tot</span>
        </button>
        <button
          onClick={() => setCurrentMode('barbarismes')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            currentMode === 'barbarismes'
              ? 'bg-red-600 text-white'
              : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
          }`}
        >
          <Book size={16} />
          <span>Paraules</span>
        </button>
        <button
          onClick={() => setCurrentMode('frases')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            currentMode === 'frases'
              ? 'bg-red-600 text-white'
              : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
          }`}
        >
          <MessageSquareQuote size={16} />
          <span>Frases</span>
        </button>
      </div>

      <div className="mb-6 space-y-3">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca paraules o expressions..."
            className="w-full px-4 py-3 pl-10 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-red-300 focus:outline-none"
          />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div>
          <button
            onClick={() => setFilterExpanded(!filterExpanded)}
            className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
              filterExpanded
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <SlidersHorizontal size={16} />
            <span>Opcions d'ordenació i filtrat</span>
            {filterExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {filterExpanded && (
            <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4">

              {/* Done filter */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-2">Filtrar per estat:</h4>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: 'all', label: 'Tots' },
                      { value: 'done', label: 'Fets' },
                      { value: 'not-done', label: 'No fets' },
                    ] as { value: DoneFilter; label: string }[]
                  ).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDoneFilter(opt.value)}
                      className={`flex items-center gap-1.5 py-1.5 px-3 text-sm rounded-md transition-colors ${
                        doneFilter === opt.value
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {opt.value === 'done' && <CheckSquare size={14} />}
                      {opt.value === 'not-done' && <Square size={14} />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-2">Ordenar per:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <button
                    onClick={() => setSortBy('alphabetical-asc')}
                    className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-colors ${
                      sortBy === 'alphabetical-asc' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <ArrowDownAZ size={16} />
                    <span>Alfabètic (A-Z)</span>
                  </button>

                  <button
                    onClick={() => setSortBy('type')}
                    className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-colors ${
                      sortBy === 'type' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Tags size={16} />
                    <span>Tipus</span>
                  </button>

                  <button
                    onClick={() => setSortBy('septet-funest')}
                    className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-colors ${
                      sortBy === 'septet-funest' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FileWarning size={16} />
                    <span>Septet Funest primer</span>
                  </button>

                  <button
                    onClick={() => setSortBy('complexity')}
                    className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-colors ${
                      sortBy === 'complexity' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <ArrowUpDown size={16} />
                    <span>Més variacions</span>
                  </button>

                  <button
                    onClick={() => setSortBy('done-first')}
                    className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-colors ${
                      sortBy === 'done-first' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <CheckSquare size={16} />
                    <span>Fets primer</span>
                  </button>

                  <button
                    onClick={() => setSortBy('done-last')}
                    className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-colors ${
                      sortBy === 'done-last' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Square size={16} />
                    <span>No fets primer</span>
                  </button>

                  <button
                    onClick={() => {
                      setSortBy('random');
                      refreshRandomOrder();
                    }}
                    className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-colors ${
                      sortBy === 'random' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <RefreshCw size={16} className={sortBy === 'random' ? 'animate-spin' : ''} />
                    <span>Ordre aleatori</span>
                  </button>
                </div>

                {sortBy === 'random' && (
                  <button
                    onClick={refreshRandomOrder}
                    className="mt-2 flex items-center gap-2 py-1.5 px-3 text-sm rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
                  >
                    <RefreshCw size={14} />
                    <span>Reordenar aleatòriament</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-gray-500 pt-1 border-t border-gray-100">
                <div className="px-2 py-1 bg-gray-100 rounded-full">Total: {totalItems} elements</div>
                <div className="px-2 py-1 bg-green-50 text-green-700 rounded-full">Fets: {doneCount}</div>
                {septetFunestCount > 0 && (
                  <div className="px-2 py-1 bg-red-50 text-red-600 rounded-full">Septet Funest: {septetFunestCount}</div>
                )}
                <div className="px-2 py-1 bg-gray-100 rounded-full">Paraules: {barbarismsCount}</div>
                <div className="px-2 py-1 bg-gray-100 rounded-full">Frases: {phrasesCount}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {letters.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">No s'han trobat resultats amb aquests criteris de cerca.</p>
          </div>
        ) : (
          letters.map(letter => (
            <div key={letter} id={`letter-${letter}`} className="scroll-mt-4">
              {letter !== 'all' && !isRandomSort && (
                <h3 className="text-lg font-bold text-red-700 border-b border-red-200 pb-1 mb-3">{letter}</h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupedData[letter].map((item, index) => {
                  const isDone = doneItems.has(item.barbarism);
                  return (
                    <div
                      key={`${item.barbarism}-${index}`}
                      className={`p-3 rounded-lg border transition-colors ${
                        isDone
                          ? 'border-green-300 bg-green-50'
                          : item.isSeptetFunest
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 hover:border-red-200'
                      }`}
                    >
                      <div
                        className="flex justify-between items-start cursor-pointer"
                        onClick={() => toggleItemExpand(item.barbarism)}
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {/* Checkbox button */}
                          <button
                            onClick={(e) => handleToggleDone(item.barbarism, e)}
                            aria-label={isDone ? 'Desmarcar com a fet' : 'Marcar com a fet'}
                            className={`mt-0.5 flex-shrink-0 transition-colors ${
                              isDone ? 'text-green-600 hover:text-green-700' : 'text-gray-300 hover:text-green-500'
                            }`}
                          >
                            {isDone ? <CheckSquare size={18} /> : <Square size={18} />}
                          </button>

                          <div className="min-w-0">
                            <div className="font-medium">
                              <span className={isDone ? 'text-green-800 line-through decoration-green-400' : 'text-gray-800'}>
                                {item.barbarism}
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.type === 'frase' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                    <MessageSquareQuote size={12} className="mr-1" />
                                    Frase
                                  </span>
                                )}
                                {item.isSeptetFunest && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    <FileWarning size={12} className="mr-1" />
                                    Septet Funest
                                  </span>
                                )}
                                {item.correctForms.length > 1 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {item.correctForms.length} formes
                                  </span>
                                )}
                              </div>
                            </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              {item.correctForms[0]}{item.correctForms.length > 1 ? ', ...' : ''}
                            </div>
                          </div>
                        </div>

                        <button
                          className="text-gray-400 hover:text-red-600 p-1 flex-shrink-0"
                          aria-label={expandedItems[item.barbarism] ? 'Collapse' : 'Expand'}
                          onClick={(e) => { e.stopPropagation(); toggleItemExpand(item.barbarism); }}
                        >
                          {expandedItems[item.barbarism] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>

                      <div className={`expandable-content ${expandedItems[item.barbarism] ? 'expanded' : ''}`}>
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Formes correctes: </span>
                            {item.correctForms.join(', ')}
                          </div>
                          {item.hint && (
                            <div className="mt-1 text-xs text-gray-600">
                              <span className="font-medium">Pista: </span>
                              {item.hint}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alphabet quick navigation */}
      {isAlphabeticalSort && !isRandomSort && letters.length > 5 && (
        <div className="sticky bottom-8 flex flex-col items-center gap-1 mt-4">
          <div className="flex justify-center gap-2 mb-1">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); scrollToTop(); }}
              className="px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200 text-sm font-medium hover:bg-red-100 hover:text-red-700 transition-colors"
            >
              Tornar a dalt
            </a>
            <button
              onClick={onBack}
              className="px-3 py-2 bg-white rounded-lg shadow-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 hover:text-red-700 transition-colors"
            >
              Torna al Quiz
            </button>
          </div>
          <div className="px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-wrap justify-center gap-1">
            {letters.map(letter => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-sm font-medium hover:bg-red-100 hover:text-red-700 transition-colors"
              >
                {letter}
              </a>
            ))}
          </div>
        </div>
      )}

      {(!isAlphabeticalSort || !(letters.length > 5) || isRandomSort) && (
        <div className="sticky bottom-8 flex justify-center gap-2 mt-4">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200 text-sm font-medium hover:bg-red-100 hover:text-red-700 transition-colors"
          >
            Tornar a dalt
          </a>
          <button
            onClick={onBack}
            className="px-3 py-2 bg-white rounded-lg shadow-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 hover:text-red-700 transition-colors"
          >
            Anar al Quiz
          </button>
        </div>
      )}
    </div>
  );
}
