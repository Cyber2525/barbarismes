export interface DialectGroup {
  id: string
  name: string
  description: string
  characteristics: string[]
}

export interface DialectItem {
  id: string
  name: string
  group: string
  description: string
  characteristics: string[]
  examples: DialectExample[]
}

export interface DialectExample {
  dialectText: string
  standardText: string
  isPronunciation?: boolean
}

export interface DialectState {
  items: DialectItem[]
  currentIndex: number
  score: number
  answers: string[]
  completed: boolean
  isPracticeMode?: boolean
}

export interface DialectQuestion {
  id: string
  type: "bloc" | "dialect"
  prompt: string
  content: string
  additionalInfo?: string
  options: string[] | readonly string[]
  correctAnswer: string | string[]
  multipleCorrect: boolean
  explanation: string
  isPronunciation?: boolean
}

export type DialectQuizMode = "single" | "multiple"
export type DialectQuizType = "bloc" | "dialect"

export type DialectSortOption = "alphabetical" | "group" | "region" | "random"

export interface DialectStudyState {
  selectedGroup?: string
  searchTerm: string
  sortBy: DialectSortOption
  expandedItems: Record<string, boolean>
  showCharacteristics: boolean
}
