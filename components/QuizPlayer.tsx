'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Exam, Question, ScoreRecord, QuestionAnswers } from '@/lib/types';
import { DatabaseService } from '@/lib/database-service';
import { Check, X, Clock, Award, AlertCircle, ArrowLeft, ArrowRight, Save, Play, RefreshCw, Volume2, HelpCircle, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuizPlayerProps {
  exam: Exam;
  level: 'LV1' | 'LV2' | 'LV3';
  student: any;
  mode: 'training' | 'testing' | 'race';
  onBack: () => void;
  syncTrigger: number;
}

export default function QuizPlayer({ exam, level, student, mode, onBack, syncTrigger }: QuizPlayerProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsShuffledOptions, setQuestionsShuffledOptions] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [prepProgress, setPrepProgress] = useState<number>(0);
  const [prepStep, setPrepStep] = useState<number>(1);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answersState, setAnswersState] = useState<Record<string, any>>({}); // Map QuestionID -> Student's answer
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({}); // Map QuestionID -> Flagged status
  const [timer, setTimer] = useState(0); // in seconds
  const [quizFinished, setQuizFinished] = useState(false);
  const [scoreRecord, setScoreRecord] = useState<ScoreRecord | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackIsCorrect, setFeedbackIsCorrect] = useState(false);
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<string, { isCorrect: boolean }>>({});
  const [isReviewMode, setIsReviewMode] = useState(false);

  // State reference for keyboard keydown event handlers
  const keyHandlerStateRef = useRef<any>(null);

  useEffect(() => {
    keyHandlerStateRef.current = {
      loading,
      quizFinished,
      isReviewMode,
      questions,
      showFeedbackModal,
      mode,
      submittedQuestions,
      currentIdx,
      answersState,
      handleFeedbackNext,
      handleNext,
      handleFinish,
      handleSubmitQuestion
    };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the pressed key is Enter
      if (e.key !== 'Enter') return;
      
      const state = keyHandlerStateRef.current;
      if (!state || state.loading || (state.quizFinished && !state.isReviewMode) || state.questions.length === 0) return;

      // Prevent default browser behavior for Enter
      e.preventDefault();

      // If feedback modal is active, Enter key acts as the close/next feedback button
      if (state.showFeedbackModal) {
        state.handleFeedbackNext();
        return;
      }

      if (state.isReviewMode) {
        if (state.currentIdx < state.questions.length - 1) {
          state.handleNext();
        }
        return;
      }

      const currentQ = state.questions[state.currentIdx];
      if (!currentQ) return;

      const currentAnswer = state.answersState[currentQ.QuestionID];
      
      // Calculate isCurrentAnswered
      const isCurrentAnswered = (() => {
        if (currentAnswer === null || currentAnswer === undefined) return false;
        if (Array.isArray(currentAnswer)) {
          if (currentQ.QuestionType?.toLowerCase() === 'match image to text') {
            return currentAnswer.some((v: any) => v !== null && v !== undefined);
          }
          return currentAnswer.length > 0;
        }
        if (typeof currentAnswer === 'object') {
          return Object.keys(currentAnswer).length > 0;
        }
        return String(currentAnswer).trim() !== '';
      })();

      // Calculate hasUnanswered
      const hasUnanswered = state.questions.some((q: any) => {
        const ans = state.answersState[q.QuestionID];
        if (ans === null || ans === undefined) return true;
        if (Array.isArray(ans)) {
          if (q.QuestionType?.toLowerCase() === 'match image to text') {
            return !ans.some((v: any) => v !== null && v !== undefined);
          }
          return ans.length === 0;
        }
        if (typeof ans === 'object') {
          return Object.keys(ans).length === 0;
        }
        return String(ans).trim() === '';
      });

      if (state.mode === 'training' || state.mode === 'race') {
        const isSubmitted = !!state.submittedQuestions[currentQ.QuestionID];
        if (isSubmitted) {
          // If already submitted, Enter key goes to the next question or finishes the quiz
          if (state.currentIdx < state.questions.length - 1) {
            state.handleNext();
          } else {
            state.handleFinish();
          }
        } else {
          // If not submitted yet and student has answered, Enter submits the answer
          if (isCurrentAnswered) {
            state.handleSubmitQuestion();
          }
        }
      } else if (state.mode === 'testing') {
        // In testing mode, Enter key corresponds to the next question button
        if (state.currentIdx < state.questions.length - 1) {
          state.handleNext();
        } else if (!hasUnanswered) {
          // If it is the last question and there are no unanswered questions, Enter submits the quiz
          state.handleFinish();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Draggable feedback modal state
  const [feedbackModalPos, setFeedbackModalPos] = useState({ x: 0, y: 0 });
  const [isDraggingModal, setIsDraggingModal] = useState(false);
  const dragModalStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (showFeedbackModal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFeedbackModalPos({ x: 0, y: 0 });
    }
  }, [showFeedbackModal]);

  const handleModalDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('.overflow-y-auto')) {
      return;
    }
    setIsDraggingModal(true);
    dragModalStart.current = {
      x: e.clientX - feedbackModalPos.x,
      y: e.clientY - feedbackModalPos.y,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingModal) return;
      const newX = e.clientX - dragModalStart.current.x;
      const newY = e.clientY - dragModalStart.current.y;
      setFeedbackModalPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDraggingModal) {
        setIsDraggingModal(false);
      }
    };

    if (isDraggingModal) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingModal]);

  const [draggingDot, setDraggingDot] = useState<{
    qId: string;
    index: number;
    startX: number;
    startY: number;
    startDotX: number;
    startDotY: number;
    containerWidth: number;
    containerHeight: number;
  } | null>(null);

  const [imageBounds, setImageBounds] = useState<{ width: number; height: number } | null>(null);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [quizImgElement, setQuizImgElement] = useState<HTMLImageElement | null>(null);

  const imageRect = imageBounds ? {
    width: imageBounds.width,
    height: imageBounds.height,
    left: 0,
    top: 0
  } : null;

  const quizImgRefCallback = useCallback((node: HTMLImageElement | null) => {
    if (node !== null) {
      setQuizImgElement(node);
      const updateBounds = () => {
        const rect = node.getBoundingClientRect();
        setImageBounds({
          width: rect.width,
          height: rect.height,
        });
      };
      node.addEventListener('load', updateBounds);
      const observer = new ResizeObserver(updateBounds);
      observer.observe(node);
      setTimeout(updateBounds, 100);
    }
  }, []);

  // Load questions
  useEffect(() => {
    let isSubscribed = true;
    async function fetchQuestions() {
      setLoading(true);
      setPrepStep(1);
      setPrepProgress(10);
      try {
        // Fetch all questions for this exam
        const { questions: allQs } = await DatabaseService.getQuestions({
          level,
          examId: exam.ExamID,
        });

        if (!isSubscribed) return;

        // Match exactly the order in the Exam's questionIDs list
        const orderedQs = exam.QuestionIDs.map((id) => allQs.find((q) => q.QuestionID === id)).filter(Boolean) as Question[];

        // Shuffling logic based on mode: testing is shuffled, training and race are not
        let finalQs = [...orderedQs];
        if (mode === 'testing') {
          finalQs.sort(() => Math.random() - 0.5);
        }
        setQuestions(finalQs);

        // Generate shuffled options indices for ALL questions
        const shuffledMap: Record<string, number[]> = {};
        finalQs.forEach((q) => {
          try {
            const parsedAnswers: QuestionAnswers = JSON.parse(q.Answers);
            if (parsedAnswers.options) {
              const indices = parsedAnswers.options.map((_, i) => i);
              const shuffled = [...indices].sort(() => Math.random() - 0.5);
              shuffledMap[q.QuestionID] = shuffled;
            }
          } catch (e) {
            console.error(e);
          }
        });
        setQuestionsShuffledOptions(shuffledMap);

        // Initialize state
        const initialAnswers: Record<string, any> = {};
        finalQs.forEach((q) => {
          const parsedAnswers: QuestionAnswers = JSON.parse(q.Answers);
          if (q.QuestionType === 'Multiple Choice' || q.QuestionType === 'True / False' || q.QuestionType === 'Video Based') {
            initialAnswers[q.QuestionID] = null;
          } else if (q.QuestionType === 'Multiple Response') {
            initialAnswers[q.QuestionID] = [];
          } else if (q.QuestionType === 'Matching') {
            initialAnswers[q.QuestionID] = {}; // leftItem -> rightItem
          } else if (q.QuestionType === 'Sequence Ordering') {
            const items = parsedAnswers.sequenceItems ? [...parsedAnswers.sequenceItems] : [];
            // Pre-shuffle sequence items so the student starts with a randomized layout
            initialAnswers[q.QuestionID] = [...items].sort(() => Math.random() - 0.5);
          } else if (q.QuestionType === 'True/False Multiple') {
            initialAnswers[q.QuestionID] = {}; // statement -> true/false
          } else if (q.QuestionType === 'Categorization') {
            initialAnswers[q.QuestionID] = {}; // item -> category
          } else if (q.QuestionType === 'Hotspot') {
            initialAnswers[q.QuestionID] = []; // selected hotspots dots array
          } else if (q.QuestionType?.toLowerCase() === 'match image to text') {
            initialAnswers[q.QuestionID] = Array(parsedAnswers.imageOptions?.length || 0).fill(null); // idx -> text index
          } else if (q.QuestionType === 'Matrix Selection') {
            initialAnswers[q.QuestionID] = {}; // row -> column
          }
        });
        setAnswersState(initialAnswers);

        // Run progressive simulated preparation loader:
        setPrepStep(1);
        setPrepProgress(15);
        
        let progress = 15;
        const interval = setInterval(() => {
          if (!isSubscribed) {
            clearInterval(interval);
            return;
          }
          if (progress < 95) {
            progress += Math.floor(Math.random() * 12) + 6;
            if (progress > 95) progress = 95;
            
            // Set preparation steps based on progress
            if (progress < 30) {
              setPrepStep(1);
            } else if (progress < 60) {
              setPrepStep(2);
            } else if (progress < 85) {
              setPrepStep(3);
            } else {
              setPrepStep(4);
            }
            
            setPrepProgress(progress);
          }
        }, 120);

        // Complete transition
        setTimeout(() => {
          clearInterval(interval);
          if (!isSubscribed) return;
          setPrepProgress(100);
          setPrepStep(4);
          
          setTimeout(() => {
            if (isSubscribed) {
              setLoading(false);
            }
          }, 350);
        }, 900);

      } catch (e) {
        console.error(e);
        if (isSubscribed) {
          setLoading(false);
        }
      }
    }
    fetchQuestions();
    return () => {
      isSubscribed = false;
    };
  }, [exam, level, mode, syncTrigger]);

  const [shuffledImageIndices, setShuffledImageIndices] = useState<number[]>([]);
  const [selectedMatchImgIdx, setSelectedMatchImgIdx] = useState<number | null>(null);
  const [shuffledRightOptions, setShuffledRightOptions] = useState<string[]>([]);
  const [selectedMatchingRightOpt, setSelectedMatchingRightOpt] = useState<string | null>(null);

  // Monitor current index to generate shuffled images indices or shuffled right options
  useEffect(() => {
    const q = questions[currentIdx];
    if (q) {
      if (q.QuestionType?.toLowerCase() === 'match image to text') {
        try {
          const parsed: QuestionAnswers = JSON.parse(q.Answers);
          if (parsed.imageOptions) {
            const indices = parsed.imageOptions.map((_, i) => i);
            const shuffled = [...indices].sort(() => Math.random() - 0.5);
            setTimeout(() => {
              setSelectedMatchImgIdx(null);
              setShuffledImageIndices(shuffled);
              setSelectedMatchingRightOpt(null);
              setShuffledRightOptions([]);
            }, 0);
          }
        } catch (e) {
          console.error(e);
        }
      } else if (q.QuestionType === 'Matching') {
        try {
          const parsed: QuestionAnswers = JSON.parse(q.Answers);
          if (parsed.rightOptions) {
            const shuffled = [...parsed.rightOptions].sort(() => Math.random() - 0.5);
            setTimeout(() => {
              setSelectedMatchImgIdx(null);
              setShuffledImageIndices([]);
              setSelectedMatchingRightOpt(null);
              setShuffledRightOptions(shuffled);
            }, 0);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setTimeout(() => {
          setSelectedMatchImgIdx(null);
          setShuffledImageIndices([]);
          setSelectedMatchingRightOpt(null);
          setShuffledRightOptions([]);
        }, 0);
      }
    } else {
      setTimeout(() => {
        setSelectedMatchImgIdx(null);
        setShuffledImageIndices([]);
        setSelectedMatchingRightOpt(null);
        setShuffledRightOptions([]);
      }, 0);
    }
  }, [currentIdx, questions]);

  const handleFinishRef = useRef<() => Promise<void>>(null as any);

  // Start Timer
  useEffect(() => {
    if (!loading && !quizFinished && questions.length > 0) {
      if (mode === 'testing') {
        // Initialize timer to exam duration in seconds if it's 0 or not initialized
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTimer((prev) => (prev === 0 ? (exam.Duration || 40) * 60 : prev));
      } else {
        setTimer(0);
      }
      
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (mode === 'testing') {
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              // Auto-finish on next tick or immediately
              setTimeout(() => {
                handleFinishRef.current?.();
              }, 0);
              return 0;
            }
            return prev - 1;
          } else {
            return prev + 1;
          }
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, quizFinished, questions, mode, exam.Duration]);

  const handleSelectAnswer = (qId: string, answer: any) => {
    setAnswersState((prev) => ({
      ...prev,
      [qId]: answer,
    }));
  };

  function handleNext() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  }

  function handlePrev() {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  }

  // Grade single question
  const gradeQuestion = (q: Question, studentAnswer: any): boolean => {
    try {
      if (studentAnswer === null || studentAnswer === undefined) return false;

      const correctAnsStr = q.CorrectAnswer;

      if (q.QuestionType === 'Multiple Choice' || q.QuestionType === 'True / False' || q.QuestionType === 'Video Based') {
        return String(studentAnswer) === String(correctAnsStr);
      }

      if (q.QuestionType === 'Multiple Response') {
        const correctArray: number[] = JSON.parse(correctAnsStr);
        const studentArray: number[] = studentAnswer;
        if (correctArray.length !== studentArray.length) return false;
        return correctArray.every((v) => studentArray.includes(v));
      }

      if (q.QuestionType === 'Matching') {
        const correctMap: Record<string, string> = JSON.parse(correctAnsStr);
        const studentMap: Record<string, string> = studentAnswer;
        const keys = Object.keys(correctMap);
        if (keys.length === 0) return false;
        return keys.every((key) => studentMap[key] === correctMap[key]);
      }

      if (q.QuestionType === 'Sequence Ordering') {
        const correctOrder: number[] = JSON.parse(correctAnsStr);
        const parsed: QuestionAnswers = JSON.parse(q.Answers);
        const sequenceItems = parsed.sequenceItems || [];
        // StudentAnswer is array of strings. We map back to indices of original parsed list.
        const studentOrderIndices = studentAnswer.map((item: string) => sequenceItems.indexOf(item));
        if (correctOrder.length !== studentOrderIndices.length) return false;
        return correctOrder.every((v, i) => studentOrderIndices[i] === v);
      }

      if (q.QuestionType === 'True/False Multiple') {
        const correctBooleans: boolean[] = JSON.parse(correctAnsStr);
        const parsed: QuestionAnswers = JSON.parse(q.Answers);
        const statements = parsed.statements || [];
        const studentMap: Record<string, string> = studentAnswer;

        return statements.every((stmt, idx) => {
          const expected = correctBooleans[idx] ? 'Đúng' : 'Sai';
          return studentMap[stmt] === expected;
        });
      }

      if (q.QuestionType === 'Categorization') {
        const correctMap: Record<string, string> = JSON.parse(correctAnsStr);
        const studentMap: Record<string, string> = studentAnswer;
        const keys = Object.keys(correctMap);
        return keys.every((key) => studentMap[key] === correctMap[key]);
      }

      if (q.QuestionType === 'Hotspot') {
        try {
          const parsed: QuestionAnswers = JSON.parse(q.Answers);
          const rawHotspots = parsed.hotspots || [];
          const hotspots = rawHotspots.map((h: any) => {
            const hasRadius = h.radius !== undefined;
            const w = h.width ?? h.w ?? 15;
            const h_val = h.height ?? h.h ?? 15;
            const radius = h.radius ?? Math.max(1, Math.round(w / 2));
            return {
              ...h,
              x: hasRadius ? h.x : h.x + w / 2,
              y: hasRadius ? h.y : h.y + h_val / 2,
              radius: radius,
            };
          });
          if (!Array.isArray(studentAnswer)) {
            return String(studentAnswer) === String(correctAnsStr);
          }
          const dots = studentAnswer as { x: number; y: number }[];
          if (hotspots.length !== dots.length) return false;

          const match = (hotspotIdx: number, usedDots: Set<number>): boolean => {
            if (hotspotIdx === hotspots.length) return true;
            const spot = hotspots[hotspotIdx] as any;
            for (let i = 0; i < dots.length; i++) {
              if (!usedDots.has(i)) {
                const dot = dots[i];
                const radius = spot.radius || 15;
                const dist = Math.sqrt(Math.pow(dot.x - spot.x, 2) + Math.pow(dot.y - spot.y, 2));
                const inside = dist <= radius;
                if (inside) {
                  usedDots.add(i);
                  if (match(hotspotIdx + 1, usedDots)) {
                    return true;
                  }
                  usedDots.delete(i);
                }
              }
            }
            return false;
          };
          return match(0, new Set());
        } catch (e) {
          return String(studentAnswer) === String(correctAnsStr);
        }
      }

      if (q.QuestionType?.toLowerCase() === 'match image to text') {
        const correctOrder: number[] = JSON.parse(correctAnsStr);
        const studentOrder: number[] = studentAnswer;
        if (correctOrder.length !== studentOrder.length) return false;
        return correctOrder.every((v, i) => studentOrder[i] === v);
      }

      if (q.QuestionType === 'Matrix Selection') {
        const correctMap: Record<string, string> = JSON.parse(correctAnsStr);
        const studentMap: Record<string, string> = studentAnswer;
        const keys = Object.keys(correctMap);
        return keys.every((key) => studentMap[key] === correctMap[key]);
      }

      return false;
    } catch (e) {
      console.error('Error grading question ' + q.QuestionID, e);
      return false;
    }
  };

  async function handleFinish() {
    if (timerRef.current) clearInterval(timerRef.current);

    let correctCount = 0;
    let wrongCount = 0;

    questions.forEach((q) => {
      const isCorrect = gradeQuestion(q, answersState[q.QuestionID]);
      if (isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const scorePct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const elapsedSeconds = mode === 'testing'
      ? Math.max(0, ((exam.Duration || 40) * 60) - timer)
      : timer;

    const record: ScoreRecord = {
      StudentID: student.StudentID,
      StudentName: student.FullName,
      ExamID: exam.ExamID,
      Level: level,
      Score: scorePct,
      Correct: correctCount,
      Wrong: wrongCount,
      Time: elapsedSeconds,
      SubmitTime: new Date().toISOString(),
    };

    setScoreRecord(record);
    setQuizFinished(true);

    // Save to server
    await DatabaseService.submitScore(record);
  };

  useEffect(() => {
    handleFinishRef.current = handleFinish;
  }, [handleFinish]);

  async function handleSubmitQuestion() {
    const q = questions[currentIdx];
    const ans = answersState[q.QuestionID];
    const isCorrect = gradeQuestion(q, ans);
    
    setFeedbackIsCorrect(isCorrect);
    setShowFeedbackModal(true);

    setSubmittedQuestions((prev) => ({
      ...prev,
      [q.QuestionID]: { isCorrect }
    }));

    if (mode === 'race' && !isCorrect) {
      // Save current progress to history before resetting
      const scorePct = questions.length > 0 ? Math.round((currentIdx / questions.length) * 100) : 0;
      const record: ScoreRecord = {
        StudentID: student.StudentID,
        StudentName: student.FullName,
        ExamID: exam.ExamID,
        Level: level,
        Score: scorePct,
        Correct: currentIdx, // everything before this was correct
        Wrong: questions.length - currentIdx,
        Time: timer,
        SubmitTime: new Date().toISOString(),
      };
      await DatabaseService.submitScore(record);
    }
  };

  function handleFeedbackNext() {
    setShowFeedbackModal(false);
    
    if (mode === 'race' && !feedbackIsCorrect) {
      // Reset quiz for Race mode
      setCurrentIdx(0);
      setTimer(0);
      // Reset answers
      const initialAnswers: Record<string, any> = {};
      questions.forEach((q) => {
        const parsedAnswers: QuestionAnswers = JSON.parse(q.Answers);
        if (q.QuestionType === 'Multiple Choice' || q.QuestionType === 'True / False' || q.QuestionType === 'Video Based') {
          initialAnswers[q.QuestionID] = null;
        } else if (q.QuestionType === 'Multiple Response') {
          initialAnswers[q.QuestionID] = [];
        } else if (q.QuestionType === 'Matching') {
          initialAnswers[q.QuestionID] = {};
        } else if (q.QuestionType === 'Sequence Ordering') {
          initialAnswers[q.QuestionID] = parsedAnswers.sequenceItems ? [...parsedAnswers.sequenceItems] : [];
        } else if (q.QuestionType === 'True/False Multiple') {
          initialAnswers[q.QuestionID] = {};
        } else if (q.QuestionType === 'Categorization') {
          initialAnswers[q.QuestionID] = {};
        } else if (q.QuestionType === 'Hotspot') {
          initialAnswers[q.QuestionID] = [];
        } else if (q.QuestionType?.toLowerCase() === 'match image to text') {
          initialAnswers[q.QuestionID] = Array(parsedAnswers.imageOptions?.length || 0).fill(null);
        } else if (q.QuestionType === 'Matrix Selection') {
          initialAnswers[q.QuestionID] = {};
        }
      });
      setAnswersState(initialAnswers);
      setSubmittedQuestions({});
      return;
    }

    // Go to next question or finish quiz
    if (mode === 'training') {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx((prev) => prev + 1);
      } else {
        handleFinish();
      }
      return;
    }
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading && questions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse select-none pointer-events-none">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="h-16 bg-slate-100/75 rounded-2xl" />
            <div className="h-96 bg-slate-100/75 rounded-3xl" />
          </div>
          <div className="space-y-6">
            <div className="h-44 bg-slate-100/75 rounded-3xl" />
            <div className="h-64 bg-slate-100/75 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-12 px-6">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-sm font-bold text-slate-600">Lỗi: Đề thi không có câu hỏi.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold">
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const currentAnswer = answersState[currentQ.QuestionID];
  const parsedAnswers: QuestionAnswers = JSON.parse(currentQ.Answers);
  const isFeedbackActive = isReviewMode || showFeedbackModal || ((mode === 'training' || mode === 'race') && !!submittedQuestions[currentQ.QuestionID]);

  const isCurrentAnswered = (() => {
    if (currentAnswer === null || currentAnswer === undefined) return false;
    if (Array.isArray(currentAnswer)) {
      if (currentQ.QuestionType?.toLowerCase() === 'match image to text') {
        return currentAnswer.some(v => v !== null && v !== undefined);
      }
      return currentAnswer.length > 0;
    }
    if (typeof currentAnswer === 'object') {
      return Object.keys(currentAnswer).length > 0;
    }
    return String(currentAnswer).trim() !== '';
  })();

  const hasUnanswered = questions.some((q) => {
    const ans = answersState[q.QuestionID];
    if (ans === null || ans === undefined) return true;
    if (Array.isArray(ans)) {
      if (q.QuestionType?.toLowerCase() === 'match image to text') {
        return !ans.some(v => v !== null && v !== undefined);
      }
      return ans.length === 0;
    }
    if (typeof ans === 'object') {
      return Object.keys(ans).length === 0;
    }
    return String(ans).trim() === '';
  });

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Blurry main quiz interface - smoothly un-blurs and transitions as loading completes */}
      <div id="quiz-player" className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-1000 ease-out ${
        loading
          ? "filter blur-md opacity-25 scale-95 select-none pointer-events-none"
          : "filter blur-0 opacity-100 scale-100 pointer-events-auto"
      }`}>
        {!quizFinished || isReviewMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* LEFT AREA: QUESTION BOX & INTERACTIVE ANSWER TYPES (SPANNING 3 COLUMNS) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Nav Header */}
            <div className="flex justify-between items-center bg-white border border-blue-100/60 p-4 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white rounded-lg ${
                  isReviewMode ? 'bg-indigo-600' : mode === 'training' ? 'bg-blue-500' : mode === 'testing' ? 'bg-[#0066cc]' : 'bg-amber-500 animate-pulse'
                }`}>
                  {isReviewMode ? 'Xem lại' : mode === 'training' ? 'Training' : mode === 'testing' ? 'Testing' : 'Race'}
                </span>
                <button
                  onClick={isReviewMode ? () => setIsReviewMode(false) : onBack}
                  className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> {isReviewMode ? 'Quay lại kết quả' : 'Thoát làm bài'}
                </button>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-400">
                  Câu hỏi {currentIdx + 1} / {questions.length}
                </span>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-black rounded-lg border border-blue-100/40 flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${isReviewMode ? 'text-blue-500' : 'animate-pulse'}`} /> {formatTimer(isReviewMode ? (scoreRecord?.Time || timer) : timer)}
                </span>
              </div>
            </div>

            {/* Core Question & Renderer */}
            <div className="bg-white border border-blue-100/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              {/* Header Info */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black rounded-full select-none">
                    DẠNG: {currentQ.QuestionType}
                  </span>
                  <button
                    onClick={() => {
                      setFlaggedQuestions((prev) => ({
                        ...prev,
                        [currentQ.QuestionID]: !prev[currentQ.QuestionID],
                      }));
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black rounded-full transition-all duration-200 border cursor-pointer select-none ${
                      flaggedQuestions[currentQ.QuestionID]
                        ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-sm shadow-amber-100'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <Flag className={`w-3 h-3 ${flaggedQuestions[currentQ.QuestionID] ? 'fill-current' : ''}`} />
                    {flaggedQuestions[currentQ.QuestionID] ? 'Đã gắn cờ' : 'Gắn cờ'}
                  </button>
                </div>
                <span className="text-xs text-slate-400 font-bold">Điểm số: {currentQ.Score}đ</span>
              </div>

              {/* Content */}
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {currentQ.QuestionContent ? currentQ.QuestionContent.replace(/\\n/g, '\n') : ''}
                </h3>
              </div>

              {/* Media assets */}
              {currentQ.Image && currentQ.QuestionType !== 'Hotspot' && currentQ.QuestionType?.toLowerCase() !== 'match image to text' && (
                <div className="relative border border-slate-100 rounded-xl overflow-hidden max-w-lg mx-auto bg-slate-50">
                  <img
                    src={currentQ.Image}
                    alt="Question visual"
                    className="w-full h-auto object-contain max-h-[240px]"
                  />
                </div>
              )}

              {currentQ.Audio && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-blue-500" />
                  <audio src={currentQ.Audio} controls className="w-full max-w-sm" />
                </div>
              )}

              {/* RENDER INTERACTIVE WIDGET BASED ON 11 IC3 QUESTION TYPES */}
              <div className="pt-4 border-t border-slate-100">
                {/* 1. MULTIPLE CHOICE */}
                {currentQ.QuestionType === 'Multiple Choice' && parsedAnswers.options && (() => {
                  const options = parsedAnswers.options!;
                  const shuffledIndices = questionsShuffledOptions[currentQ.QuestionID] || options.map((_, i) => i);
                  return (
                    <div className="space-y-3">
                      {shuffledIndices.map((originalIdx) => {
                        const option = options[originalIdx];
                        const isSelected = currentAnswer === originalIdx;
                        const isCorrectOption = originalIdx === Number(currentQ.CorrectAnswer);

                        let styleClass = 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-600';
                        if (isFeedbackActive) {
                          if (isCorrectOption) {
                            styleClass = 'bg-green-50 border-green-500 text-green-700 font-bold shadow-sm';
                          } else if (isSelected) {
                            styleClass = 'bg-red-50 border-red-500 text-red-700 font-bold shadow-sm';
                          }
                        } else if (isSelected) {
                          styleClass = 'bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-sm';
                        }

                        return (
                          <button
                            key={originalIdx}
                            disabled={isFeedbackActive}
                            onClick={() => handleSelectAnswer(currentQ.QuestionID, originalIdx)}
                            className={`w-full text-left p-4 rounded-xl border text-sm transition-all duration-200 flex items-center justify-between ${
                              isFeedbackActive ? 'cursor-default' : 'cursor-pointer'
                            } ${styleClass}`}
                          >
                            <span>{option}</span>
                            <span
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isFeedbackActive
                                  ? isCorrectOption
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : isSelected
                                      ? 'border-red-500 bg-red-500 text-white'
                                      : 'border-slate-300'
                                  : isSelected
                                    ? 'border-blue-500 bg-blue-500 text-white'
                                    : 'border-slate-300'
                              }`}
                            >
                              {isFeedbackActive ? (
                                isCorrectOption ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : isSelected ? (
                                  <X className="w-3.5 h-3.5 stroke-[3]" />
                                ) : null
                              ) : (
                                isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* 2. MULTIPLE RESPONSE */}
                {currentQ.QuestionType === 'Multiple Response' && parsedAnswers.options && (() => {
                  const options = parsedAnswers.options!;
                  const shuffledIndices = questionsShuffledOptions[currentQ.QuestionID] || options.map((_, i) => i);
                  let correctIndices: number[] = [];
                  try {
                    correctIndices = JSON.parse(currentQ.CorrectAnswer || '[]');
                  } catch (e) {
                    console.error(e);
                  }

                  return (
                    <div className="space-y-3">
                      {shuffledIndices.map((originalIdx) => {
                        const option = options[originalIdx];
                        const isSelected = (currentAnswer || []).includes(originalIdx);
                        const isCorrectOption = correctIndices.includes(originalIdx);
                        const toggleOption = () => {
                          const currentList: number[] = currentAnswer || [];
                          if (currentList.includes(originalIdx)) {
                            handleSelectAnswer(
                              currentQ.QuestionID,
                              currentList.filter((item) => item !== originalIdx)
                            );
                          } else {
                            handleSelectAnswer(currentQ.QuestionID, [...currentList, originalIdx]);
                          }
                        };

                        let styleClass = 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-600';
                        if (isFeedbackActive) {
                          if (isCorrectOption) {
                            styleClass = 'bg-green-50 border-green-500 text-green-700 font-bold shadow-sm';
                          } else if (isSelected) {
                            styleClass = 'bg-red-50 border-red-500 text-red-700 font-bold shadow-sm';
                          }
                        } else if (isSelected) {
                          styleClass = 'bg-indigo-50 border-indigo-400 text-indigo-700 font-bold shadow-sm';
                        }

                        return (
                          <button
                            key={originalIdx}
                            disabled={isFeedbackActive}
                            onClick={toggleOption}
                            className={`w-full text-left p-4 rounded-xl border text-sm transition-all duration-200 flex items-center justify-between ${
                              isFeedbackActive ? 'cursor-default' : 'cursor-pointer'
                            } ${styleClass}`}
                          >
                            <span>{option}</span>
                            <span
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                isFeedbackActive
                                  ? isCorrectOption
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : isSelected
                                      ? 'border-red-500 bg-red-500 text-white'
                                      : 'border-slate-300'
                                  : isSelected
                                    ? 'border-indigo-500 bg-indigo-500 text-white'
                                    : 'border-slate-300'
                              }`}
                            >
                              {isFeedbackActive ? (
                                isCorrectOption ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : isSelected ? (
                                  <X className="w-3.5 h-3.5 stroke-[3]" />
                                ) : null
                              ) : (
                                isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* 3. TRUE / FALSE */}
                {currentQ.QuestionType === 'True / False' && (
                  <div className="grid grid-cols-2 gap-4">
                    {['Đúng', 'Sai'].map((label) => {
                      const isSelected = currentAnswer === label;
                      const isCorrectOption = label === currentQ.CorrectAnswer;

                      let styleClass = 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500';
                      if (isFeedbackActive) {
                        if (isCorrectOption) {
                          styleClass = 'bg-green-50 border-green-500 text-green-700 shadow-md shadow-green-100/50';
                        } else if (isSelected) {
                          styleClass = 'bg-red-50 border-red-500 text-red-700 shadow-md shadow-red-100/50';
                        }
                      } else if (isSelected) {
                        styleClass = label === 'Đúng'
                          ? 'bg-green-50 border-green-500 text-green-700 shadow-md shadow-green-100/50'
                          : 'bg-red-50 border-red-500 text-red-700 shadow-md shadow-red-100/50';
                      }

                      return (
                        <button
                          key={label}
                          disabled={isFeedbackActive}
                          onClick={() => handleSelectAnswer(currentQ.QuestionID, label)}
                          className={`py-6 rounded-2xl border text-center font-extrabold text-sm transition-all duration-200 ${
                            isFeedbackActive ? 'cursor-default' : 'cursor-pointer'
                          } ${styleClass}`}
                        >
                          <p className="text-lg">{label}</p>
                          <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 block">
                            {label === 'Đúng' ? 'TRUE' : 'FALSE'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 4. MATCHING (Premium Drag & Drop / Tap-to-Pair Interface) */}
                {currentQ.QuestionType === 'Matching' && parsedAnswers.leftOptions && parsedAnswers.rightOptions && (() => {
                  const currentAnsMap = currentAnswer || {};
                  const unassignedRightOptions = (shuffledRightOptions.length > 0 ? shuffledRightOptions : parsedAnswers.rightOptions).filter(
                    rOpt => !Object.values(currentAnsMap).includes(rOpt)
                  );
                  let correctMap: Record<string, string> = {};
                  try {
                    correctMap = JSON.parse(currentQ.CorrectAnswer || '{}');
                  } catch (e) {
                    console.error(e);
                  }

                  return (
                    <div className="space-y-4">
                      <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 p-3.5 rounded-2xl text-xs font-bold leading-relaxed shadow-sm">
                        💡 <strong>Hướng dẫn ghép đôi (Kéo thả):</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-1 font-medium text-indigo-600">
                          <li><strong>Cách 1:</strong> Kéo các mục ở cột bên phải và thả vào ô trống tương ứng bên cạnh mục ở cột bên trái.</li>
                          <li><strong>Cách 2 (Trên điện thoại):</strong> Nhấp vào mục ở cột bên phải để chọn (sẽ có viền xanh nhấp nháy), sau đó chạm vào ô trống bên trái để ghép cặp.</li>
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        {/* LEFT COLUMN: DESCRIPTION SLOTS */}
                        <div className="md:col-span-7 space-y-3">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Cột Trái: Danh sách phát biểu</h4>
                          
                          {parsedAnswers.leftOptions.map((leftVal, idx) => {
                            const pairedRight = currentAnsMap[leftVal];
                            const hasMatch = !!pairedRight;

                            return (
                              <div 
                                key={leftVal} 
                                className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 min-h-[90px] shadow-sm hover:shadow transition"
                              >
                                {/* Left option text card */}
                                <div className="flex-1 flex gap-2 items-start">
                                  <span className="flex items-center justify-center w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black mt-0.5 flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                                    {leftVal}
                                  </p>
                                </div>

                                <div className="text-slate-300 font-extrabold text-sm select-none">➔</div>

                                {/* Drop / Match Slot */}
                                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                  <div
                                    className={`relative w-44 min-h-[70px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-2.5 transition-all flex-shrink-0 ${
                                      isFeedbackActive
                                        ? hasMatch
                                          ? pairedRight === correctMap[leftVal]
                                            ? 'border-green-500 bg-green-50/20'
                                            : 'border-red-500 bg-red-50/20'
                                          : 'border-slate-200 bg-slate-50/50'
                                        : hasMatch 
                                          ? 'border-indigo-200 bg-indigo-50/20' 
                                          : selectedMatchingRightOpt !== null
                                            ? 'border-indigo-400 bg-indigo-50 animate-pulse cursor-pointer'
                                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                    onDragOver={(e) => !isFeedbackActive && e.preventDefault()}
                                    onDragEnter={(e) => {
                                      if (isFeedbackActive) return;
                                      e.preventDefault();
                                      e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50');
                                    }}
                                    onDragLeave={(e) => {
                                      if (isFeedbackActive) return;
                                      e.preventDefault();
                                      e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
                                    }}
                                    onDrop={(e) => {
                                      if (isFeedbackActive) return;
                                      e.preventDefault();
                                      e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
                                      const rightVal = e.dataTransfer.getData("text/plain");
                                      if (rightVal && rightVal !== "") {
                                        const updated = { ...currentAnsMap };
                                        // Clear any existing pairing mapping to this same rightVal to maintain 1-to-1
                                        Object.keys(updated).forEach((k) => {
                                          if (updated[k] === rightVal) {
                                            delete updated[k];
                                          }
                                        });
                                        updated[leftVal] = rightVal;
                                        handleSelectAnswer(currentQ.QuestionID, updated);
                                        setSelectedMatchingRightOpt(null);
                                      }
                                    }}
                                    onClick={() => {
                                      if (isFeedbackActive) return;
                                      if (selectedMatchingRightOpt !== null) {
                                        const updated = { ...currentAnsMap };
                                        Object.keys(updated).forEach((k) => {
                                          if (updated[k] === selectedMatchingRightOpt) {
                                            delete updated[k];
                                          }
                                        });
                                        updated[leftVal] = selectedMatchingRightOpt;
                                        handleSelectAnswer(currentQ.QuestionID, updated);
                                        setSelectedMatchingRightOpt(null);
                                      }
                                    }}
                                  >
                                    {hasMatch ? (
                                      <div className={`relative w-full text-center text-[11px] font-bold p-2 rounded-lg leading-snug shadow-sm ${
                                        isFeedbackActive
                                          ? pairedRight === correctMap[leftVal]
                                            ? 'bg-green-50 border border-green-300 text-green-800'
                                            : 'bg-red-50 border border-red-300 text-red-800'
                                          : 'bg-white border border-slate-200 text-slate-700'
                                      }`}>
                                        <span>{pairedRight}</span>
                                        {/* Remove Assignment button */}
                                        {!isFeedbackActive && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const updated = { ...currentAnsMap };
                                              delete updated[leftVal];
                                              handleSelectAnswer(currentQ.QuestionID, updated);
                                            }}
                                            className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white p-0.5 rounded-full shadow transition-transform hover:scale-110 cursor-pointer"
                                            title="Hủy ghép cặp"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-center pointer-events-none select-none p-1">
                                        <span className="text-[10px] font-extrabold text-slate-400 block leading-tight">
                                          {selectedMatchingRightOpt !== null ? 'Chạm để thả' : 'Kéo thả vào đây'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {isFeedbackActive && (!hasMatch || pairedRight !== correctMap[leftVal]) && (
                                    <div className="text-[10px] font-black text-green-600 max-w-[176px] text-center leading-tight mt-1">
                                      ✓ Đúng: {correctMap[leftVal]}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* RIGHT COLUMN: POOL OF RIGHT OPTIONS */}
                        <div className="md:col-span-5 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 min-h-[300px]">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Cột Phải: Phương án ghép đôi</h4>
                            <span className="text-[10px] font-extrabold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                              Còn {unassignedRightOptions.length} phương án
                            </span>
                          </div>

                          {unassignedRightOptions.length > 0 ? (
                            <div className="space-y-2">
                              {unassignedRightOptions.map((rOpt) => {
                                const isSelected = selectedMatchingRightOpt === rOpt;

                                return (
                                  <div
                                    key={rOpt}
                                    draggable={!isFeedbackActive}
                                    onDragStart={(e) => {
                                      if (isFeedbackActive) return;
                                      e.dataTransfer.setData("text/plain", rOpt);
                                      setSelectedMatchingRightOpt(rOpt);
                                    }}
                                    onDragEnd={() => {
                                      // Optional clean-up
                                    }}
                                    onClick={() => {
                                      if (isFeedbackActive) return;
                                      if (isSelected) {
                                        setSelectedMatchingRightOpt(null);
                                      } else {
                                        setSelectedMatchingRightOpt(rOpt);
                                      }
                                    }}
                                    className={`p-3 rounded-xl border bg-white shadow-sm transition text-xs font-bold leading-relaxed ${
                                      isFeedbackActive
                                        ? 'border-slate-200 opacity-50 cursor-default'
                                        : isSelected 
                                          ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-50/35 animate-pulse cursor-grab active:cursor-grabbing' 
                                          : 'border-slate-200 hover:border-slate-300 hover:shadow-md cursor-grab active:cursor-grabbing'
                                    }`}
                                  >
                                    <div className="flex gap-2 items-center">
                                      <span className="text-indigo-500 font-extrabold">☰</span>
                                      <span className="text-slate-700">{rOpt}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="h-44 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-white p-4">
                              <span className="text-green-500 font-bold text-xs mb-1">🎉 Hoàn thành ghép đôi!</span>
                              <span className="text-[10px] text-slate-400 font-bold text-center">Tất cả phương án đã được ghép đôi phù hợp.</span>
                            </div>
                          )}

                          {/* Reset button inside pool */}
                          {Object.keys(currentAnsMap).length > 0 && !isFeedbackActive && (
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectAnswer(currentQ.QuestionID, {});
                                setSelectedMatchingRightOpt(null);
                              }}
                              className="w-full mt-4 py-2 bg-slate-200/80 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              Hủy tất cả các cặp ghép
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 5. SEQUENCE ORDERING */}
                {currentQ.QuestionType === 'Sequence Ordering' && (() => {
                  let correctOrder: number[] = [];
                  let sequenceItems: string[] = [];
                  try {
                    correctOrder = JSON.parse(currentQ.CorrectAnswer || '[]');
                    const parsed: QuestionAnswers = JSON.parse(currentQ.Answers);
                    sequenceItems = parsed.sequenceItems || [];
                  } catch (e) {
                    console.error(e);
                  }

                  return (
                    <div className="space-y-3">
                      <p className="text-xs text-blue-600 font-bold bg-blue-50 p-2.5 rounded-lg mb-3">
                        💡 Sử dụng các phím mũi tên để sắp xếp danh sách các bước theo thứ tự đúng nhất (từ trên xuống dưới):
                      </p>

                      <div className="space-y-2">
                        {(currentAnswer || []).map((item: string, idx: number) => {
                          const correctItemText = sequenceItems[correctOrder[idx]];
                          const isItemCorrect = item === correctItemText;

                          let styleClass = 'bg-white border-slate-200 text-slate-700';
                          if (isFeedbackActive) {
                            if (isItemCorrect) {
                              styleClass = 'bg-green-50 border-green-300 text-green-800';
                            } else {
                              styleClass = 'bg-red-50 border-red-300 text-red-800';
                            }
                          }

                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-3 p-3 border rounded-xl shadow-sm text-xs transition-colors ${styleClass}`}
                            >
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                isFeedbackActive
                                  ? isItemCorrect
                                    ? 'bg-green-200 text-green-800'
                                    : 'bg-red-200 text-red-800'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {idx + 1}
                              </span>
                              <div className="flex-1 flex flex-col">
                                <span className="font-semibold">{item}</span>
                                {isFeedbackActive && !isItemCorrect && (
                                  <span className="text-[10px] text-green-600 font-black mt-0.5">
                                    ✓ Đúng ra là: {correctItemText}
                                  </span>
                                )}
                              </div>

                              {/* Quick movement controls */}
                              {!isFeedbackActive && (
                                <div className="flex gap-1">
                                  <button
                                    disabled={idx === 0}
                                    onClick={() => {
                                      const arr = [...(currentAnswer || [])];
                                      const temp = arr[idx];
                                      arr[idx] = arr[idx - 1];
                                      arr[idx - 1] = temp;
                                      handleSelectAnswer(currentQ.QuestionID, arr);
                                    }}
                                    className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[10px] hover:bg-slate-200 disabled:opacity-30 font-extrabold cursor-pointer select-none"
                                  >
                                    ▲ Lên
                                  </button>
                                  <button
                                    disabled={idx === (currentAnswer || []).length - 1}
                                    onClick={() => {
                                      const arr = [...(currentAnswer || [])];
                                      const temp = arr[idx];
                                      arr[idx] = arr[idx + 1];
                                      arr[idx + 1] = temp;
                                      handleSelectAnswer(currentQ.QuestionID, arr);
                                    }}
                                    className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[10px] hover:bg-slate-200 disabled:opacity-30 font-extrabold cursor-pointer select-none"
                                  >
                                    ▼ Xuống
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 6. TRUE/FALSE MULTIPLE */}
                {currentQ.QuestionType === 'True/False Multiple' && parsedAnswers.statements && (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-500 uppercase tracking-wide font-bold">
                            <th className="p-3 rounded-l-xl">Phát biểu</th>
                            <th className="p-3 text-center w-24">Đúng (True)</th>
                            <th className="p-3 text-center w-24 rounded-r-xl">Sai (False)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedAnswers.statements.map((stmt, idx) => {
                            const choice = (currentAnswer || {})[stmt];
                            let correctBooleans: boolean[] = [];
                            try {
                              correctBooleans = JSON.parse(currentQ.CorrectAnswer || '[]');
                            } catch (e) {
                              console.error(e);
                            }
                            const correctVal = correctBooleans[idx] ? 'Đúng' : 'Sai';

                            const isTrueCorrect = (correctVal === 'Đúng');
                            const isTrueChosen = (choice === 'Đúng');
                            const isFalseCorrect = (correctVal === 'Sai');
                            const isFalseChosen = (choice === 'Sai');

                            let trueStyle = 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50';
                            if (isFeedbackActive) {
                              if (isTrueCorrect) {
                                trueStyle = 'bg-green-500 border-green-500 text-white';
                              } else if (isTrueChosen) {
                                trueStyle = 'bg-red-500 border-red-500 text-white';
                              } else {
                                trueStyle = 'bg-slate-50 border-slate-100 text-slate-300';
                              }
                            } else if (isTrueChosen) {
                              trueStyle = 'bg-green-50 border-green-400 text-green-700';
                            }

                            let falseStyle = 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50';
                            if (isFeedbackActive) {
                              if (isFalseCorrect) {
                                falseStyle = 'bg-green-500 border-green-500 text-white';
                              } else if (isFalseChosen) {
                                falseStyle = 'bg-red-500 border-red-500 text-white';
                              } else {
                                falseStyle = 'bg-slate-50 border-slate-100 text-slate-300';
                              }
                            } else if (isFalseChosen) {
                              falseStyle = 'bg-red-50 border-red-400 text-red-700';
                            }

                            return (
                              <tr key={stmt} className="hover:bg-slate-50/40">
                                <td className={`p-3 font-semibold leading-relaxed ${
                                  isFeedbackActive
                                    ? choice === correctVal
                                      ? 'text-green-800 bg-green-50/20'
                                      : 'text-red-800 bg-red-50/20'
                                    : 'text-slate-700'
                                }`}>
                                  {stmt}
                                  {isFeedbackActive && choice !== correctVal && (
                                    <span className="block text-[10px] text-green-600 font-black mt-1">
                                      ✓ Đúng: {correctVal}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    disabled={isFeedbackActive}
                                    onClick={() => {
                                      const updated = { ...(currentAnswer || {}) };
                                      updated[stmt] = 'Đúng';
                                      handleSelectAnswer(currentQ.QuestionID, updated);
                                    }}
                                    className={`w-12 py-1.5 rounded-lg border text-[10px] font-black transition ${
                                      isFeedbackActive ? 'cursor-default' : 'cursor-pointer'
                                    } ${trueStyle}`}
                                  >
                                    ĐÚNG
                                  </button>
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    disabled={isFeedbackActive}
                                    onClick={() => {
                                      const updated = { ...(currentAnswer || {}) };
                                      updated[stmt] = 'Sai';
                                      handleSelectAnswer(currentQ.QuestionID, updated);
                                    }}
                                    className={`w-12 py-1.5 rounded-lg border text-[10px] font-black transition ${
                                      isFeedbackActive ? 'cursor-default' : 'cursor-pointer'
                                    } ${falseStyle}`}
                                  >
                                    SAI
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                 {/* 7. VIDEO BASED */}
                {currentQ.QuestionType === 'Video Based' && currentQ.Video && parsedAnswers.options && (() => {
                  const options = parsedAnswers.options!;
                  const shuffledIndices = questionsShuffledOptions[currentQ.QuestionID] || options.map((_, i) => i);
                  return (
                    <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      <div className="bg-slate-900 rounded-2xl overflow-hidden aspect-video relative shadow-inner border border-slate-800 flex items-center justify-center">
                        <video src={currentQ.Video} controls className="w-full h-full object-contain" />
                      </div>

                      <div className="space-y-3">
                        <p className="text-[11px] font-black uppercase text-indigo-500 tracking-wide">Lựa chọn của bạn:</p>
                        {shuffledIndices.map((originalIdx) => {
                          const option = options[originalIdx];
                          const isSelected = currentAnswer === originalIdx;
                          const isCorrectOption = originalIdx === Number(currentQ.CorrectAnswer);

                          let styleClass = 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600';
                          if (isFeedbackActive) {
                            if (isCorrectOption) {
                              styleClass = 'bg-green-50 border-green-500 text-green-700 font-bold shadow-sm';
                            } else if (isSelected) {
                              styleClass = 'bg-red-50 border-red-500 text-red-700 font-bold shadow-sm';
                            }
                          } else if (isSelected) {
                            styleClass = 'bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-sm';
                          }

                          return (
                            <button
                              key={originalIdx}
                              disabled={isFeedbackActive}
                              onClick={() => handleSelectAnswer(currentQ.QuestionID, originalIdx)}
                              className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all duration-200 flex items-center justify-between ${
                                isFeedbackActive ? 'cursor-default' : 'cursor-pointer'
                              } ${styleClass}`}
                            >
                              <span>{option}</span>
                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isFeedbackActive
                                    ? isCorrectOption
                                      ? 'border-green-500 bg-green-500 text-white'
                                      : isSelected
                                        ? 'border-red-500 bg-red-500 text-white'
                                        : 'border-slate-300'
                                    : isSelected
                                      ? 'border-blue-500 bg-blue-500 text-white'
                                      : 'border-slate-300'
                                }`}
                              >
                                {isFeedbackActive ? (
                                  isCorrectOption ? (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  ) : isSelected ? (
                                    <X className="w-3 h-3 stroke-[3]" />
                                  ) : null
                                ) : (
                                  isSelected && <Check className="w-3 h-3 stroke-[3]" />
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 8. CATEGORIZATION */}
                {currentQ.QuestionType === 'Categorization' && parsedAnswers.categoryItems && parsedAnswers.categories && (
                  <div className="space-y-4">
                    <p className="text-xs text-blue-600 font-bold bg-blue-50 p-2.5 rounded-lg mb-3">
                      💡 Click chọn nhóm (Category) chính xác cho từng mục thiết bị dưới đây:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {parsedAnswers.categoryItems.map((item) => {
                        const selectedCategory = (currentAnswer || {})[item];
                        let correctMap: Record<string, string> = {};
                        try {
                          correctMap = JSON.parse(currentQ.CorrectAnswer || '{}');
                        } catch (e) {
                          console.error(e);
                        }
                        const isCorrect = selectedCategory === correctMap[item];

                        let containerStyle = 'bg-slate-50 border-slate-200';
                        if (isFeedbackActive) {
                          if (isCorrect) {
                            containerStyle = 'bg-green-50 border-green-300 text-green-800';
                          } else {
                            containerStyle = 'bg-red-50 border-red-300 text-red-800';
                          }
                        }

                        return (
                          <div
                            key={item}
                            className={`p-3 border rounded-xl flex flex-col gap-2 text-xs transition-colors ${containerStyle}`}
                          >
                            <div className="flex items-center justify-between gap-2 w-full">
                              <span className="font-bold text-slate-700">{item}</span>
                              <select
                                disabled={isFeedbackActive}
                                value={selectedCategory || ''}
                                onChange={(e) => {
                                  const updated = { ...(currentAnswer || {}) };
                                  if (e.target.value === '') {
                                    delete updated[item];
                                  } else {
                                    updated[item] = e.target.value;
                                  }
                                  handleSelectAnswer(currentQ.QuestionID, updated);
                                }}
                                className={`text-xs px-2 py-1.5 border rounded-lg focus:outline-none font-bold ${
                                  isFeedbackActive ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-default' : 'bg-white border-slate-200 text-slate-500 cursor-pointer'
                                }`}
                              >
                                <option value="">-- Chọn nhóm --</option>
                                {parsedAnswers.categories?.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {isFeedbackActive && !isCorrect && (
                              <div className="text-[10px] text-green-600 font-black">
                                ✓ Nhóm đúng: {correctMap[item]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 9. HOTSPOT (Click Image Target Coordinate) */}
                {currentQ.QuestionType === 'Hotspot' && parsedAnswers.hotspots && currentQ.Image && (() => {
                                  const rawHotspots = parsedAnswers.hotspots || [];
                  const hotspotsList = rawHotspots.map((h: any) => {
                    const hasRadius = h.radius !== undefined;
                    const w = h.width ?? h.w ?? 15;
                    const h_val = h.height ?? h.h ?? 15;
                    const radius = h.radius ?? Math.max(1, Math.round(w / 2));
                    return {
                      ...h,
                      x: h.x,
                      y: h.y,
                      centerX: hasRadius ? h.x : h.x + w / 2,
                      centerY: hasRadius ? h.y : h.y + h_val / 2,
                      radius: radius,
                    };
                  });
                  const targetCount = hotspotsList.length;
                  const dots = Array.isArray(currentAnswer) ? currentAnswer : [];

                  return (
                    <div className="space-y-4">
                      <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 p-3.5 rounded-2xl text-xs font-bold leading-relaxed shadow-sm">
                        💡 <strong>Hướng dẫn trả lời:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li>Hãy nhấp chuột vào ảnh để đánh dấu các vị trí đúng (tối đa {targetCount} dấu chấm).</li>
                          <li>Bạn có thể <strong>kéo thả di chuyển</strong> các dấu chấm đã đặt để tinh chỉnh vị trí.</li>
                          <li>Ấn nút <strong>Xóa tất cả</strong> ở dưới nếu muốn làm lại từ đầu.</li>
                        </ul>
                      </div>

                      <div className="flex justify-between items-center max-w-2xl mx-auto">
                        <span className="text-[10px] text-slate-400 font-bold">KHU VỰC TRẢ LỜI CÂU HỎI TRỰC QUAN:</span>
                        <button
                          type="button"
                          onClick={() => setShowDebug(!showDebug)}
                          className="text-[10px] text-indigo-500 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span>{showDebug ? 'Ẩn Debug 🛠️' : 'Hiện Debug 🛠️'}</span>
                        </button>
                      </div>

                      <div 
                        className="relative border-2 border-slate-200/80 rounded-2xl overflow-hidden max-w-2xl mx-auto bg-slate-950 select-none shadow-lg flex items-center justify-center min-h-[150px]"
                      >
                        {/* Perfect shrink-wrapped inline-block wrap around the image */}
                        <div
                          id="hotspot-student-image-wrapper"
                          className="relative inline-block"
                        >
                          <img 
                            ref={quizImgRefCallback}
                            src={currentQ.Image} 
                            alt="Hotspot layout" 
                            className="max-w-full max-h-[440px] w-auto h-auto block pointer-events-none opacity-95" 
                            referrerPolicy="no-referrer"
                          />

                          {imageBounds && (
                            <div
                              className="absolute inset-0 pointer-events-auto cursor-crosshair"
                              onClick={(e) => {
                                if (isFeedbackActive) return;
                                if ((e.target as HTMLElement).closest('.student-hotspot-dot')) {
                                  return;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);

                                if (dots.length < targetCount) {
                                  const newDots = [...dots, { x: clickX, y: clickY }];
                                  handleSelectAnswer(currentQ.QuestionID, newDots);
                                }
                              }}
                            >
                              {/* Correct target hotspot zones (Only visible during feedback) */}
                              {isFeedbackActive && hotspotsList.map((target: any, tIdx: number) => {
                                const w = target.width ?? target.w;
                                const h = target.height ?? target.h;
                                const hasDimensions = w !== undefined && h !== undefined;

                                if (hasDimensions) {
                                  return (
                                    <div
                                      key={`target-${tIdx}`}
                                      className="absolute border-2 border-dashed border-green-500 bg-green-500/15 rounded-lg flex items-center justify-center text-[10px] font-black text-green-600 animate-pulse pointer-events-none shadow"
                                      style={{
                                        left: `${target.x}%`,
                                        top: `${target.y}%`,
                                        width: `${w}%`,
                                        height: `${h}%`,
                                      }}
                                    >
                                      Vùng {tIdx + 1}
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={`target-${tIdx}`}
                                    className="absolute border-2 border-dashed border-green-500 bg-green-500/10 rounded-full flex items-center justify-center text-[10px] font-black text-green-600 animate-pulse pointer-events-none"
                                    style={{
                                      left: `${target.centerX}%`,
                                      top: `${target.centerY}%`,
                                      width: `${target.radius * 2}%`,
                                      height: `${target.radius * 2}%`,
                                      transform: 'translate(-50%, -50%)',
                                    }}
                                  >
                                    Vùng {tIdx + 1}
                                  </div>
                                );
                              })}

                              {/* Placed dots */}
                              {dots.map((dot: any, dIdx: number) => {
                                const isDragging = draggingDot && draggingDot.qId === currentQ.QuestionID && draggingDot.index === dIdx;
                                
                                // Check if this dot is close enough to ANY target hotspot
                                let isDotCorrect = false;
                                if (isFeedbackActive) {
                                  isDotCorrect = hotspotsList.some((target: any) => {
                                    const w = target.width ?? target.w;
                                    const h = target.height ?? target.h;
                                    if (w !== undefined && h !== undefined) {
                                      // Rectangular bounding box check
                                      return dot.x >= target.x && dot.x <= (target.x + w) &&
                                             dot.y >= target.y && dot.y <= (target.y + h);
                                    } else {
                                      // Fallback circle distance check
                                      const radius = target.radius || 15;
                                      const dist = Math.sqrt(Math.pow(dot.x - target.centerX, 2) + Math.pow(dot.y - target.centerY, 2));
                                      return dist <= radius;
                                    }
                                  });
                                }

                                return (
                                  <div
                                    key={dIdx}
                                    className={`student-hotspot-dot absolute w-7 h-7 text-white rounded-full flex items-center justify-center font-extrabold text-xs shadow-md border-2 border-white select-none z-10 transition-all ${
                                      isFeedbackActive
                                        ? isDotCorrect
                                          ? 'bg-green-500 border-green-200'
                                          : 'bg-red-500 border-red-200'
                                        : isDragging
                                          ? 'scale-110 shadow-lg ring-4 ring-rose-400/30 bg-rose-500 cursor-move'
                                          : 'hover:scale-105 active:scale-95 bg-rose-500 cursor-move'
                                    }`}
                                    style={{
                                      left: `${dot.x}%`,
                                      top: `${dot.y}%`,
                                      transform: 'translate(-50%, -50%)',
                                      touchAction: 'none',
                                    }}
                                    onPointerDown={(e) => {
                                      if (isFeedbackActive) return;
                                      const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                                      if (!rect) return;
                                      e.stopPropagation();
                                      setDraggingDot({
                                        qId: currentQ.QuestionID,
                                        index: dIdx,
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        startDotX: dot.x,
                                        startDotY: dot.y,
                                        containerWidth: rect.width,
                                        containerHeight: rect.height,
                                      });
                                      e.currentTarget.setPointerCapture(e.pointerId);
                                    }}
                                    onPointerMove={(e) => {
                                      if (isFeedbackActive) return;
                                      if (draggingDot && draggingDot.qId === currentQ.QuestionID && draggingDot.index === dIdx) {
                                        const deltaX = e.clientX - draggingDot.startX;
                                        const deltaY = e.clientY - draggingDot.startY;

                                        const deltaXPct = (deltaX / draggingDot.containerWidth) * 100;
                                        const deltaYPct = (deltaY / draggingDot.containerHeight) * 100;

                                        const newX = Math.round(draggingDot.startDotX + deltaXPct);
                                        const newY = Math.round(draggingDot.startDotY + deltaYPct);

                                        const boundedX = Math.max(0, Math.min(100, newX));
                                        const boundedY = Math.max(0, Math.min(100, newY));

                                        const arr = [...dots];
                                        if (arr[dIdx]) {
                                          arr[dIdx] = { x: boundedX, y: boundedY };
                                          handleSelectAnswer(currentQ.QuestionID, arr);
                                        }
                                      }
                                    }}
                                    onPointerUp={(e) => {
                                      if (isFeedbackActive) return;
                                      if (draggingDot && draggingDot.qId === currentQ.QuestionID && draggingDot.index === dIdx) {
                                        e.currentTarget.releasePointerCapture(e.pointerId);
                                        setDraggingDot(null);
                                      }
                                    }}
                                    title={isFeedbackActive ? (isDotCorrect ? 'Đúng vị trí' : 'Sai vị trí') : `Dấu chấm ${dIdx + 1} (Kéo để di chuyển)`}
                                  >
                                    {dIdx + 1}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {showDebug && imageBounds && (
                        <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-[10px] space-y-2 border border-slate-700 shadow-inner max-w-2xl mx-auto">
                          <div className="font-bold text-indigo-400 border-b border-slate-700 pb-1 flex justify-between items-center">
                            <span>THÔNG TIN DEBUG COORDINATES (REAL-TIME % VS PX)</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">VIEWER</span>
                          </div>
                          <div>
                            <strong>Kích thước ảnh hiển thị (Rendered img size):</strong> {Math.round(imageBounds.width)}px × {Math.round(imageBounds.height)}px
                          </div>
                          <div className="space-y-1">
                            <strong>Dấu chấm học sinh đã đặt (Student Placed Dots):</strong>
                            {dots.map((d: any, idx: number) => {
                              const leftPx = Math.round((d.x / 100) * imageBounds.width);
                              const topPx = Math.round((d.y / 100) * imageBounds.height);
                              return (
                                <div key={idx} className="pl-3 border-l-2 border-rose-500/40">
                                  <span className="text-rose-300 font-bold">Dấu chấm #{idx + 1}:</span>
                                  <div className="pl-2 text-slate-300">
                                    • Coordinates (%): <code className="text-amber-300">x={d.x}%, y={d.y}%</code>
                                    <br />
                                    • Rendered (px): <code className="text-emerald-300">Left={leftPx}px, Top={topPx}px</code>
                                  </div>
                                </div>
                              );
                            })}
                            {dots.length === 0 && (
                              <div className="text-slate-400 italic pl-3">Học sinh chưa đặt dấu chấm nào.</div>
                            )}
                          </div>
                          <div className="space-y-1 border-t border-slate-800 pt-2">
                            <strong>Vùng đáp án giáo viên đã cấu hình (Teacher Target Hotspots):</strong>
                            {hotspotsList.map((h: any, idx: number) => {
                              const wPct = h.width ?? h.w;
                              const hPct = h.height ?? h.h;
                              const isRect = wPct !== undefined && hPct !== undefined;

                              const leftPx = Math.round((h.x / 100) * imageBounds.width);
                              const topPx = Math.round((h.y / 100) * imageBounds.height);
                              const wPx = isRect ? Math.round((wPct / 100) * imageBounds.width) : 0;
                              const hPx = isRect ? Math.round((hPct / 100) * imageBounds.height) : 0;
                              return (
                                <div key={idx} className="pl-3 border-l-2 border-green-500/40">
                                  <span className="text-green-300 font-bold">Vùng #{idx + 1} ({h.name || 'Không tên'}):</span>
                                  <div className="pl-2 text-slate-300">
                                    • Saved (%): <code className="text-amber-300">x={h.x}%, y={h.y}%{isRect ? `, w=${wPct}%, h=${hPct}%` : `, r=${h.radius}%`}</code>
                                    <br />
                                    • Rendered (px): <code className="text-emerald-300">Left={leftPx}px, Top={topPx}px{isRect ? `, Width=${wPx}px, Height=${hPx}px` : `, Radius=${Math.round((h.radius / 100) * imageBounds.width)}px`}</code>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 max-w-2xl mx-auto">
                        <span className="text-xs font-bold text-slate-500">
                          Đã đánh dấu: <strong className="text-indigo-600 font-extrabold">{dots.length}</strong> / <strong className="text-slate-700">{targetCount}</strong> dấu chấm
                        </span>

                        {dots.length > 0 && !isFeedbackActive && (
                          <button
                            type="button"
                            onClick={() => handleSelectAnswer(currentQ.QuestionID, [])}
                            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-500 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Xóa tất cả dấu chấm
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 10. MATCH IMAGE TO TEXT */}
                {currentQ.QuestionType?.toLowerCase() === 'match image to text' && parsedAnswers.imageOptions && parsedAnswers.textTargets && (() => {
                  const currentAnswer = answersState[currentQ.QuestionID] || Array(parsedAnswers.imageOptions.length).fill(null);
                  
                  // Get images that are NOT assigned to any text
                  // i.e., indices where currentAnswer[imgIdx] is null or undefined
                  const unassignedImageIndices = shuffledImageIndices.filter(imgIdx => currentAnswer[imgIdx] === null || currentAnswer[imgIdx] === undefined);

                  let correctOrder: number[] = [];
                  try {
                    correctOrder = JSON.parse(currentQ.CorrectAnswer || '[]');
                  } catch (e) {
                    console.error(e);
                  }

                  return (
                    <div className="space-y-4">
                      <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 p-3.5 rounded-2xl text-xs font-bold leading-relaxed shadow-sm">
                        💡 <strong>Hướng dẫn kéo thả:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-1 font-medium text-indigo-600">
                          <li><strong>Cách 1:</strong> Nhấp chuột và giữ kéo hình ảnh từ cột bên phải, thả vào ô trống bên cạnh mô tả tương ứng ở cột bên trái.</li>
                          <li><strong>Cách 2 (Trên điện thoại):</strong> Nhấp vào hình ảnh ở cột bên phải để chọn (ảnh sẽ nhấp nháy xanh), sau đó chạm vào ô trống bên trái để ghép cặp.</li>
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        {/* LEFT COLUMN: DESCRIPTION SLOTS */}
                        <div className="md:col-span-7 space-y-3">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Cột Trái: Mô tả văn bản</h4>
                          
                          {parsedAnswers.textTargets.map((tgt, tIdx) => {
                            // Find if any image is matched with this text index (tIdx)
                            const matchedImgIdx = currentAnswer.findIndex((val: any) => val === tIdx);
                            const hasMatch = matchedImgIdx !== -1;
                            const isMatchCorrect = hasMatch && correctOrder[matchedImgIdx] === tIdx;

                            // Also find what the correct image index is for this slot
                            const correctImgIdxForSlot = correctOrder.indexOf(tIdx);

                            return (
                              <div 
                                key={tIdx} 
                                className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 min-h-[90px] shadow-sm hover:shadow transition"
                              >
                                {/* Text description card */}
                                <div className="flex-1 flex gap-2 items-start">
                                  <span className="flex items-center justify-center w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black mt-0.5 flex-shrink-0">
                                    {tIdx + 1}
                                  </span>
                                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                                    {tgt}
                                  </p>
                                </div>

                                <div className="text-slate-300 font-extrabold text-sm select-none">➔</div>

                                {/* Drop / Match Slot */}
                                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                  <div
                                    className={`relative w-28 h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-1 transition-all flex-shrink-0 ${
                                      isFeedbackActive
                                        ? hasMatch
                                          ? isMatchCorrect
                                            ? 'border-green-500 bg-green-50/20'
                                            : 'border-red-500 bg-red-50/20'
                                          : 'border-slate-200 bg-slate-50/50'
                                        : hasMatch 
                                          ? 'border-indigo-200 bg-indigo-50/20' 
                                          : selectedMatchImgIdx !== null
                                            ? 'border-indigo-400 bg-indigo-50 animate-pulse cursor-pointer'
                                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                    onDragOver={(e) => !isFeedbackActive && e.preventDefault()}
                                    onDragEnter={(e) => {
                                      if (isFeedbackActive) return;
                                      e.preventDefault();
                                      e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50');
                                    }}
                                    onDragLeave={(e) => {
                                      if (isFeedbackActive) return;
                                      e.preventDefault();
                                      e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
                                    }}
                                    onDrop={(e) => {
                                      if (isFeedbackActive) return;
                                      e.preventDefault();
                                      e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
                                      const imgIdxStr = e.dataTransfer.getData("text/plain");
                                      if (imgIdxStr !== "") {
                                        const imgIdx = parseInt(imgIdxStr, 10);
                                        const arr = [...currentAnswer];
                                        // Clear other assignments to this text slot (1-to-1)
                                        arr.forEach((val, i) => {
                                          if (val === tIdx) {
                                            arr[i] = null;
                                          }
                                        });
                                        arr[imgIdx] = tIdx;
                                        handleSelectAnswer(currentQ.QuestionID, arr);
                                        setSelectedMatchImgIdx(null);
                                      }
                                    }}
                                    onClick={() => {
                                      if (isFeedbackActive) return;
                                      if (selectedMatchImgIdx !== null) {
                                        const arr = [...currentAnswer];
                                        arr.forEach((val, i) => {
                                          if (val === tIdx) {
                                            arr[i] = null;
                                          }
                                        });
                                        arr[selectedMatchImgIdx] = tIdx;
                                        handleSelectAnswer(currentQ.QuestionID, arr);
                                        setSelectedMatchImgIdx(null);
                                      }
                                    }}
                                  >
                                    {hasMatch ? (
                                      <div className="relative w-full h-full group">
                                        <img 
                                          src={parsedAnswers.imageOptions?.[matchedImgIdx]} 
                                          alt={`Matched visual ${matchedImgIdx}`} 
                                          className="w-full h-full object-contain rounded-lg pointer-events-none"
                                        />
                                        {/* Remove Assignment button */}
                                        {!isFeedbackActive && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const arr = [...currentAnswer];
                                              arr[matchedImgIdx] = null;
                                              handleSelectAnswer(currentQ.QuestionID, arr);
                                            }}
                                            className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white p-0.5 rounded-full shadow transition-transform hover:scale-110 cursor-pointer"
                                            title="Hủy ghép cặp"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                        <div className={`absolute bottom-0.5 left-0.5 text-[8px] px-1 py-0.5 rounded font-black ${
                                          isFeedbackActive
                                            ? isMatchCorrect
                                              ? 'bg-green-600 text-white'
                                              : 'bg-red-600 text-white'
                                            : 'bg-slate-900/70 text-white'
                                        }`}>
                                          Ảnh {matchedImgIdx + 1}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center pointer-events-none select-none p-1">
                                        <span className="text-[10px] font-extrabold text-slate-400 block leading-tight">
                                          {selectedMatchImgIdx !== null ? 'Chạm để thả' : 'Thả ảnh ở đây'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {isFeedbackActive && !isMatchCorrect && correctImgIdxForSlot !== -1 && (
                                    <span className="text-[9px] font-black text-green-600 text-center leading-tight mt-0.5">
                                      ✓ Ảnh đúng: {correctImgIdxForSlot + 1}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* RIGHT COLUMN: IMAGES POOL */}
                        <div className="md:col-span-5 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 min-h-[300px]">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Cột Phải: Hình ảnh minh họa</h4>
                            <span className="text-[10px] font-extrabold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                              Còn {unassignedImageIndices.length} ảnh
                            </span>
                          </div>

                          {unassignedImageIndices.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                              {unassignedImageIndices.map((imgIdx) => {
                                const isSelected = selectedMatchImgIdx === imgIdx;
                                const imgUrl = parsedAnswers.imageOptions?.[imgIdx];

                                return (
                                  <div
                                    key={imgIdx}
                                    draggable={!isFeedbackActive ? "true" : "false"}
                                    onDragStart={(e) => {
                                      if (isFeedbackActive) return;
                                      e.dataTransfer.setData("text/plain", imgIdx.toString());
                                      setSelectedMatchImgIdx(imgIdx);
                                    }}
                                    onDragEnd={() => setSelectedMatchImgIdx(null)}
                                    onClick={() => {
                                      if (isFeedbackActive) return;
                                      if (selectedMatchImgIdx === imgIdx) {
                                        setSelectedMatchImgIdx(null);
                                      } else {
                                        setSelectedMatchImgIdx(imgIdx);
                                      }
                                    }}
                                    className={`relative aspect-square border-2 rounded-xl overflow-hidden bg-white p-1.5 shadow-sm transition-all select-none hover:shadow-md ${
                                      isFeedbackActive
                                        ? 'border-slate-200 opacity-50 cursor-default'
                                        : isSelected
                                          ? 'border-indigo-500 ring-4 ring-indigo-500/20 scale-105 shadow-md cursor-grab active:cursor-grabbing'
                                          : 'border-slate-200 hover:border-slate-300 cursor-grab active:cursor-grabbing'
                                    }`}
                                    title={isFeedbackActive ? undefined : "Nhấp để chọn hoặc kéo thả sang trái"}
                                  >
                                    <img 
                                      src={imgUrl} 
                                      alt={`Option visual ${imgIdx}`} 
                                      className="w-full h-full object-contain rounded-lg pointer-events-none" 
                                    />
                                    
                                    <div className="absolute bottom-1 right-1 bg-slate-900/60 text-[8px] text-white px-1 rounded font-black">
                                      Ảnh {imgIdx + 1}
                                    </div>

                                    {isSelected && !isFeedbackActive && (
                                      <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center">
                                        <div className="bg-indigo-600 text-white text-[9px] font-black px-2 py-1 rounded-full shadow-sm animate-bounce">
                                          Đang chọn
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-inner">
                                <Check className="w-6 h-6" />
                              </div>
                              <span className="text-xs font-bold text-slate-700 block">Ghép cặp hoàn tất!</span>
                              <span className="text-[10px] text-slate-400 mt-0.5">Bạn có thể hủy các cặp đã ghép ở cột trái để chọn lại.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reset Match option */}
                      {currentAnswer.some((val: any) => val !== null) && !isFeedbackActive && (
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const cleared = Array(parsedAnswers.imageOptions?.length || 0).fill(null);
                              handleSelectAnswer(currentQ.QuestionID, cleared);
                              setSelectedMatchImgIdx(null);
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-500 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Xóa tất cả các cặp
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 11. MATRIX SELECTION */}
                {currentQ.QuestionType === 'Matrix Selection' && parsedAnswers.matrixRows && parsedAnswers.matrixCols && (
                  <div className="space-y-4">
                    <p className="text-xs text-blue-600 font-bold bg-blue-50 p-2.5 rounded-lg mb-1">
                      💡 Chọn đúng một phương án cho từng dòng phát biểu dưới đây:
                    </p>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr>
                            <th className="p-3.5 border-b border-r border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Danh sách phát biểu / Câu hỏi phụ
                            </th>
                            {parsedAnswers.matrixCols.map((col, cIdx) => (
                              <th 
                                key={cIdx} 
                                className="p-3.5 text-center font-bold text-white bg-[#0066cc] border-b border-l border-slate-200 text-xs min-w-[100px] leading-tight select-none"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {parsedAnswers.matrixRows.map((rowVal) => {
                            const selectedCol = (currentAnswer || {})[rowVal];
                            let correctMap: Record<string, string> = {};
                            try {
                              correctMap = JSON.parse(currentQ.CorrectAnswer || '{}');
                            } catch (e) {
                              console.error(e);
                            }
                            const correctCol = correctMap[rowVal];

                            return (
                              <tr key={rowVal} className="hover:bg-slate-50/50 transition">
                                <td className={`p-3.5 border-r border-slate-200 text-xs font-semibold leading-relaxed max-w-[320px] break-words ${
                                  isFeedbackActive
                                    ? selectedCol === correctCol
                                      ? 'text-green-800 bg-green-50/20'
                                      : 'text-red-800 bg-red-50/20'
                                    : 'text-slate-700'
                                }`}>
                                  {rowVal}
                                  {isFeedbackActive && selectedCol !== correctCol && (
                                    <span className="block text-[10px] text-green-600 font-black mt-1">
                                      ✓ Đúng: {correctCol}
                                    </span>
                                  )}
                                </td>
                                {parsedAnswers.matrixCols?.map((colVal) => {
                                  const isChecked = selectedCol === colVal;
                                  const isCorrectCell = colVal === correctCol;

                                  let buttonStyle = 'border-slate-400 bg-white';
                                  let innerCircleStyle = 'bg-transparent scale-0';

                                  if (isFeedbackActive) {
                                    if (isCorrectCell) {
                                      buttonStyle = 'border-green-500 bg-green-50 text-green-600';
                                      innerCircleStyle = 'bg-green-600 scale-100';
                                    } else if (isChecked) {
                                      buttonStyle = 'border-red-500 bg-red-50 text-red-600';
                                      innerCircleStyle = 'bg-red-600 scale-100';
                                    } else {
                                      buttonStyle = 'border-slate-200 bg-slate-50 opacity-40';
                                      innerCircleStyle = 'bg-transparent scale-0';
                                    }
                                  } else {
                                    if (isChecked) {
                                      buttonStyle = 'border-[#0066cc] bg-[#e6f0fa]';
                                      innerCircleStyle = 'bg-[#0066cc] scale-100';
                                    }
                                  }

                                  return (
                                    <td key={colVal} className="p-3 border-l border-slate-200 text-center">
                                      <button
                                        type="button"
                                        disabled={isFeedbackActive}
                                        onClick={() => {
                                          const updated = { ...(currentAnswer || {}) };
                                          updated[rowVal] = colVal;
                                          handleSelectAnswer(currentQ.QuestionID, updated);
                                        }}
                                        className={`w-5 h-5 rounded-full border flex items-center justify-center mx-auto transition-all shadow-sm ${
                                          isFeedbackActive ? 'cursor-default' : 'cursor-pointer hover:border-[#0066cc] hover:scale-110 active:scale-95'
                                        } ${buttonStyle}`}
                                        title={`Chọn "${colVal}"`}
                                      >
                                        <div className={`w-3 h-3 rounded-full transition-all ${innerCircleStyle}`} />
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              
              {isReviewMode && currentQ.Explanation && (
                <div className="mt-6 bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-[11px] sm:text-xs leading-relaxed text-blue-800">
                  <p className="font-extrabold flex items-center gap-1.5 text-xs mb-1">
                    <HelpCircle className="w-4 h-4 text-blue-500" /> Giải thích chi tiết câu hỏi:
                  </p>
                  <p className="whitespace-pre-wrap mt-1">
                    {currentQ.Explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination controls */}
            <div className="flex justify-between items-center gap-4">
              {isReviewMode ? (
                <>
                  <button
                    disabled={currentIdx === 0}
                    onClick={handlePrev}
                    className="px-4 py-2.5 bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer select-none"
                  >
                    <ArrowLeft className="w-4 h-4" /> Câu trước
                  </button>

                  <button
                    onClick={() => setIsReviewMode(false)}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all select-none cursor-pointer"
                  >
                    Quay lại bảng kết quả
                  </button>

                  {currentIdx < questions.length - 1 ? (
                    <button
                      onClick={handleNext}
                      className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer select-none"
                    >
                      Câu tiếp theo <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="w-[100px]" />
                  )}
                </>
              ) : mode === 'testing' ? (
                <>
                  <button
                    disabled={currentIdx === 0}
                    onClick={handlePrev}
                    className="px-4 py-2.5 bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer select-none"
                  >
                    <ArrowLeft className="w-4 h-4" /> Câu trước
                  </button>

                  {currentIdx < questions.length - 1 ? (
                    <button
                      onClick={handleNext}
                      className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer select-none"
                    >
                      Câu tiếp theo <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      disabled={hasUnanswered}
                      onClick={handleFinish}
                      className={`px-6 py-2.5 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-md transition-all select-none ${
                        hasUnanswered
                          ? 'bg-slate-300 shadow-none cursor-not-allowed'
                          : 'bg-green-500 hover:bg-green-600 shadow-green-100 cursor-pointer'
                      }`}
                      title={hasUnanswered ? 'Vui lòng chọn đáp án cho tất cả câu hỏi trước khi nộp' : 'Nộp bài thi'}
                    >
                      <Save className="w-4 h-4" /> Nộp bài thi
                    </button>
                  )}
                </>
              ) : mode === 'training' ? (
                <>
                  {submittedQuestions[currentQ.QuestionID] ? (
                    <>
                      <button
                        disabled={currentIdx === 0}
                        onClick={handlePrev}
                        className="px-4 py-2.5 bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer select-none"
                      >
                        <ArrowLeft className="w-4 h-4" /> Câu trước
                      </button>

                      {currentIdx < questions.length - 1 ? (
                        <button
                          onClick={handleNext}
                          className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer select-none"
                        >
                          Câu tiếp theo <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          disabled={hasUnanswered}
                          onClick={handleFinish}
                          className={`px-6 py-2.5 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-md transition-all select-none ${
                            hasUnanswered
                              ? 'bg-slate-300 shadow-none cursor-not-allowed'
                              : 'bg-green-500 hover:bg-green-600 shadow-green-100 cursor-pointer'
                          }`}
                        >
                          <Save className="w-4 h-4" /> Hoàn thành bài học
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        disabled={currentIdx === 0}
                        onClick={handlePrev}
                        className="px-4 py-2.5 bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer select-none"
                      >
                        <ArrowLeft className="w-4 h-4" /> Câu trước
                      </button>
                      <button
                        disabled={!isCurrentAnswered}
                        onClick={handleSubmitQuestion}
                        className={`px-6 py-2.5 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-md transition-all select-none ${
                          !isCurrentAnswered
                            ? 'bg-slate-300 shadow-none cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 shadow-blue-100 cursor-pointer'
                        }`}
                      >
                        <Check className="w-4 h-4" /> Nộp câu trả lời
                      </button>
                    </>
                  )}
                </>
              ) : (
                /* Race mode */
                <div className="w-full">
                  {submittedQuestions[currentQ.QuestionID] ? (
                    <div className="flex gap-4">
                      {currentIdx < questions.length - 1 ? (
                        <button
                          onClick={handleNext}
                          className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all select-none cursor-pointer"
                        >
                          Câu tiếp theo <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          disabled={hasUnanswered}
                          onClick={handleFinish}
                          className={`w-full py-3.5 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all select-none ${
                            hasUnanswered
                              ? 'bg-slate-300 shadow-none cursor-not-allowed'
                              : 'bg-green-500 hover:bg-green-600 shadow-green-100 cursor-pointer'
                          }`}
                        >
                          <Save className="w-4 h-4" /> Nộp bài và hoàn tất
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      disabled={!isCurrentAnswered}
                      onClick={handleSubmitQuestion}
                      className={`w-full py-3.5 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all select-none ${
                        !isCurrentAnswered
                          ? 'bg-slate-300 shadow-none cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 shadow-blue-100 cursor-pointer'
                      }`}
                    >
                      <Check className="w-4 h-4" /> Nộp câu trả lời
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT NAVIGATION PANEL: QUICK SELECT CƠ SỐ CÂU HỎI */}
          <div className="bg-white border border-blue-100/60 rounded-3xl p-5 shadow-sm space-y-5 h-fit lg:sticky lg:top-20">
            <div>
              <h4 className="text-sm font-black text-slate-800">Bảng tiến trình</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">Theo dõi trạng thái câu trả lời</p>
            </div>

            {/* Question matrix circles */}
            <div className="grid grid-cols-4 gap-2.5">
              {questions.map((q, idx) => {
                const ans = answersState[q.QuestionID];
                const isSelected = currentIdx === idx;
                const isAnswered = (() => {
                  if (ans === null || ans === undefined) return false;
                  if (Array.isArray(ans)) {
                    if (q.QuestionType?.toLowerCase() === 'match image to text') {
                      return ans.some(v => v !== null && v !== undefined);
                    }
                    return ans.length > 0;
                  }
                  if (typeof ans === 'object') {
                    return Object.keys(ans).length > 0;
                  }
                  return String(ans).trim() !== '';
                })();
                const isFlagged = flaggedQuestions[q.QuestionID];

                return (
                  <button
                    key={q.QuestionID}
                    onClick={() => {
                      if (mode === 'testing' || mode === 'training' || isReviewMode) {
                        setCurrentIdx(idx);
                      }
                    }}
                    disabled={mode !== 'testing' && mode !== 'training' && !isReviewMode}
                    className={`h-9 w-full rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 relative ${
                      (mode === 'testing' || mode === 'training' || isReviewMode) ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      isReviewMode
                        ? isSelected
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 ring-offset-2'
                          : gradeQuestion(q, answersState[q.QuestionID])
                          ? 'bg-green-100 border border-green-300 text-green-700 font-black hover:bg-green-200'
                          : 'bg-red-100 border border-red-300 text-red-700 font-black hover:bg-red-200'
                        : isSelected
                        ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
                        : isAnswered
                        ? isFlagged
                          ? 'bg-amber-50 text-amber-700 border-2 border-amber-400 font-black'
                          : 'bg-blue-50 text-blue-600 border border-blue-100 font-black'
                        : isFlagged
                        ? 'bg-amber-50/40 text-amber-600 border-2 border-amber-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <Flag className={`w-3 h-3 shrink-0 ${isSelected ? 'text-white fill-white' : 'text-amber-500 fill-amber-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {isReviewMode ? (
              <div className="pt-4 border-t border-slate-100 space-y-2 text-[10px] font-bold text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-blue-600 ring-2 ring-blue-300 ring-offset-1 shrink-0" />
                  <span>Đang chọn</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-green-100 border border-green-300 shrink-0" />
                  <span>Trả lời đúng</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-red-100 border border-red-300 shrink-0" />
                  <span>Trả lời sai</span>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-slate-100 space-y-2 text-[10px] font-bold text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-blue-500 shrink-0" />
                  <span>Đang chọn</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100 shrink-0" />
                  <span>Đã làm</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-slate-100 shrink-0" />
                  <span>Chưa làm</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-amber-50 text-amber-600 border border-amber-300 flex items-center justify-center shrink-0">
                    <Flag className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  </span>
                  <span>Đã gắn cờ</span>
                </div>
              </div>
            )}

            {isReviewMode ? (
              <button
                onClick={() => setIsReviewMode(false)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow-md transition-all select-none cursor-pointer"
              >
                Quay lại bảng kết quả
              </button>
            ) : (
              (mode === 'testing' || mode === 'training') && (
                <button
                  disabled={hasUnanswered}
                  onClick={handleFinish}
                  className={`w-full py-3 text-white text-xs font-extrabold rounded-xl shadow-md transition-all select-none ${
                    hasUnanswered
                      ? 'bg-slate-300 shadow-none cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 shadow-green-100 cursor-pointer'
                  }`}
                  title={
                    hasUnanswered 
                      ? 'Vui lòng chọn đáp án cho tất cả câu hỏi trước khi hoàn tất' 
                      : mode === 'testing' 
                      ? 'Nộp bài ngay' 
                      : 'Hoàn thành bài học'
                  }
                >
                  {hasUnanswered 
                    ? 'Chưa hoàn thành tất cả' 
                    : mode === 'testing' 
                    ? 'Nộp bài ngay' 
                    : 'Hoàn thành bài học'
                  }
                </button>
              )
            )}
          </div>
        </div>
      ) : (
        /* QUIZ SUMMARY & REVIEW RESULT PAGE */
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
          {/* Banner */}
          <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg shadow-blue-100 text-center">
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

            <div className="relative z-10 space-y-4">
              <Award className="w-16 h-16 text-yellow-300 mx-auto animate-bounce" />
              <h2 className="text-2xl sm:text-3xl font-extrabold">Đã hoàn thành đề thi! 🏆</h2>
              <p className="text-sm text-blue-50 max-w-md mx-auto">
                Chúc mừng bạn đã nỗ lực làm bài ôn tập {exam.ExamID}. Kết quả của bạn đã được ghi nhận thành công!
              </p>

              {/* Score visual */}
              <div className="inline-block bg-white/10 backdrop-blur border border-white/20 px-8 py-4 rounded-2xl">
                <p className="text-[11px] font-black uppercase tracking-wider text-blue-100">Điểm số đạt được</p>
                <p className="text-5xl font-black mt-1">{scoreRecord?.Score}%</p>
              </div>

              {/* Stats detail row */}
              <div className="flex justify-center gap-6 text-sm font-bold mt-4">
                <div className="bg-white/10 px-4 py-2 rounded-xl">
                  <p className="text-xs text-blue-200">Đúng</p>
                  <p className="text-lg font-black text-green-300">+{scoreRecord?.Correct} câu</p>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-xl">
                  <p className="text-xs text-blue-200">Sai / Bỏ sót</p>
                  <p className="text-lg font-black text-red-300">-{scoreRecord?.Wrong} câu</p>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-xl">
                  <p className="text-xs text-blue-200">Thời gian làm</p>
                  <p className="text-lg font-black text-amber-300">{formatTimer(scoreRecord?.Time || 0)}</p>
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={onBack}
                  className="w-full sm:w-auto px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer select-none"
                >
                  Quay lại trang chính
                </button>
                <button
                  onClick={() => {
                    setCurrentIdx(0);
                    setIsReviewMode(true);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-900 text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer select-none flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4 animate-spin-slow" /> Xem lại đáp án chi tiết
                </button>
              </div>
            </div>
          </div>


        </div>
      )}

      {/* FEEDBACK MODAL FOR TRAINING & RACE MODE */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-slate-900/10 z-50 flex items-center justify-center p-4">
          <div 
            style={{ transform: `translate(${feedbackModalPos.x}px, ${feedbackModalPos.y}px)` }}
            onMouseDown={handleModalDragStart}
            className={`bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-slate-200 shadow-2xl relative animate-scale-up select-none ${
              isDraggingModal ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* Drag Handle Bar */}
            <div 
              className="h-8 bg-slate-50 hover:bg-slate-100 border-b border-slate-100 flex items-center justify-center select-none group px-4 transition-colors"
              title="Nhấp và kéo để di chuyển bảng kết quả"
            >
              <div className="w-12 h-1 bg-slate-300 rounded-full group-hover:bg-slate-400 transition" />
            </div>

            <div className="p-6 sm:p-8 text-center space-y-6">
              {/* Animated visual state */}
              <div className="flex justify-center">
                {feedbackIsCorrect ? (
                  <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center border-4 border-green-200 shadow-md">
                    <Check className="w-10 h-10 text-green-500 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center border-4 border-rose-200 shadow-md">
                    <X className="w-10 h-10 text-rose-500 stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className={`text-xl font-black ${feedbackIsCorrect ? 'text-green-600' : 'text-rose-600'}`}>
                  {feedbackIsCorrect ? 'Kết quả: Chính xác! 🎉' : 'Kết quả: Chưa chính xác! ❌'}
                </h3>
                {mode === 'race' && !feedbackIsCorrect && (
                  <p className="text-xs text-rose-500 font-extrabold bg-rose-50 py-2.5 rounded-xl border border-rose-100 px-4">
                    ⚠️ Chế độ Đua Tốc Độ yêu cầu bạn làm lại từ đầu! Thử thách đã dừng.
                  </p>
                )}
              </div>

              {/* Detailed Explanation */}
              {currentQ.Explanation && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-left max-h-[180px] overflow-y-auto">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-500 block mb-1">
                    Giải thích chi tiết:
                  </span>
                  <p className="text-xs text-blue-900 leading-relaxed font-semibold whitespace-pre-wrap">
                    {currentQ.Explanation}
                  </p>
                </div>
              )}

              {/* Button Action */}
              <button
                onClick={handleFeedbackNext}
                className={`w-full py-3.5 text-white text-xs font-black rounded-xl transition shadow-md cursor-pointer select-none ${
                  feedbackIsCorrect
                    ? 'bg-green-500 hover:bg-green-600 shadow-green-100'
                    : mode === 'race'
                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100'
                    : 'bg-blue-500 hover:bg-blue-600 shadow-blue-100'
                }`}
              >
                {mode === 'race' && !feedbackIsCorrect 
                  ? 'Làm lại từ đầu' 
                  : mode === 'training' || (mode === 'race' && currentIdx === questions.length - 1)
                  ? 'Xác nhận' 
                  : currentIdx < questions.length - 1 
                  ? 'Câu tiếp theo' 
                  : 'Nộp bài và hoàn tất'
                }
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
