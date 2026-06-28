'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Exam, Question, ScoreRecord, QuestionAnswers } from '@/lib/types';
import { DatabaseService } from '@/lib/database-service';
import { Check, X, Clock, Award, AlertCircle, ArrowLeft, ArrowRight, Save, Play, RefreshCw, Volume2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuizPlayerProps {
  exam: Exam;
  level: 'LV1' | 'LV2' | 'LV3';
  student: any;
  onBack: () => void;
  syncTrigger: number;
}

export default function QuizPlayer({ exam, level, student, onBack, syncTrigger }: QuizPlayerProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answersState, setAnswersState] = useState<Record<string, any>>({}); // Map QuestionID -> Student's answer
  const [timer, setTimer] = useState(0); // in seconds
  const [quizFinished, setQuizFinished] = useState(false);
  const [scoreRecord, setScoreRecord] = useState<ScoreRecord | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load questions
  useEffect(() => {
    async function fetchQuestions() {
      setLoading(true);
      try {
        // Fetch all questions for this exam
        const { questions: allQs } = await DatabaseService.getQuestions({
          level,
          examId: exam.ExamID,
        });

        // Match exactly the order in the Exam's questionIDs list
        const orderedQs = exam.QuestionIDs.map((id) => allQs.find((q) => q.QuestionID === id)).filter(Boolean) as Question[];

        setQuestions(orderedQs);

        // Initialize state
        const initialAnswers: Record<string, any> = {};
        orderedQs.forEach((q) => {
          const parsedAnswers: QuestionAnswers = JSON.parse(q.Answers);
          if (q.QuestionType === 'Multiple Choice' || q.QuestionType === 'True / False' || q.QuestionType === 'Video Based') {
            initialAnswers[q.QuestionID] = null;
          } else if (q.QuestionType === 'Multiple Response') {
            initialAnswers[q.QuestionID] = [];
          } else if (q.QuestionType === 'Matching') {
            initialAnswers[q.QuestionID] = {}; // leftItem -> rightItem
          } else if (q.QuestionType === 'Sequence Ordering') {
            initialAnswers[q.QuestionID] = parsedAnswers.sequenceItems ? [...parsedAnswers.sequenceItems] : [];
          } else if (q.QuestionType === 'True/False Multiple') {
            initialAnswers[q.QuestionID] = {}; // statement -> true/false
          } else if (q.QuestionType === 'Categorization') {
            initialAnswers[q.QuestionID] = {}; // item -> category
          } else if (q.QuestionType === 'Hotspot') {
            initialAnswers[q.QuestionID] = null; // selected hotspot id
          } else if (q.QuestionType === 'Match Image To Text') {
            initialAnswers[q.QuestionID] = Array(parsedAnswers.imageOptions?.length || 0).fill(null); // idx -> text index
          } else if (q.QuestionType === 'Matrix Selection') {
            initialAnswers[q.QuestionID] = {}; // row -> column
          }
        });
        setAnswersState(initialAnswers);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, [exam, level, syncTrigger]);

  // Start Timer
  useEffect(() => {
    if (!loading && !quizFinished && questions.length > 0) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, quizFinished, questions]);

  const handleSelectAnswer = (qId: string, answer: any) => {
    setAnswersState((prev) => ({
      ...prev,
      [qId]: answer,
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

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
        return String(studentAnswer) === String(correctAnsStr);
      }

      if (q.QuestionType === 'Match Image To Text') {
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

  const handleFinish = async () => {
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

    const record: ScoreRecord = {
      StudentID: student.StudentID,
      StudentName: student.FullName,
      ExamID: exam.ExamID,
      Level: level,
      Score: scorePct,
      Correct: correctCount,
      Wrong: wrongCount,
      Time: timer,
      SubmitTime: new Date().toISOString(),
    };

    setScoreRecord(record);
    setQuizFinished(true);

    // Save to server
    await DatabaseService.submitScore(record);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="mt-3 text-sm font-bold text-slate-500">Đang khởi tạo đề thi IC3...</p>
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

  return (
    <div id="quiz-player" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!quizFinished ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* LEFT AREA: QUESTION BOX & INTERACTIVE ANSWER TYPES (SPANNING 3 COLUMNS) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Nav Header */}
            <div className="flex justify-between items-center bg-white border border-blue-100/60 p-4 rounded-2xl shadow-sm">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Thoát làm bài
              </button>

              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-400">
                  Câu hỏi {currentIdx + 1} / {questions.length}
                </span>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-black rounded-lg border border-blue-100/40 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 animate-pulse" /> {formatTimer(timer)}
                </span>
              </div>
            </div>

            {/* Core Question & Renderer */}
            <div className="bg-white border border-blue-100/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              {/* Header Info */}
              <div className="flex justify-between items-center">
                <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black rounded-full select-none">
                  DẠNG: {currentQ.QuestionType}
                </span>
                <span className="text-xs text-slate-400 font-bold">Điểm số: {currentQ.Score}đ</span>
              </div>

              {/* Content */}
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-800 leading-relaxed">
                  {currentQ.QuestionContent}
                </h3>
              </div>

              {/* Media assets */}
              {currentQ.Image && currentQ.QuestionType !== 'Hotspot' && currentQ.QuestionType !== 'Match Image To Text' && (
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
                {currentQ.QuestionType === 'Multiple Choice' && parsedAnswers.options && (
                  <div className="space-y-3">
                    {parsedAnswers.options.map((option, idx) => {
                      const isSelected = currentAnswer === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectAnswer(currentQ.QuestionID, idx)}
                          className={`w-full text-left p-4 rounded-xl border text-sm transition-all duration-200 cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-sm'
                              : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-600'
                          }`}
                        >
                          <span>{option}</span>
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. MULTIPLE RESPONSE */}
                {currentQ.QuestionType === 'Multiple Response' && parsedAnswers.options && (
                  <div className="space-y-3">
                    {parsedAnswers.options.map((option, idx) => {
                      const isSelected = (currentAnswer || []).includes(idx);
                      const toggleOption = () => {
                        const currentList: number[] = currentAnswer || [];
                        if (currentList.includes(idx)) {
                          handleSelectAnswer(
                            currentQ.QuestionID,
                            currentList.filter((item) => item !== idx)
                          );
                        } else {
                          handleSelectAnswer(currentQ.QuestionID, [...currentList, idx]);
                        }
                      };

                      return (
                        <button
                          key={idx}
                          onClick={toggleOption}
                          className={`w-full text-left p-4 rounded-xl border text-sm transition-all duration-200 cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-bold shadow-sm'
                              : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-600'
                          }`}
                        >
                          <span>{option}</span>
                          <span
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3. TRUE / FALSE */}
                {currentQ.QuestionType === 'True / False' && (
                  <div className="grid grid-cols-2 gap-4">
                    {['Đúng', 'Sai'].map((label) => {
                      const isSelected = currentAnswer === label;
                      return (
                        <button
                          key={label}
                          onClick={() => handleSelectAnswer(currentQ.QuestionID, label)}
                          className={`py-6 rounded-2xl border text-center font-extrabold text-sm transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? label === 'Đúng'
                                ? 'bg-green-50 border-green-500 text-green-700 shadow-md shadow-green-100/50'
                                : 'bg-red-50 border-red-500 text-red-700 shadow-md shadow-red-100/50'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'
                          }`}
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

                {/* 4. MATCHING (Premium Select-to-pair Interface) */}
                {currentQ.QuestionType === 'Matching' && parsedAnswers.leftOptions && parsedAnswers.rightOptions && (
                  <div className="space-y-4">
                    <p className="text-xs text-blue-600 font-bold mb-3 bg-blue-50 p-2.5 rounded-lg">
                      💡 Click chọn một mục bên trái, sau đó click chọn một mục tương ứng bên phải để nối cặp.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left side items */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Danh sách bên trái</p>
                        {parsedAnswers.leftOptions.map((leftItem) => {
                          const pairedRight = (currentAnswer || {})[leftItem];
                          return (
                            <div
                              key={leftItem}
                              className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                                pairedRight
                                  ? 'bg-blue-50/50 border-blue-200 text-blue-800 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              <div className="font-bold mb-1.5">{leftItem}</div>
                              {pairedRight ? (
                                <div className="text-[11px] text-green-600 bg-white border border-green-200 py-1 px-2.5 rounded-md flex items-center justify-between gap-2">
                                  <span>↳ Đã ghép với: {pairedRight.slice(0, 40)}...</span>
                                  <button
                                    onClick={() => {
                                      const updated = { ...currentAnswer };
                                      delete updated[leftItem];
                                      handleSelectAnswer(currentQ.QuestionID, updated);
                                    }}
                                    className="text-red-400 hover:text-red-600 text-[10px] font-bold"
                                  >
                                    Hủy nối
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold">Chưa ghép đôi</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Right side items & Selection Pairing Panel */}
                      <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Thiết lập cặp nối</p>

                        <div className="space-y-2.5">
                          {parsedAnswers.leftOptions.map((leftVal) => (
                            <div key={leftVal} className="flex flex-col gap-1">
                              <span className="text-[10px] font-extrabold text-slate-500">Đối với &quot;{leftVal}&quot; ghép với:</span>
                              <select
                                value={currentAnswer?.[leftVal] || ''}
                                onChange={(e) => {
                                  const updated = { ...(currentAnswer || {}) };
                                  if (e.target.value === '') {
                                    delete updated[leftVal];
                                  } else {
                                    updated[leftVal] = e.target.value;
                                  }
                                  handleSelectAnswer(currentQ.QuestionID, updated);
                                }}
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none bg-white font-bold text-slate-600"
                              >
                                <option value="">-- Chưa kết nối --</option>
                                {parsedAnswers.rightOptions?.map((rOpt) => (
                                  <option key={rOpt} value={rOpt}>
                                    {rOpt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. SEQUENCE ORDERING */}
                {currentQ.QuestionType === 'Sequence Ordering' && (
                  <div className="space-y-3">
                    <p className="text-xs text-blue-600 font-bold bg-blue-50 p-2.5 rounded-lg mb-3">
                      💡 Sử dụng các phím mũi tên để sắp xếp danh sách các bước theo thứ tự đúng nhất (từ trên xuống dưới):
                    </p>

                    <div className="space-y-2">
                      {(currentAnswer || []).map((item: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm text-xs text-slate-700"
                        >
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                            {idx + 1}
                          </span>
                          <span className="flex-1 font-semibold">{item}</span>

                          {/* Quick movement controls */}
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
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                          {parsedAnswers.statements.map((stmt) => {
                            const choice = (currentAnswer || {})[stmt];

                            return (
                              <tr key={stmt} className="hover:bg-slate-50/40">
                                <td className="p-3 font-semibold text-slate-700 leading-relaxed">{stmt}</td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => {
                                      const updated = { ...(currentAnswer || {}) };
                                      updated[stmt] = 'Đúng';
                                      handleSelectAnswer(currentQ.QuestionID, updated);
                                    }}
                                    className={`w-12 py-1.5 rounded-lg border text-[10px] font-black transition cursor-pointer ${
                                      choice === 'Đúng'
                                        ? 'bg-green-50 border-green-400 text-green-700'
                                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                    }`}
                                  >
                                    ĐÚNG
                                  </button>
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => {
                                      const updated = { ...(currentAnswer || {}) };
                                      updated[stmt] = 'Sai';
                                      handleSelectAnswer(currentQ.QuestionID, updated);
                                    }}
                                    className={`w-12 py-1.5 rounded-lg border text-[10px] font-black transition cursor-pointer ${
                                      choice === 'Sai'
                                        ? 'bg-red-50 border-red-400 text-red-700'
                                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                    }`}
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
                {currentQ.QuestionType === 'Video Based' && currentQ.Video && parsedAnswers.options && (
                  <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="bg-slate-900 rounded-2xl overflow-hidden aspect-video relative shadow-inner border border-slate-800 flex items-center justify-center">
                      <video src={currentQ.Video} controls className="w-full h-full object-contain" />
                    </div>

                    <div className="space-y-3">
                      <p className="text-[11px] font-black uppercase text-indigo-500 tracking-wide">Lựa chọn của bạn:</p>
                      {parsedAnswers.options.map((option, idx) => {
                        const isSelected = currentAnswer === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectAnswer(currentQ.QuestionID, idx)}
                            className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all duration-200 cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-sm'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <span>{option}</span>
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 8. CATEGORIZATION */}
                {currentQ.QuestionType === 'Categorization' && parsedAnswers.categoryItems && parsedAnswers.categories && (
                  <div className="space-y-4">
                    <p className="text-xs text-blue-600 font-bold bg-blue-50 p-2.5 rounded-lg mb-3">
                      💡 Click chọn nhóm (Category) chính xác cho từng mục thiết bị dưới đây:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {parsedAnswers.categoryItems.map((item) => {
                        const selectedCategory = (currentAnswer || {})[item];

                        return (
                          <div
                            key={item}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="font-bold text-slate-700">{item}</span>
                            <select
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
                              className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-white font-bold text-slate-500"
                            >
                              <option value="">-- Chọn nhóm --</option>
                              {parsedAnswers.categories?.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 9. HOTSPOT (Click Image Target Coordinate) */}
                {currentQ.QuestionType === 'Hotspot' && parsedAnswers.hotspots && currentQ.Image && (
                  <div className="space-y-4">
                    <p className="text-xs text-blue-600 font-bold bg-blue-50 p-2.5 rounded-lg mb-3">
                      💡 Hãy nhấp chuột trực tiếp lên vùng tương ứng trên bức ảnh sơ đồ để chọn câu trả lời đúng của bạn:
                    </p>

                    <div className="relative border border-slate-200 rounded-2xl overflow-hidden max-w-2xl mx-auto bg-slate-900 select-none">
                      <img src={currentQ.Image} alt="Hotspot layout" className="w-full h-auto opacity-80" />

                      {/* Overlays for targets */}
                      {parsedAnswers.hotspots.map((spot) => {
                        const isSelected = currentAnswer === spot.id;

                        return (
                          <button
                            key={spot.id}
                            type="button"
                            onClick={() => handleSelectAnswer(currentQ.QuestionID, spot.id)}
                            className={`absolute border-2 transition duration-200 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-400/30 border-blue-500 ring-2 ring-blue-300'
                                : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/50'
                            }`}
                            style={{
                              left: `${spot.x}%`,
                              top: `${spot.y}%`,
                              width: `${spot.width}%`,
                              height: `${spot.height}%`,
                            }}
                            title={spot.name}
                          >
                            {isSelected && (
                              <span className="absolute -top-3.5 -right-3.5 bg-blue-500 text-white rounded-full p-0.5 shadow">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-center">
                      <span className="text-xs font-bold text-slate-400">
                        Vùng đang chọn:{' '}
                        <strong className="text-blue-600">
                          {parsedAnswers.hotspots.find((s) => s.id === currentAnswer)?.name || 'Chưa chọn'}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* 10. MATCH IMAGE TO TEXT */}
                {currentQ.QuestionType === 'Match Image To Text' && parsedAnswers.imageOptions && parsedAnswers.textTargets && (
                  <div className="space-y-4">
                    <p className="text-xs text-blue-600 font-bold bg-blue-50 p-2.5 rounded-lg mb-3">
                      💡 Chọn đúng mục mô tả văn bản phù hợp cho từng hình minh họa dưới đây:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {parsedAnswers.imageOptions.map((imgUrl, idx) => {
                        const selectedTextIdx = (currentAnswer || [])[idx];

                        return (
                          <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col items-center gap-3">
                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-slate-200/60 shadow-inner flex items-center justify-center">
                              <img src={imgUrl} alt={`Visual target ${idx}`} className="w-full h-full object-cover" />
                            </div>

                            <div className="w-full space-y-1">
                              <label className="text-[10px] font-black uppercase text-slate-400">Gán với mô tả:</label>
                              <select
                                value={selectedTextIdx === null ? '' : selectedTextIdx}
                                onChange={(e) => {
                                  const arr = [...(currentAnswer || [])];
                                  arr[idx] = e.target.value === '' ? null : Number(e.target.value);
                                  handleSelectAnswer(currentQ.QuestionID, arr);
                                }}
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none bg-white font-bold text-slate-600"
                              >
                                <option value="">-- Chọn mô tả --</option>
                                {parsedAnswers.textTargets?.map((tgt, tIdx) => (
                                  <option key={tIdx} value={tIdx}>
                                    {tgt.slice(0, 45)}...
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 11. MATRIX SELECTION */}
                {currentQ.QuestionType === 'Matrix Selection' && parsedAnswers.matrixRows && parsedAnswers.matrixCols && (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border border-slate-200 rounded-xl overflow-hidden text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200">
                            <th className="p-3 font-bold text-slate-500">Đối tượng</th>
                            {parsedAnswers.matrixCols.map((col, cIdx) => (
                              <th key={cIdx} className="p-3 text-center font-bold text-slate-500 max-w-[120px] leading-tight">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {parsedAnswers.matrixRows.map((rowVal) => {
                            const selectedCol = (currentAnswer || {})[rowVal];

                            return (
                              <tr key={rowVal} className="hover:bg-slate-50/50">
                                <td className="p-3 font-extrabold text-slate-700">{rowVal}</td>
                                {parsedAnswers.matrixCols?.map((colVal) => {
                                  const isChecked = selectedCol === colVal;

                                  return (
                                    <td key={colVal} className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = { ...(currentAnswer || {}) };
                                          updated[rowVal] = colVal;
                                          handleSelectAnswer(currentQ.QuestionID, updated);
                                        }}
                                        className={`w-5 h-5 rounded-full border mx-auto flex items-center justify-center transition cursor-pointer ${
                                          isChecked ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 bg-white'
                                        }`}
                                      >
                                        {isChecked && <Check className="w-3.5 h-3.5" />}
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
            </div>

            {/* Pagination controls */}
            <div className="flex justify-between items-center">
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
                  onClick={handleFinish}
                  className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-md shadow-green-100 cursor-pointer select-none"
                >
                  <Save className="w-4 h-4" /> Nộp bài thi
                </button>
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
                const isAnswered =
                  ans !== null &&
                  ans !== undefined &&
                  (typeof ans === 'object' ? Object.keys(ans).length > 0 : String(ans).trim() !== '');

                return (
                  <button
                    key={q.QuestionID}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 w-full rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
                        : isAnswered
                        ? 'bg-blue-50 text-blue-600 border border-blue-100 font-black'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

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
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white text-xs font-extrabold rounded-xl shadow-md shadow-green-100 transition cursor-pointer select-none"
            >
              Nộp bài ngay
            </button>
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

              <div className="pt-3">
                <button
                  onClick={onBack}
                  className="px-6 py-2.5 bg-white text-blue-600 hover:bg-slate-50 text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer select-none"
                >
                  Quay lại trang chính
                </button>
              </div>
            </div>
          </div>

          {/* DETAILED QUESTIONS REVIEW */}
          <div className="space-y-6">
            <h3 className="text-lg font-extrabold text-slate-800">Xem Lại Đáp Án Chi Tiết</h3>

            <div className="space-y-6">
              {questions.map((q, idx) => {
                const studentAns = answersState[q.QuestionID];
                const isCorrect = gradeQuestion(q, studentAns);
                const answersParsed: QuestionAnswers = JSON.parse(q.Answers);

                return (
                  <div
                    key={q.QuestionID}
                    className={`bg-white border rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden ${
                      isCorrect ? 'border-green-100 bg-green-50/10' : 'border-red-100 bg-red-50/10'
                    }`}
                  >
                    <div className="absolute right-4 top-4">
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full">
                          <Check className="w-3.5 h-3.5" /> CHÍNH XÁC
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-black px-2.5 py-1 rounded-full">
                          <X className="w-3.5 h-3.5" /> CHƯA ĐÚNG
                        </span>
                      )}
                    </div>

                    <div className="space-y-3.5 max-w-[85%]">
                      <span className="text-[10px] font-bold text-slate-400">CÂU HỎI {idx + 1}</span>
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-800 leading-relaxed">
                        {q.QuestionContent}
                      </h4>

                      {/* Display Student Answers comparison based on Question Types */}
                      <div className="text-xs space-y-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">Lựa chọn của bạn:</span>
                          <span className="font-extrabold text-slate-700 leading-relaxed">
                            {studentAns === null || studentAns === undefined ? (
                              <em className="text-red-400">Bỏ trống câu hỏi này</em>
                            ) : q.QuestionType === 'Multiple Choice' || q.QuestionType === 'Video Based' ? (
                              answersParsed.options?.[Number(studentAns)] || studentAns
                            ) : q.QuestionType === 'Multiple Response' ? (
                              (studentAns as number[]).map((i) => answersParsed.options?.[i]).join(', ')
                            ) : q.QuestionType === 'True / False' ? (
                              studentAns
                            ) : q.QuestionType === 'Matching' ? (
                              Object.entries(studentAns as Record<string, string>)
                                .map(([k, v]) => `[${k} ➔ ${v}]`)
                                .join(', ')
                            ) : q.QuestionType === 'Sequence Ordering' ? (
                              (studentAns as string[]).join(' ➔ ')
                            ) : q.QuestionType === 'True/False Multiple' || q.QuestionType === 'Categorization' || q.QuestionType === 'Matrix Selection' ? (
                              Object.entries(studentAns as Record<string, string>)
                                .map(([k, v]) => `[${k}: ${v}]`)
                                .join(', ')
                            ) : q.QuestionType === 'Hotspot' ? (
                              answersParsed.hotspots?.find((s) => s.id === studentAns)?.name || studentAns
                            ) : q.QuestionType === 'Match Image To Text' ? (
                              (studentAns as number[])
                                .map((tIdx, i) => `[Ảnh ${i + 1} ➔ ${tIdx !== null ? answersParsed.textTargets?.[tIdx] : 'Chưa gán'}]`)
                                .join(', ')
                            ) : (
                              JSON.stringify(studentAns)
                            )}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-slate-400 font-bold block mb-0.5">Đáp án chính xác:</span>
                          <span className="font-extrabold text-green-600 leading-relaxed">
                            {q.QuestionType === 'Multiple Choice' || q.QuestionType === 'Video Based' ? (
                              answersParsed.options?.[Number(q.CorrectAnswer)] || q.CorrectAnswer
                            ) : q.QuestionType === 'Multiple Response' ? (
                              JSON.parse(q.CorrectAnswer)
                                .map((i: number) => answersParsed.options?.[i])
                                .join(', ')
                            ) : q.QuestionType === 'True / False' ? (
                              q.CorrectAnswer
                            ) : q.QuestionType === 'Matching' ? (
                              Object.entries(JSON.parse(q.CorrectAnswer) as Record<string, string>)
                                .map(([k, v]) => `[${k} ➔ ${v}]`)
                                .join(', ')
                            ) : q.QuestionType === 'Sequence Ordering' ? (
                              JSON.parse(q.CorrectAnswer)
                                .map((idx: number) => answersParsed.sequenceItems?.[idx])
                                .join(' ➔ ')
                            ) : q.QuestionType === 'True/False Multiple' ? (
                              Object.entries(JSON.parse(q.CorrectAnswer) as Record<string, boolean>)
                                .map(([k, v], i) => `[${answersParsed.statements?.[i]}: ${v ? 'Đúng' : 'Sai'}]`)
                                .join(', ')
                            ) : q.QuestionType === 'Categorization' || q.QuestionType === 'Matrix Selection' ? (
                              Object.entries(JSON.parse(q.CorrectAnswer) as Record<string, string>)
                                .map(([k, v]) => `[${k}: ${v}]`)
                                .join(', ')
                            ) : q.QuestionType === 'Hotspot' ? (
                              answersParsed.hotspots?.find((s) => s.id === q.CorrectAnswer)?.name || q.CorrectAnswer
                            ) : q.QuestionType === 'Match Image To Text' ? (
                              JSON.parse(q.CorrectAnswer)
                                .map((tIdx: number, i: number) => `[Ảnh ${i + 1} ➔ ${answersParsed.textTargets?.[tIdx]}]`)
                                .join(', ')
                            ) : (
                              q.CorrectAnswer
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Explanation info block */}
                      {q.Explanation && (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-[11px] leading-relaxed text-blue-800">
                          <p className="font-extrabold flex items-center gap-1 text-xs mb-1">
                            <HelpCircle className="w-4 h-4 text-blue-500" /> Giải thích chi tiết câu hỏi:
                          </p>
                          {q.Explanation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
