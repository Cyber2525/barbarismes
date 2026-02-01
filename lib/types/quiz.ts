export interface QuizItem {
  barbarism: string
  correctForms: string[]
  hint?: string
  isSeptetFunest?: boolean
  type?: "barbarisme" | "frase"
  isPracticeItem?: boolean
  wasOriginallyCorrect?: boolean
  wasCorrectInLastRound?: boolean
  previouslyCorrectInPractice?: boolean
}

export interface QuizState {
  items: QuizItem[]
  currentIndex: number
  score: number
  answers: string[]
  completed: boolean
  isPracticeMode?: boolean
  originalFailedItems?: QuizItem[]
}

export type QuizMode = "barbarismes" | "frases" | "tots"
