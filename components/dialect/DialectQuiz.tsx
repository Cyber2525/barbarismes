"use client"

import { useState, useEffect } from "react"
import { dialectGroups, dialectItems } from "@/lib/data/dialectData"
import { ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, Settings, X } from "lucide-react"
import { DialectQuestion, DialectQuizMode, DialectQuizType } from "@/lib/types/dialect"

interface DialectQuizProps {
  onBack: () => void
}

export function DialectQuiz({ onBack }: DialectQuizProps) {
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizMode, setQuizMode] = useState<DialectQuizMode>("single")
  const [quizType, setQuizType] = useState<DialectQuizType>("bloc")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [questions, setQuestions] = useState<DialectQuestion[]>([])
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [quizSize, setQuizSize] = useState(10)

  useEffect(() => {
    if (quizStarted) {
      const newQuestions = generateQuestions(quizType, quizSize)
      setQuestions(newQuestions)
      resetQuiz()
    }
  }, [quizStarted, quizType, quizSize])

  const resetQuiz = () => {
    setCurrentIndex(0)
    setScore(0)
    setAnswered(false)
    setSelectedOptions([])
    setIsCorrect(false)
    setQuizCompleted(false)
  }

  const shuffleArray = <T,>(array: T[]): T[] => {
    const arrayCopy = [...array]
    for (let i = arrayCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]]
    }
    return arrayCopy
  }

  const generateQuestions = (type: DialectQuizType, size: number): DialectQuestion[] => {
    const newQuestions: DialectQuestion[] = []

    if (type === "bloc") {
      const traits = [...dialectGroups[0].characteristics, ...dialectGroups[1].characteristics]
      const shuffledTraits = shuffleArray([...traits])

      for (let i = 0; i < shuffledTraits.length && newQuestions.length < size; i++) {
        const trait = shuffledTraits[i]
        const isOriental = dialectGroups[0].characteristics.includes(trait)
        const correctBloc = isOriental ? "oriental" : "occidental"
        const options = shuffleArray(["oriental", "occidental"])

        const isPronunciation =
          trait.includes("pronunci") ||
          trait.includes("vocal") ||
          trait.includes("fonema") ||
          trait.includes("neutralitz")

        newQuestions.push({
          id: `bloc-${i}`,
          type: "bloc",
          prompt: `A quin bloc dialectal pertany aquest tret?`,
          content: trait,
          options: options,
          correctAnswer: correctBloc,
          multipleCorrect: false,
          explanation: `Aquest tret es caracteristic del bloc ${correctBloc}.`,
          isPronunciation: isPronunciation,
        })
      }

      if (newQuestions.length < size) {
        const examples = dialectItems.flatMap((dialect) =>
          dialect.examples.map((ex) => ({
            text: ex.dialectText,
            standard: ex.standardText,
            dialectId: dialect.id,
            group: dialect.group,
          }))
        )

        const shuffledExamples = shuffleArray([...examples])

        for (let i = 0; i < shuffledExamples.length && newQuestions.length < size; i++) {
          const example = shuffledExamples[i]
          const options = shuffleArray(["oriental", "occidental"])

          newQuestions.push({
            id: `bloc-example-${i}`,
            type: "bloc",
            prompt: `A quin bloc dialectal pertany aquest exemple?`,
            content: example.text,
            additionalInfo: `Catala estandard: "${example.standard}"`,
            options: options,
            correctAnswer: example.group,
            multipleCorrect: false,
            explanation: `Aquesta expressio es caracteristica del bloc ${example.group}.`,
            isPronunciation:
              example.text.includes("cantu") ||
              example.text.includes("canti") ||
              example.text.includes("aigo") ||
              example.text.includes("famili") ||
              example.text.includes("histori"),
          })
        }
      }
    } else {
      const allDialects = [...dialectItems]
      const shuffledDialects = shuffleArray([...allDialects])

      for (let i = 0; i < shuffledDialects.length && newQuestions.length < size; i++) {
        const dialect = shuffledDialects[i]

        if (dialect.characteristics.length > 0) {
          const charIndex = Math.floor(Math.random() * dialect.characteristics.length)
          const characteristic = dialect.characteristics[charIndex]
          const dialectOptions = shuffleArray(dialectItems.map((d) => d.name))

          newQuestions.push({
            id: `dialect-char-${i}`,
            type: "dialect",
            prompt: `A quin dialecte pertany aquesta caracteristica?`,
            content: characteristic,
            options: dialectOptions,
            correctAnswer: dialect.name,
            multipleCorrect: false,
            explanation: `Aquesta caracteristica es propia del dialecte ${dialect.name}.`,
          })
        }

        if (dialect.examples.length > 0 && newQuestions.length < size) {
          const exIndex = Math.floor(Math.random() * dialect.examples.length)
          const example = dialect.examples[exIndex]
          const dialectOptions = shuffleArray(dialectItems.map((d) => d.name))

          newQuestions.push({
            id: `dialect-example-${i}`,
            type: "dialect",
            prompt: `A quin dialecte pertany aquesta expressio?`,
            content: example.dialectText,
            additionalInfo: `Catala estandard: "${example.standardText}"`,
            options: dialectOptions,
            correctAnswer: dialect.name,
            multipleCorrect: false,
            explanation: `Aquesta expressio es caracteristica del dialecte ${dialect.name}.`,
            isPronunciation: example.isPronunciation || false,
          })
        }
      }
    }

    return shuffleArray(newQuestions).slice(0, size)
  }

  const startQuiz = () => {
    setQuizStarted(true)
    setQuizCompleted(false)
  }

  const handleOptionChange = (option: string) => {
    if (answered) return

    if (quizMode === "single") {
      setSelectedOptions([option])
    } else {
      setSelectedOptions((prev) =>
        prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
      )
    }
  }

  const checkAnswer = () => {
    if (questions.length === 0 || answered) return

    const currentQuestion = questions[currentIndex]
    let correct = false

    if (currentQuestion.multipleCorrect) {
      const correctAnswers = Array.isArray(currentQuestion.correctAnswer)
        ? currentQuestion.correctAnswer
        : [currentQuestion.correctAnswer]

      const allCorrectSelected = correctAnswers.every((answer) => selectedOptions.includes(answer))
      const noIncorrectSelected = selectedOptions.every((selected) => correctAnswers.includes(selected))

      correct = allCorrectSelected && noIncorrectSelected
    } else {
      correct =
        selectedOptions.length === 1 && selectedOptions[0] === currentQuestion.correctAnswer
    }

    if (correct) {
      setScore((prev) => prev + 1)
    }

    setIsCorrect(correct)
    setAnswered(true)
  }

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setSelectedOptions([])
      setAnswered(false)
      setIsCorrect(false)
    } else {
      setQuizCompleted(true)
    }
  }

  const CurrentQuestion = () => {
    if (questions.length === 0 || currentIndex >= questions.length) {
      return <div className="text-center p-4">No hi ha prou preguntes disponibles.</div>
    }

    const question = questions[currentIndex]
    const options = question.options

    return (
      <div className="w-full">
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">{question.prompt}</h3>
          <p className="text-gray-700 p-3 bg-yellow-50 rounded-lg">
            {question.isPronunciation ? <>pronuncia: {question.content}</> : <>{question.content}</>}
          </p>
          {question.isPronunciation && (
            <div className="text-xs text-amber-600 mt-1 italic">
              <span className="font-medium">Nota:</span> Aquesta es la forma parlada, representa la
              pronunciacio, no l{"'"}escriptura.
            </div>
          )}
          {question.additionalInfo && (
            <p className="text-sm text-gray-500 mt-2 italic">{question.additionalInfo}</p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {Array.isArray(options) &&
            options.map((option, index) => (
              <div
                key={index}
                onClick={() => handleOptionChange(option)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedOptions.includes(option)
                    ? answered
                      ? isCorrect
                        ? "bg-green-100 border-green-300"
                        : Array.isArray(question.correctAnswer)
                          ? question.correctAnswer.includes(option)
                            ? "bg-green-100 border-green-300"
                            : "bg-red-100 border-red-300"
                          : option === question.correctAnswer
                            ? "bg-green-100 border-green-300"
                            : "bg-red-100 border-red-300"
                      : "bg-red-50 border-red-300"
                    : answered &&
                        (Array.isArray(question.correctAnswer)
                          ? question.correctAnswer.includes(option)
                            ? "bg-green-100 border-green-300"
                            : "border-gray-200"
                          : option === question.correctAnswer
                            ? "bg-green-100 border-green-300"
                            : "border-gray-200")
                }`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-6 h-6 flex-shrink-0 rounded-full border mr-3 flex items-center justify-center ${
                      selectedOptions.includes(option)
                        ? answered
                          ? isCorrect
                            ? "bg-green-600 border-green-600 text-white"
                            : "bg-red-600 border-red-600 text-white"
                          : "bg-red-600 border-red-600 text-white"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedOptions.includes(option) &&
                      (quizMode === "single" ? <ChevronRight size={14} /> : <Check size={14} />)}
                  </div>
                  <span className="text-gray-800">{option}</span>
                </div>
              </div>
            ))}
        </div>

        <div className={`expandable-content ${answered ? "expanded" : ""}`}>
          <div className={`p-4 rounded-lg mb-6 ${isCorrect ? "bg-green-100" : "bg-red-100"}`}>
            <div className="flex items-start">
              {isCorrect ? (
                <Check className="text-green-600 mt-0.5 mr-2" size={18} />
              ) : (
                <X className="text-red-600 mt-0.5 mr-2" size={18} />
              )}
              <div>
                <p className={`font-medium ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                  {isCorrect ? "Correcte!" : "Incorrecte"}
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
              {currentIndex < questions.length - 1 ? "Seguent pregunta" : "Veure resultats"}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    )
  }

  const QuizResults = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-50 mb-4">
          <div className="text-3xl font-bold text-red-600">
            {score}/{questions.length}
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Has obtingut {score} de {questions.length} punts
        </h3>
        <p className="text-gray-600">
          {score === questions.length
            ? "Perfecte! Ets un expert en dialectes catalans!"
            : score > questions.length / 2
              ? "Bon resultat! Coneixes be els dialectes catalans."
              : "Segueix practicant per millorar el teu coneixement dels dialectes catalans."}
        </p>
      </div>

      <div className="flex flex-col gap-3 mt-6">
        <button
          onClick={() => {
            resetQuiz()
            setCurrentIndex(0)
          }}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
        >
          <CircleHelp size={18} />
          Fer una altra prova
        </button>
        <button
          onClick={() => {
            resetQuiz()
            setQuizStarted(false)
          }}
          className="bg-white hover:bg-gray-50 text-red-600 border border-red-200 font-medium py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
        >
          <BookOpen size={18} />
          Canviar la configuracio
        </button>
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-red-800">
          {quizStarted ? "Quiz de Dialectes Catalans" : "Configuracio del Quiz"}
        </h2>
      </div>

      {!quizStarted ? (
        <div className="space-y-6">
          {/* Quiz Type Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Tipus de preguntes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setQuizType("bloc")}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  quizType === "bloc"
                    ? "border-red-600 bg-red-50"
                    : "border-gray-200 hover:border-red-200"
                }`}
              >
                <h4 className="font-medium text-gray-800">Blocs dialectals</h4>
                <p className="text-sm text-gray-500 mt-1">Identifica trets del bloc oriental o occidental</p>
              </button>
              <button
                onClick={() => setQuizType("dialect")}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  quizType === "dialect"
                    ? "border-red-600 bg-red-50"
                    : "border-gray-200 hover:border-red-200"
                }`}
              >
                <h4 className="font-medium text-gray-800">Dialectes especifics</h4>
                <p className="text-sm text-gray-500 mt-1">Identifica caracteristiques de cada dialecte</p>
              </button>
            </div>
          </div>

          {/* Quiz Size Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Nombre de preguntes</h3>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map((size) => (
                <button
                  key={size}
                  onClick={() => setQuizSize(size)}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    quizSize === size
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startQuiz}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span>Començar el Quiz</span>
            <ArrowRight size={18} />
          </button>
        </div>
      ) : quizCompleted ? (
        <QuizResults />
      ) : (
        <>
          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                Pregunta {currentIndex + 1} de {questions.length}
              </span>
              <span className="text-sm text-red-600 font-medium">Puntuacio: {score}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <CurrentQuestion />
        </>
      )}
    </div>
  )
}

export default DialectQuiz
