import React, { useState, useEffect } from 'react';
import { dialectGroups, dialectItems } from '../data/dialectData';
import { AlignJustify, ArrowDownAZ, Book, BookOpen, ChevronDown, ChevronUp, Globe, Map, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { DialectSortOption, DialectItem, DialectGroup } from '../types/dialect';
import { scrollToTop } from '../utils/scrollHelper';

interface DialectStudySheetProps {
  onBack: () => void;
}

export function DialectStudySheet({ onBack }: DialectStudySheetProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<DialectSortOption>(() => {
    // Load saved sort preference from localStorage or default to alphabetical
    const savedSort = localStorage.getItem('dialectStudySheetSort');
    return (savedSort as DialectSortOption) || 'alphabetical';
  });
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const [randomSeed, setRandomSeed] = useState<number>(Math.random());

  // Save sort preference when it changes
  useEffect(() => {
    localStorage.setItem('dialectStudySheetSort', sortBy);
  }, [sortBy]);

  // Filter data based on selected group and search term
  let filteredItems = [...dialectItems];
  
  if (selectedGroup) {
    filteredItems = filteredItems.filter(item => item.group === selectedGroup);
  }
  
  // Search functionality
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredItems = filteredItems.filter(item => 
      item.name.toLowerCase().includes(term) || 
      item.description.toLowerCase().includes(term) ||
      item.characteristics.some(char => char.toLowerCase().includes(term)) ||
      item.examples.some(ex => 
        ex.dialectText.toLowerCase().includes(term) || 
        ex.standardText.toLowerCase().includes(term)
      )
    );
  }
  
  // Sort data based on selected sort option
  filteredItems.sort((a, b) => {
    switch (sortBy) {
      case 'alphabetical':
        return a.name.localeCompare(b.name);
        
      case 'group':
        // Sort by group and then by alphabetical order within group
        const groupA = a.group;
        const groupB = b.group;
        if (groupA !== groupB) {
          return groupA.localeCompare(groupB);
        }
        return a.name.localeCompare(b.name);
        
      case 'region':
        // Sort by name (which is often the region)
        return a.name.localeCompare(b.name);
        
      case 'random':
        // Use the random seed to create a completely random order
        const randomValueA = Math.sin(randomSeed * (
          a.name.length + 
          a.characteristics.length
        ));
        
        const randomValueB = Math.sin(randomSeed * (
          b.name.length + 
          b.characteristics.length
        ));
        
        return randomValueA - randomValueB;
        
      default:
        return a.name.localeCompare(b.name);
    }
  });
  
  const refreshRandomOrder = () => {
    setRandomSeed(Math.random());
  };
  
  // Function to handle navigation to quiz mode
  const handleNavigateToQuiz = () => {
    window.location.hash = 'dialect-quiz';
    onBack();
  };
  
  const toggleItemExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getGroupById = (id: string): DialectGroup | undefined => {
    return dialectGroups.find(g => g.id === id);
  };

  // Group dialects by block for organized display
  const isGroupedView = sortBy === 'group';
  const groupedData: Record<string, DialectItem[]> = {};
  
  if (isGroupedView) {
    // Group data by block for organized display
    dialectGroups.forEach(group => {
      groupedData[group.id] = filteredItems.filter(item => item.group === group.id);
    });
  } else {
    // For non-grouped views, use a single list
    groupedData['all'] = filteredItems;
  }
  
  // Get stats for display
  const totalItems = filteredItems.length;
  const orientalCount = filteredItems.filter(item => item.group === 'oriental').length;
  const occidentalCount = filteredItems.filter(item => item.group === 'occidental').length;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 md:p-6 transition-colors duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-red-800 dark:text-red-400 transition-colors duration-300">Dialectes Catalans</h2>
      </div>
      
      {/* Dialect Group Selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <button
          onClick={() => setSelectedGroup(undefined)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
            !selectedGroup 
              ? 'bg-red-600 dark:bg-red-500 text-white' 
              : 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-slate-600'
          }`}
        >
          <Globe size={16} />
          <span>Tots els dialectes</span>
        </button>
        {dialectGroups.map(group => (
          <button
            key={group.id}
            onClick={() => setSelectedGroup(group.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
              selectedGroup === group.id 
                ? 'bg-red-600 dark:bg-red-500 text-white' 
                : 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-slate-600'
            }`}
          >
            <Book size={16} />
            <span>{group.name}</span>
          </button>
        ))}
      </div>
      
      <div className="mb-6 space-y-3">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca dialectes, característiques o exemples..."
            className="w-full px-4 py-3 pl-10 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-red-500 focus:ring-red-300 focus:outline-none transition-colors duration-300"
          />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={18} />
            </button>
          )}
        </div>
        
        <div>
          <button
            onClick={() => setFilterExpanded(!filterExpanded)}
            className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-all duration-300 ${
              filterExpanded 
                ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' 
                : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
            }`}
          >
            <SlidersHorizontal size={16} />
            <span>Opcions d'ordenació i filtrat</span>
            {filterExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {filterExpanded && (
            <div className="mt-2 p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors duration-300">
              <h4 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-3 transition-colors duration-300">Ordenar per:</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <button
                  onClick={() => setSortBy('alphabetical')}
                  className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-all duration-300 ${
                    sortBy === 'alphabetical' 
                      ? 'bg-red-600 dark:bg-red-500 text-white' 
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <ArrowDownAZ size={16} />
                  <span>Alfabètic</span>
                </button>
                
                <button
                  onClick={() => setSortBy('group')}
                  className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-all duration-300 ${
                    sortBy === 'group' 
                      ? 'bg-red-600 dark:bg-red-500 text-white' 
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <BookOpen size={16} />
                  <span>Per bloc dialectal</span>
                </button>
                
                <button
                  onClick={() => setSortBy('region')}
                  className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-all duration-300 ${
                    sortBy === 'region' 
                      ? 'bg-red-600 dark:bg-red-500 text-white' 
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <Map size={16} />
                  <span>Per regió</span>
                </button>
                
                <button
                  onClick={() => {
                    setSortBy('random');
                    refreshRandomOrder();
                  }}
                  className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-all duration-300 ${
                    sortBy === 'random' 
                      ? 'bg-red-600 dark:bg-red-500 text-white' 
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <RefreshCw size={16} className={sortBy === 'random' ? 'animate-spin' : ''} />
                  <span>Ordre aleatori</span>
                </button>
              </div>
              
              {sortBy === 'random' && (
                <button
                  onClick={refreshRandomOrder}
                  className="flex items-center gap-2 py-1.5 px-3 text-sm rounded-md bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-all duration-300"
                >
                  <RefreshCw size={14} />
                  <span>Reordenar aleatòriament</span>
                </button>
              )}
              
              <div className="flex flex-wrap gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded-full transition-colors duration-300">
                  Total: {totalItems} dialectes
                </div>
                <div className="px-2 py-1 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-300 rounded-full transition-colors duration-300">
                  Bloc Oriental: {orientalCount}
                </div>
                <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-full transition-colors duration-300">
                  Bloc Occidental: {occidentalCount}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-6">
        {Object.keys(groupedData).length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400 transition-colors duration-300">No s'han trobat resultats amb aquests criteris de cerca.</p>
          </div>
        ) : (
          Object.entries(groupedData).map(([groupId, items]) => (
            items.length > 0 && (
              <div key={groupId} id={`group-${groupId}`} className="scroll-mt-4">
                {/* Show group heading for grouped view */}
                {isGroupedView && groupId !== 'all' && (
                  <h3 className="text-lg font-bold text-red-700 dark:text-red-400 border-b border-red-200 dark:border-red-800 pb-1 mb-3 transition-colors duration-300">
                    {getGroupById(groupId)?.name || "Grup sense nom"}
                  </h3>
                )}
                
                <div className="grid grid-cols-1 gap-3">
                  {items.map((item) => (
                    <div 
                      key={item.id} 
                      className={`p-4 rounded-lg border transition-all duration-300 ${
                        item.group === 'oriental' 
                          ? 'border-red-300 dark:border-red-700 hover:border-red-400 dark:hover:border-red-600' 
                          : 'border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600'
                      }`}
                    >
                      <div 
                        className="flex justify-between items-start cursor-pointer"
                        onClick={() => toggleItemExpand(item.id)}
                      >
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2 transition-colors duration-300">
                            {item.name}
                            <span className={`text-xs px-2 py-0.5 rounded-full transition-colors duration-300 ${
                              item.group === 'oriental' 
                                ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' 
                                : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                            }`}>
                              {item.group === 'oriental' ? 'Oriental' : 'Occidental'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">
                            {item.description}
                          </div>
                        </div>
                        <button 
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 transition-colors duration-300"
                          aria-label={expandedItems[item.id] ? "Collapse" : "Expand"}
                        >
                          <span className={`toggle-icon inline-block ${expandedItems[item.id] ? 'rotated' : ''}`}>
                            {expandedItems[item.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </span>
                        </button>
                      </div>
                      
                      <div className={`expandable-content ${expandedItems[item.id] ? 'expanded' : ''}`}>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="mb-3">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Característiques:</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                              {item.characteristics.map((char, idx) => (
                                <li key={idx}>{char}</li>
                              ))}
                            </ul>
                          </div>
                          
                          {item.examples && item.examples.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Exemples:</h4>
                              <div className="space-y-2">
                                {item.examples.map((example, idx) => (
                                  <div key={idx} className="bg-gray-50 p-2 rounded-md">
                                    <div className="text-sm font-medium">
                                      {example.isPronunciation ? (
                                        <>pronuncia: {example.dialectText}</>
                                      ) : (
                                        <>{example.dialectText}</>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">Estàndard: {example.standardText}</div>
                                    {example.isPronunciation && (
                                      <div className="text-xs text-amber-600 mt-1 italic">
                                        <span className="font-medium">Nota:</span> Aquesta és la forma parlada, representa la pronunciació, no l'escriptura.
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))
        )}
      </div>
      
      {/* Back to top button */}
      <div className="sticky bottom-8 flex justify-center gap-2 mt-4">
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
          Anar al Quiz
        </button>
      </div>
    </div>
  );
}

export default DialectStudySheet;
