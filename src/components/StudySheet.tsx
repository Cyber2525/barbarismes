import React, { useState, useEffect } from 'react';
import { quizData } from '../data/quizData';
import { AlignJustify, ArrowDownAZ, ArrowDownZA, ArrowUpDown, Book, BookOpen, ChevronDown, ChevronUp, FileWarning, MessageSquareQuote, RefreshCw, Search, SlidersHorizontal, Tags, X } from 'lucide-react';
import { QuizMode } from '../types/quiz';
import { scrollToTop } from '../utils/scrollHelper';

interface StudySheetProps {
  mode: QuizMode;
  onBack: () => void;
}

type SortOption = 'alphabetical-asc' | 'type' | 'septet-funest' | 'complexity' | 'random';

export function StudySheet({ mode: initialMode, onBack }: StudySheetProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    // Load saved sort preference from localStorage or default to alphabetical
    const savedSort = localStorage.getItem('studySheetSort');
    return (savedSort as SortOption) || 'alphabetical-asc';
  });
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [currentMode, setCurrentMode] = useState<QuizMode>(initialMode);
  const [randomSeed, setRandomSeed] = useState<number>(Math.random());
  
  // Save sort preference when it changes
  useEffect(() => {
    localStorage.setItem('studySheetSort', sortBy);
  }, [sortBy]);
  
  // Filter data based on mode and search term
  let filteredData = [...quizData];
  
  if (currentMode === 'barbarismes') {
    filteredData = filteredData.filter(item => item.type === 'barbarisme');
  } else if (currentMode === 'frases') {
    filteredData = filteredData.filter(item => item.type === 'frase');
  }
  
  // Search functionality
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredData = filteredData.filter(item => 
      item.barbarism.toLowerCase().includes(term) || 
      item.correctForms.some(form => form.toLowerCase().includes(term))
    );
  }
  
  // Sort data based on selected sort option
  filteredData.sort((a, b) => {
    switch (sortBy) {
      case 'alphabetical-asc':
        return a.barbarism.localeCompare(b.barbarism);
        
      case 'type':
        // Sort by type and then by alphabetical order
        const typeA = a.type || 'barbarisme';
        const typeB = b.type || 'barbarisme';
        if (typeA !== typeB) {
          return typeA.localeCompare(typeB);
        }
        return a.barbarism.localeCompare(b.barbarism);
        
      case 'septet-funest':
        // Sort Septet Funest items first, then alphabetically
        if (a.isSeptetFunest && !b.isSeptetFunest) return -1;
        if (!a.isSeptetFunest && b.isSeptetFunest) return 1;
        return a.barbarism.localeCompare(b.barbarism);
        
      case 'complexity':
        // Sort by number of correct forms (most forms first)
        const complexityA = a.correctForms.length;
        const complexityB = b.correctForms.length;
        if (complexityA !== complexityB) {
          return complexityB - complexityA;
        }
        return a.barbarism.localeCompare(b.barbarism);
        
      case 'random':
        // Use the random seed to create a completely random order without any alphabetical influence
        // Using multiple properties to ensure total randomness
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
  
  // Only group by first letter for alphabetical sorting
  const isAlphabeticalSort = sortBy === 'alphabetical-asc';
  const isRandomSort = sortBy === 'random';
  const groupedData: Record<string, typeof filteredData> = {};
  let letters: string[] = [];
  
  if (isAlphabeticalSort) {
    // Group data by first letter for alphabetical organization
    filteredData.forEach(item => {
      const firstLetter = item.barbarism[0].toUpperCase();
      if (!groupedData[firstLetter]) {
        groupedData[firstLetter] = [];
      }
      groupedData[firstLetter].push(item);
    });
    
    // Get sorted letters
    letters = Object.keys(groupedData).sort();
  } else {
    // For non-alphabetical sorts, use a single pseudo-group to avoid letter headings
    groupedData['all'] = filteredData;
    letters = ['all'];
  }
  
  // Get stats for display
  const totalItems = filteredData.length;
  const septetFunestCount = filteredData.filter(item => item.isSeptetFunest).length;
  const barbarismsCount = filteredData.filter(item => item.type === 'barbarisme').length;
  const phrasesCount = filteredData.filter(item => item.type === 'frase').length;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-red-800">Full d'Estudi</h2>
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
            <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
              <h4 className="text-md font-semibold text-gray-800 mb-3">Ordenar per:</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                <button
                  onClick={() => setSortBy('alphabetical-asc')}
                  className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-colors ${
                    sortBy === 'alphabetical-asc' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ArrowDownAZ size={16} />
                  <span>Alfabètic (A-Z)</span>
                </button>
                
                
                
                <button
                  onClick={() => setSortBy('type')}
                  className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-colors ${
                    sortBy === 'type' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Tags size={16} />
                  <span>Tipus</span>
                </button>
                
                <button
                  onClick={() => setSortBy('septet-funest')}
                  className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-colors ${
                    sortBy === 'septet-funest' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FileWarning size={16} />
                  <span>Septet Funest primer</span>
                </button>
                
                <button
                  onClick={() => setSortBy('complexity')}
                  className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-colors ${
                    sortBy === 'complexity' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ArrowUpDown size={16} />
                  <span>Més variacions</span>
                </button>
                
                <button
                  onClick={() => {
                    setSortBy('random');
                    refreshRandomOrder();
                  }}
                  className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-colors ${
                    sortBy === 'random' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <RefreshCw size={16} className={sortBy === 'random' ? 'animate-spin' : ''} />
                  <span>Ordre aleatori</span>
                </button>
              </div>
              
              {sortBy === 'random' && (
                <button
                  onClick={refreshRandomOrder}
                  className="flex items-center gap-2 py-1.5 px-3 text-sm rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
                >
                  <RefreshCw size={14} />
                  <span>Reordenar aleatòriament</span>
                </button>
              )}
              
              <div className="flex flex-wrap gap-2 mt-4 text-xs text-gray-500">
                <div className="px-2 py-1 bg-gray-100 rounded-full">
                  Total: {totalItems} elements
                </div>
                {septetFunestCount > 0 && (
                  <div className="px-2 py-1 bg-red-50 text-red-600 rounded-full">
                    Septet Funest: {septetFunestCount}
                  </div>
                )}
                <div className="px-2 py-1 bg-gray-100 rounded-full">
                  Paraules: {barbarismsCount}
                </div>
                <div className="px-2 py-1 bg-gray-100 rounded-full">
                  Frases: {phrasesCount}
                </div>
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
              {/* Only show letter heading for alphabetical sorting */}
              {letter !== 'all' && !isRandomSort && (
                <h3 className="text-lg font-bold text-red-700 border-b border-red-200 pb-1 mb-3">{letter}</h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupedData[letter].map((item, index) => (
                  <div 
                    key={`${item.barbarism}-${index}`} 
                    className={`p-3 rounded-lg border ${
                      item.isSeptetFunest ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-red-200'
                    } transition-colors`}
                  >
                    <div 
                      className="flex justify-between items-start cursor-pointer"
                      onClick={() => toggleItemExpand(item.barbarism)}
                    >
                      <div>
                        <div className="font-medium text-gray-800">
                          {item.barbarism}
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
                        <div className="text-sm text-gray-600">
                          {item.correctForms[0]}{item.correctForms.length > 1 ? ", ..." : ""}
                        </div>
                      </div>
                      <button 
                        className="text-gray-400 hover:text-red-600 p-1"
                        aria-label={expandedItems[item.barbarism] ? "Collapse" : "Expand"}
                      >
                        <span className={`toggle-icon inline-block ${expandedItems[item.barbarism] ? 'rotated' : ''}`}>
                          {expandedItems[item.barbarism] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </button>
                    </div>
                    
                    <div className={`expandable-content ${expandedItems[item.barbarism] ? 'expanded' : ''}`}>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Formes correctes: </span>
                          {item.correctForms.join(", ")}
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
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Alphabet quick navigation - only show when using alphabetical ordering */}
      {isAlphabeticalSort && !isRandomSort && letters.length > 5 && (
        <div className="sticky bottom-8 flex flex-col items-center gap-1 mt-4">
          <div className="flex justify-center gap-2 mb-1">
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                scrollToTop();
              }}
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
      
      {/* Show a "back to top" button when not showing letters */}
      {(!isAlphabeticalSort || !(letters.length > 5) || isRandomSort) && (
        <div className="sticky bottom-8 flex justify-center gap-2 mt-4">
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
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
