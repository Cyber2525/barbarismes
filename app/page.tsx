"use client"

import { useEffect, useState } from "react"
import { QuizItem, QuizState, QuizMode } from "@/lib/types/quiz"
import { getRandomQuizItems } from "@/lib/data/quizData"
import { QuizQuestion } from "@/components/quiz/QuizQuestion"
import { QuizProgress } from "@/components/quiz/QuizProgress"
import { QuizResults } from "@/components/quiz/QuizResults"
import { GameSettingsWidget } from "@/components/quiz/GameSettingsWidget"
import { StudySheet } from "@/components/quiz/StudySheet"
import { DialectStudySheet } from "@/components/dialect/DialectStudySheet"
import { DialectQuiz } from "@/components/dialect/DialectQuiz"
import { BookOpen, Globe, Languages, Menu, Pencil, X } from "lucide-react"

const DEFAULT_QUIZ_SIZE = 20

export default function Home() {
  const [appSection, setAppSection] = useState<"barbarismes" | "dialectes">("barbarismes")
  const [quizSize, setQuizSize] = useState<number>(DEFAULT_QUIZ_SIZE)
  const [quizMode, setQuizMode] = useState<QuizMode>("tots")
  const [quizState, setQuizState] = useState<QuizState>({
    items: [],
    currentIndex: 0,
    score: 0,
    answers: [],
    completed: false,
    isPracticeMode: false,
    originalFailedItems: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isStudyMode, setIsStudyMode] = useState<boolean>(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [dialectHash, setDialectHash] = useState("")
  const [mounted, setMounted] = useState(false)

  // Handle client-side only operations
  useEffect(() => {
    setMounted(true)
    
    // Load saved preferences from localStorage
    const savedSection = localStorage.getItem("appSection")
    if (savedSection === "barbarismes" || savedSection === "dialectes") {
      setAppSection(savedSection)
    }

    const savedSize = localStorage.getItem("quizSize")
    if (savedSize) {
      setQuizSize(parseInt(savedSize))
    }

    const savedMode = localStorage.getItem("quizMode")
    if (savedMode === "barbarismes" || savedMode === "frases" || savedMode === "tots") {
      setQuizMode(savedMode)
    }

    const savedStudyMode = localStorage.getItem("isStudyMode")
    if (savedStudyMode === "true") {
      setIsStudyMode(true)
    }

    // Handle hash for dialect quiz
    setDialectHash(window.location.hash)
    const handleHashChange = () => {
      setDialectHash(window.location.hash)
    }
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  // Save preferences to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("isStudyMode", isStudyMode.toString())
    }
  }, [isStudyMode, mounted])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("quizSize", quizSize.toString())
    }
  }, [quizSize, mounted])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("quizMode", quizMode)
    }
  }, [quizMode, mounted])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("appSection", appSection)
    }
  }, [appSection, mounted])

  // Initialize quiz
  useEffect(() => {
    if (mounted) {
      startNewQuiz()
      setQuizState((prevState) => ({
        ...prevState,
        completed: false,
      }))
    }
  }, [quizSize, quizMode, mounted])

  // Listen for practice failed items event
  useEffect(() => {
    if (!mounted) return

    const handlePracticeFailedItems = (event: CustomEvent) => {
      const { failedItems, isPracticeMode, originalItems, originalAnswers } = event.detail
      if (failedItems && failedItems.length > 0) {
        if (originalItems) {
          localStorage.setItem("originalQuizItems", JSON.stringify(originalItems))
          if (originalAnswers) {
            localStorage.setItem("originalQuizAnswers", JSON.stringify(originalAnswers))
          }
        }

        setQuizState((prevState) => ({
          ...prevState,
          completed: false,
        }))

        setTimeout(() => {
          startNewQuiz(failedItems, isPracticeMode)
        }, 50)
      }
    }

    window.addEventListener("practice-failed-items", handlePracticeFailedItems as EventListener)
    return () => {
      window.removeEventListener("practice-failed-items", handlePracticeFailedItems as EventListener)
    }
  }, [mounted])

  const startNewQuiz = (specificItems?: QuizItem[], isPracticeMode: boolean = false) => {
    setIsLoading(true)

    setQuizState((prevState) => ({
      ...prevState,
      completed: false,
    }))

    setTimeout(() => {
      let quizItems = specificItems || getRandomQuizItems(quizSize, quizMode)

      if (specificItems && isPracticeMode) {
        quizItems = quizItems.map((item) => ({
          ...item,
          isPracticeItem: true,
          wasCorrectInLastRound: item.wasCorrectInLastRound || false,
          previouslyCorrectInPractice: item.previouslyCorrectInPractice || false,
        }))
      }

      if (!isPracticeMode) {
        localStorage.removeItem("originalQuizItems")
        localStorage.removeItem("originalQuizAnswers")
        localStorage.removeItem("originalQuizState")
        localStorage.removeItem("firstOriginalQuizState")
        localStorage.removeItem("practiceRound")
      }

      setQuizState({
        items: quizItems,
        currentIndex: 0,
        score: 0,
        answers: new Array(quizItems.length).fill(""),
        completed: false,
        isPracticeMode: isPracticeMode,
        originalFailedItems: isPracticeMode ? [...quizItems] : [],
      })
      setIsLoading(false)
    }, 1000)
  }

  const handleAnswer = (answer: string, isCorrect: boolean) => {
    const updatedState = { ...quizState }
    updatedState.answers[quizState.currentIndex] = answer

    if (isCorrect) {
      updatedState.score += 1
    }

    setQuizState(updatedState)
  }

  const handleContinue = () => {
    const updatedState = { ...quizState }

    if (quizState.currentIndex < quizState.items.length - 1) {
      updatedState.currentIndex += 1
      setQuizState(updatedState)
    } else {
      updatedState.completed = true
      setQuizState(updatedState)
    }
  }

  const handleQuizSizeChange = (size: number) => {
    if (size !== quizSize) {
      setQuizSize(size)
    }
  }

  const handleQuizModeChange = (mode: QuizMode) => {
    if (mode !== quizMode) {
      setQuizMode(mode)
    }
  }

  if (!mounted) {
    return (
      <div
        className="fixed inset-0 bg-gradient-to-br from-yellow-50 to-red-100 flex flex-col items-center justify-center"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute h-16 w-16 rounded-full animate-spin bg-gradient-to-b from-red-600 to-transparent"></div>
          <div className="absolute flex items-center justify-center bg-white rounded-full h-14 w-14">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 4V6M12 18V20M6 12H4M20 12H18M18.364 5.636L16.95 7.05M7.05 16.95L5.636 18.364M7.05 7.05L5.636 5.636M18.364 18.364L16.95 16.95"
                stroke="#C8102E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-red-800">Mots Correctes</h1>
        <p className="text-red-600 mt-2">Preparant el teu quiz...</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 bg-gradient-to-br from-yellow-50 to-red-100 flex flex-col items-center justify-center"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute h-16 w-16 rounded-full animate-spin bg-gradient-to-b from-red-600 to-transparent"></div>
          <div className="absolute flex items-center justify-center bg-white rounded-full h-14 w-14">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 4V6M12 18V20M6 12H4M20 12H18M18.364 5.636L16.95 7.05M7.05 16.95L5.636 18.364M7.05 7.05L5.636 5.636M18.364 18.364L16.95 16.95"
                stroke="#C8102E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-red-800">Mots Correctes</h1>
        <p className="text-red-600 mt-2">Preparant el teu quiz...</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-yellow-50 to-red-100 py-6 md:py-8 px-4"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
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
                <h1 className="text-2xl md:text-3xl font-bold text-red-800">Catala Correcte</h1>
                <p className="text-sm md:text-base text-red-600 text-left">Apren catala amb les nostres eines</p>
              </div>
            </div>
          </div>

          {/* App Section Selector */}
          <div className="flex flex-wrap justify-center gap-3 mb-4 w-full">
            <button
              onClick={() => setAppSection("barbarismes")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-colors ${
                appSection === "barbarismes"
                  ? "bg-red-600 text-white"
                  : "bg-white text-red-600 border border-red-200 hover:bg-red-50"
              }`}
            >
              <Languages size={18} />
              <span>Barbarismes</span>
            </button>
            <button
              onClick={() => setAppSection("dialectes")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-colors ${
                appSection === "dialectes"
                  ? "bg-red-600 text-white"
                  : "bg-white text-red-600 border border-red-200 hover:bg-red-50"
              }`}
            >
              <Globe size={18} />
              <span>Dialectes</span>
            </button>
          </div>

          {/* Mode Selector */}
          <div
            className={`${isMobileMenuOpen ? "flex" : "hidden"} md:flex items-center justify-center flex-row space-x-2 md:space-x-4 w-full md:w-auto`}
          >
            <button
              onClick={() => setIsStudyMode(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                !isStudyMode ? "bg-red-600 text-white" : "bg-white text-red-600 hover:bg-red-50"
              }`}
            >
              <Pencil size={18} />
              <span>Mode Quiz</span>
            </button>
            <button
              onClick={() => setIsStudyMode(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isStudyMode ? "bg-red-600 text-white" : "bg-white text-red-600 hover:bg-red-50"
              }`}
            >
              <BookOpen size={18} />
              <span>Mode Estudi</span>
            </button>
          </div>
        </header>

        <main className="flex flex-col items-center">
          {appSection === "dialectes" ? (
            dialectHash === "#dialect-quiz" ? (
              <DialectQuiz onBack={() => (window.location.hash = "")} />
            ) : isStudyMode ? (
              <DialectStudySheet
                onBack={() => {
                  window.location.hash = "dialect-quiz"
                  setIsStudyMode(false)
                }}
              />
            ) : (
              <DialectQuiz onBack={() => setAppSection("barbarismes")} />
            )
          ) : (
            <>
              {isStudyMode ? (
                <StudySheet mode={quizMode} onBack={() => setIsStudyMode(false)} />
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
                          answered={quizState.answers[quizState.currentIndex] !== ""}
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
          <p className="mt-4 text-sm text-red-400 text-left md:text-center">
            2025 Mots Correctes - Una aplicacio per aprendre el catala correcte
          </p>
        </footer>
      </div>
    </div>
  )
}
