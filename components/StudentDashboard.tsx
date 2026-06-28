'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/database-service';
import { Exam, ScoreRecord } from '@/lib/types';
import { BookOpen, Trophy, Award, Clock, ArrowRight, CheckCircle2, XCircle, ChevronRight, Activity, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface StudentDashboardProps {
  student: any;
  onSelectExam: (exam: Exam, level: 'LV1' | 'LV2' | 'LV3') => void;
  syncTrigger: number;
}

export default function StudentDashboard({ student, onSelectExam, syncTrigger }: StudentDashboardProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<'LV1' | 'LV2' | 'LV3' | 'ALL'>('ALL');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const loadedExams = await DatabaseService.getExams();
        const loadedScores = await DatabaseService.getScores({ studentId: student.StudentID });
        setExams(loadedExams);
        setScores(loadedScores);
      } catch (e) {
        console.error('Error loading student dashboard', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [student.StudentID, syncTrigger]);

  // Statistics calculation
  const totalExamsTaken = scores.length;
  const avgScore = totalExamsTaken > 0 ? Math.round(scores.reduce((acc, s) => acc + s.Score, 0) / totalExamsTaken) : 0;
  const totalCorrect = scores.reduce((acc, s) => acc + s.Correct, 0);
  const totalWrong = scores.reduce((acc, s) => acc + s.Wrong, 0);
  const totalTimeSpent = scores.reduce((acc, s) => acc + s.Time, 0); // seconds

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins} phút ${secs} giây`;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'LV1':
        return 'from-cyan-400 to-blue-500 shadow-blue-200';
      case 'LV2':
        return 'from-blue-500 to-indigo-600 shadow-indigo-200';
      case 'LV3':
        return 'from-violet-500 to-purple-600 shadow-violet-200';
      default:
        return 'from-gray-400 to-gray-600 shadow-gray-200';
    }
  };

  const filteredExams = selectedLevel === 'ALL' ? exams : exams.filter((e) => e.Level === selectedLevel);

  return (
    <div id="student-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-blue-100">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="bg-white/20 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-white/15">
              Hệ thống ôn tập IC3 GS6
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight">
              Chào mừng, <span className="text-blue-100">{student.FullName}</span>! ✨
            </h2>
            <p className="text-sm text-blue-50/90 font-medium mt-1.5 max-w-xl">
              Nền tảng giúp bạn học tập thông minh, luyện tập không giới hạn 11 dạng câu hỏi và tự tin đạt chứng chỉ IC3 GS6 quốc tế!
            </p>
          </div>
          <div className="flex gap-4 shrink-0 bg-white/10 p-4 rounded-2xl border border-white/15">
            <div className="text-center">
              <p className="text-2xl font-black">{student.ClassGroup || 'Tự do'}</p>
              <p className="text-[10px] text-blue-100 font-bold uppercase mt-0.5">LỚP HỌC</p>
            </div>
            <div className="w-px bg-white/25 self-stretch" />
            <div className="text-center">
              <p className="text-2xl font-black">{totalExamsTaken}</p>
              <p className="text-[10px] text-blue-100 font-bold uppercase mt-0.5">BÀI ĐÃ LÀM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-white border border-blue-100/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-300 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-xl">
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Điểm Trung Bình</p>
            <p className="text-xl font-extrabold text-slate-800">{avgScore}%</p>
            <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: `${avgScore}%` }} />
            </div>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white border border-blue-100/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-300 flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Tổng câu trả lời đúng</p>
            <p className="text-xl font-extrabold text-slate-800">{totalCorrect} câu</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Sai sót: {totalWrong} câu</p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white border border-blue-100/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-300 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl">
            <Clock className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Tổng thời gian luyện tập</p>
            <p className="text-xl font-extrabold text-slate-800">{formatTime(totalTimeSpent)}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Tính theo tổng số câu nộp bài</p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white border border-blue-100/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-300 flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-xl">
            <Award className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Tiến trình mục tiêu</p>
            <p className="text-xl font-extrabold text-slate-800">
              {totalExamsTaken >= 5 ? 'Đạt Tiêu Chuẩn 🏆' : `${totalExamsTaken}/5 Bài thi`}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Luyện 5 đề để đạt hiệu suất cao</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left is Level select & Exams, Right is History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* EXAMS CONTAINER */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" /> Danh Sách Đề Ôn Tập IC3
              </h3>
              <p className="text-xs text-slate-400 font-semibold">Tất cả đề mở khóa hoàn toàn, làm lại không giới hạn</p>
            </div>

            {/* Level Quick filter */}
            <div className="flex gap-1 bg-slate-100 border border-slate-200/60 rounded-xl p-1 text-xs font-bold self-start sm:self-center">
              {(['ALL', 'LV1', 'LV2', 'LV3'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedLevel === lvl ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {lvl === 'ALL' ? 'Tất cả' : lvl}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            // Skeleton Loader
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4 animate-pulse">
                  <div className="h-6 bg-slate-200 rounded-lg w-1/3" />
                  <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                  <div className="h-10 bg-slate-200 rounded-lg w-full mt-4" />
                </div>
              ))}
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">Chưa có đề thi nào ở cấp độ này.</p>
              <p className="text-xs text-slate-400 mt-1">Quản trị viên có thể thêm đề bất kỳ lúc nào.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredExams.map((exam) => {
                const isCompleted = scores.some((sc) => sc.ExamID === exam.ExamID && sc.Level === exam.Level);
                const bestScore = scores
                  .filter((sc) => sc.ExamID === exam.ExamID && sc.Level === exam.Level)
                  .reduce((max, sc) => (sc.Score > max ? sc.Score : max), 0);

                return (
                  <div
                    key={`${exam.Level}_${exam.ExamID}`}
                    className="bg-white border border-blue-100/60 rounded-2xl p-5 hover:border-blue-200 hover:shadow-md transition duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className={`px-2.5 py-1 text-[10px] font-black text-white rounded-full bg-gradient-to-r ${getLevelColor(exam.Level)}`}>
                          {exam.Level}
                        </span>
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 bg-green-50 border border-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-green-500" /> Điểm cao nhất: {bestScore}%
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-extrabold text-slate-800">Đề Ôn Tập {exam.ExamID}</h4>
                      <p className="text-xs text-slate-400 mt-1 font-bold">Số lượng câu hỏi: {exam.QuestionIDs.length} câu</p>
                    </div>

                    <button
                      onClick={() => onSelectExam(exam, exam.Level)}
                      className="mt-5 w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition shadow-sm hover:shadow-md cursor-pointer"
                    >
                      Bắt đầu làm bài <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RECENT SCORES HISTORY */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" /> Nhật Ký Làm Bài
            </h3>
            <p className="text-xs text-slate-400 font-semibold">Kết quả thi gần đây của bạn</p>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
              ))
            ) : scores.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center text-slate-400">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold">Bạn chưa làm đề ôn tập nào.</p>
                <p className="text-[10px]">Hãy chọn một đề thi bên trái để kiểm tra năng lực nhé!</p>
              </div>
            ) : (
              scores.map((score, index) => (
                <div
                  key={index}
                  className="bg-slate-50 hover:bg-blue-50/50 border border-slate-100 rounded-xl p-4 transition duration-200 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                      Đề {score.ExamID} ({score.Level})
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(score.SubmitTime).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500">Thời gian: {formatTime(score.Time)}</p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-black px-2.5 py-1 rounded-lg ${
                        score.Score >= 80 ? 'bg-green-100 text-green-700' : score.Score >= 50 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {score.Score}%
                    </span>
                    <div className="flex gap-1.5 justify-end mt-1.5 text-[10px] font-bold text-slate-400">
                      <span className="text-green-600">+{score.Correct}</span>
                      <span>/</span>
                      <span className="text-red-500">-{score.Wrong}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
