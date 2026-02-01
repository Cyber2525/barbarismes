export interface QuizItem {
  barbarism: string;
  correctForms: string[];
  hint?: string;
  isSeptetFunest?: boolean;
  type?: 'barbarisme' | 'frase';
  isPracticeItem?: boolean;
  wasOriginallyCorrect?: boolean; // Flag to indicate item was correct in original session
  wasCorrectInLastRound?: boolean; // Flag to indicate item was correct in the last practice round
  previouslyCorrectInPractice?: boolean; // Flag to track if item was correct in a previous practice round
}

export interface QuizState {
  items: QuizItem[];
  currentIndex: number;
  score: number;
  answers: string[];
  completed: boolean;
  isPracticeMode?: boolean;
  originalFailedItems?: QuizItem[];
}

export type QuizMode = 'barbarismes' | 'frases' | 'tots';
