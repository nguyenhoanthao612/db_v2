'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/database-service';
import { Exam, ScoreRecord } from '@/lib/types';
import { BookOpen, Trophy, Award, Clock, ArrowRight, CheckCircle2, XCircle, ChevronRight, Activity, Calendar, X, Zap, RefreshCw, Monitor, Globe, ArrowLeft, Lock, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface StudentDashboardProps {
  student: any;
  onSelectExam: (exam: Exam, level: 'LV1' | 'LV2' | 'LV3', mode: 'training' | 'testing' | 'race') => void;
  syncTrigger: number;
  preloadFinished?: boolean;
  preloadStep?: number;
  preloadProgress?: number;
}

export default function StudentDashboard({
  student,
  onSelectExam,
  syncTrigger,
  preloadFinished = true,
  preloadStep = 4,
  preloadProgress = 100,
}: StudentDashboardProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(false); // Default to false since we load instantly from cache
  const [selectedLevel, setSelectedLevel] = useState<'LV1' | 'LV2' | 'LV3' | 'ALL'>('ALL');
  const [selectedExamForMode, setSelectedExamForMode] = useState<Exam | null>(null);
  const [activeModeSelection, setActiveModeSelection] = useState<'training' | 'testing' | 'race'>('training');

  const [blockedModes, setBlockedModes] = useState<{ training: boolean; testing: boolean; race: boolean }>(() => {
    if (typeof window !== 'undefined') {
      return {
        training: localStorage.getItem('ic3_block_training') === 'true',
        testing: localStorage.getItem('ic3_block_testing') === 'true',
        race: localStorage.getItem('ic3_block_race') === 'true',
      };
    }
    return { training: false, testing: false, race: false };
  });

  // Listen for admin changes to the block mode settings
  useEffect(() => {
    const checkBlocked = () => {
      if (typeof window !== 'undefined') {
        setBlockedModes({
          training: localStorage.getItem('ic3_block_training') === 'true',
          testing: localStorage.getItem('ic3_block_testing') === 'true',
          race: localStorage.getItem('ic3_block_race') === 'true',
        });
      }
    };

    checkBlocked();
    window.addEventListener('ic3BlockSettingsChanged', checkBlocked);
    window.addEventListener('storage', checkBlocked);
    return () => {
      window.removeEventListener('ic3BlockSettingsChanged', checkBlocked);
      window.removeEventListener('storage', checkBlocked);
    };
  }, []);

  const levelDetails = {
    LV1: {
      title: 'Kiến Thức Máy Tính & Công Nghệ',
      subtitle: 'Cấp độ 1 (LV1) • Digital Literacy Essentials',
      desc: 'Nền tảng về thiết bị phần cứng, hệ điều hành Windows, quản lý tệp tin và cài đặt ứng dụng cơ bản.',
      icon: Monitor,
      color: 'from-cyan-400 to-blue-500 shadow-blue-200',
      shadow: 'shadow-cyan-100',
      hoverColor: 'hover:border-cyan-300',
      iconBg: 'bg-cyan-50 text-cyan-600',
    },
    LV2: {
      title: 'Các Ứng Dụng Chủ Chốt',
      subtitle: 'Cấp độ 2 (LV2) • Key Applications',
      desc: 'Làm chủ các ứng dụng văn phòng cốt lõi: Soạn thảo văn bản (Word), Bảng tính (Excel), và Trình chiếu (PowerPoint).',
      icon: Award,
      color: 'from-blue-500 to-indigo-600 shadow-indigo-200',
      shadow: 'shadow-blue-100',
      hoverColor: 'hover:border-blue-300',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    LV3: {
      title: 'Cuộc Sống Trực Tuyến & An Toàn Số',
      subtitle: 'Cấp độ 3 (LV3) • Living Online',
      desc: 'Bảo mật an toàn thông tin, tìm kiếm thông tin thông minh, kỹ năng đạo đức mạng, làm việc và cộng tác từ xa.',
      icon: Globe,
      color: 'from-violet-500 to-purple-600 shadow-violet-200',
      shadow: 'shadow-violet-100',
      hoverColor: 'hover:border-purple-300',
      iconBg: 'bg-purple-50 text-purple-600',
    },
  };

  useEffect(() => {
    // SSR safe initial local cache load
    if (typeof window !== 'undefined') {
      const storedExams = localStorage.getItem('ic3_exams');
      const storedScores = localStorage.getItem('ic3_scores');
      if (storedExams) {
        try {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setExams(JSON.parse(storedExams));
        } catch (e) { console.error(e); }
      }
      if (storedScores) {
        try {
          const parsedScores = JSON.parse(storedScores);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setScores(parsedScores.filter((s: any) => s.StudentID === student.StudentID));
        } catch (e) { console.error(e); }
      }
    }
  }, [student.StudentID]);

  useEffect(() => {
    async function loadData() {
      // Quiet background refresh - no full screen blocking loading spinner!
      try {
        const [loadedExams, loadedScores] = await Promise.all([
          DatabaseService.getExams(),
          DatabaseService.getScores({ studentId: student.StudentID })
        ]);
        setExams(loadedExams);
        setScores(loadedScores);
      } catch (e) {
        console.error('Error loading student dashboard', e);
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.StudentID, syncTrigger]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const lvl = params.get('level')?.toUpperCase();
      if (lvl === 'LV1' || lvl === 'LV2' || lvl === 'LV3') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedLevel(lvl as any);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedLevel('ALL');
      }
    }
  }, [syncTrigger]);

  const handleSelectLevel = (lvl: 'LV1' | 'LV2' | 'LV3' | 'ALL') => {
    setSelectedLevel(lvl);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (lvl === 'ALL') {
        url.searchParams.delete('level');
      } else {
        url.searchParams.set('level', lvl);
      }
      window.history.pushState({}, '', url.toString());
    }
  };

  // Statistics calculation
  const totalExamsTaken = scores.length;
  const avgScore = totalExamsTaken > 0 ? Math.round(scores.reduce((acc, s) => acc + s.Score, 0) / totalExamsTaken) : 0;
  const totalCorrect = scores.reduce((acc, s) => acc + s.Correct, 0);
  const totalWrong = scores.reduce((acc, s) => acc + s.Wrong, 0);
  const avgScorePercent = (totalCorrect + totalWrong) > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : 0;
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

  const getLevelProgress = (lvl: 'LV1' | 'LV2' | 'LV3') => {
    const lvlExams = exams.filter((e) => e.Level === lvl);
    const total = lvlExams.length;
    if (total === 0) return { total: 0, completed: 0, percent: 0 };
    const completed = lvlExams.filter((e) =>
      scores.some((sc) => sc.ExamID === e.ExamID && sc.Level === e.Level)
    ).length;
    const percent = Math.round((completed / total) * 100);
    return { total, completed, percent };
  };

  const filteredExams = selectedLevel === 'ALL' ? exams : exams.filter((e) => e.Level === selectedLevel);


  return (
    <div 
      id="student-dashboard" 
      className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-all duration-1000 ease-out ${
        !preloadFinished
          ? 'filter blur-md opacity-25 pointer-events-none select-none scale-[0.98]'
          : 'filter blur-none opacity-100 pointer-events-auto scale-100'
      }`}
    >
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
            <p className="text-xl font-extrabold text-slate-800">{avgScore} điểm</p>
            <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: `${avgScorePercent}%` }} />
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

      {/* Main Grid or Level Selector based on selectedLevel */}
      {selectedLevel === 'ALL' ? (
        <div className="space-y-8 animate-fade-in">
          {/* Header section */}
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
              <Zap className="w-5.5 h-5.5 text-amber-500" /> Chọn Phân Khúc Ôn Luyện (Levels)
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-1">Ấn chọn phân khúc ôn luyện tương ứng để bắt đầu làm đề thi</p>
          </div>

          {/* 3 Large level cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['LV1', 'LV2', 'LV3'] as const).map((lvl) => {
              const details = levelDetails[lvl];
              const IconComp = details.icon;

              return (
                <div
                  key={lvl}
                  onClick={() => handleSelectLevel(lvl)}
                  className="bg-white border border-slate-100 rounded-3xl p-8 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden group shadow-sm"
                >
                  {/* Decorative background circle */}
                  <div className={`absolute -right-8 -bottom-8 w-24 h-24 bg-gradient-to-br ${details.color} opacity-0 group-hover:opacity-5 rounded-full transition-opacity duration-300`} />

                  <div className="flex flex-col items-center justify-center space-y-4 z-10 text-center">
                    <div className={`p-4 rounded-2xl ${details.iconBg} font-black shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                      <IconComp className="w-8 h-8" />
                    </div>
                    <span className={`px-5 py-1.5 text-sm font-black text-white rounded-full bg-gradient-to-r ${details.color} shadow-md group-hover:scale-105 transition-transform duration-300`}>
                      {lvl}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lower layout: Pathways */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            {/* Study Pathways */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" /> Hướng Dẫn Ôn Tập Hiệu Quả
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">Lộ trình rèn luyện để đạt tối đa điểm thi IC3 GS6</p>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/50 rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm border border-blue-100">
                    1
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Học theo từng cấp độ (Levels)</h5>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Lựa chọn cấp độ phù hợp với nhu cầu. Hoàn thành toàn bộ đề thi trong mỗi Level để nắm bắt đầy đủ các mảng kiến thức theo chuẩn ISTE quốc tế.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm border border-indigo-100">
                    2
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Thử thách các chế độ làm bài</h5>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Sử dụng chế độ <strong className="text-blue-600">Luyện tập</strong> để xem giải thích đáp án ngay khi nộp câu hỏi, sau đó chọn <strong className="text-blue-600">Thi thử</strong> để rèn luyện tốc độ xử lý thời gian thực.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm border border-amber-100">
                    3
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Mục tiêu đạt trên 70% điểm số</h5>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Một bài thi được tính là đạt (Pass) khi đạt tối thiểu <strong className="text-green-600">70% (700 điểm)</strong>. Hãy luyện đi luyện lại cho đến khi tỷ lệ đúng của bạn đạt mức xuất sắc!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* LEVEL SPECIFIC SUB-PAGE VIEW */
        <div className="space-y-6 animate-fade-in">
          {/* Back to main button */}
          <button
            onClick={() => handleSelectLevel('ALL')}
            className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-blue-600 transition bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm hover:shadow-md cursor-pointer select-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Dashboard chính</span>
          </button>

          {/* Level Hero Banner */}
          <div className={`bg-gradient-to-r ${levelDetails[selectedLevel].color} rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-blue-100/20`}>
            <div className="absolute -right-16 -top-16 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="bg-white/20 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/10">
                  Phân Khúc Đang Học • {selectedLevel}
                </span>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  {levelDetails[selectedLevel].title}
                </h3>
                <p className="text-xs text-white/95 font-medium max-w-2xl leading-relaxed">
                  {levelDetails[selectedLevel].desc}
                </p>
              </div>

              {/* Progress metric */}
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 shrink-0 min-w-[150px] text-center space-y-1.5">
                <p className="text-[10px] text-blue-100 font-bold uppercase tracking-wider">Tiến trình học</p>
                <p className="text-xl font-black">
                  {getLevelProgress(selectedLevel).completed}/{getLevelProgress(selectedLevel).total} Đề
                </p>
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-white h-full rounded-full" style={{ width: `${getLevelProgress(selectedLevel).percent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid: Left is Exams, Right is level scores */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-blue-500" /> Danh sách đề ôn tập ({filteredExams.length})
                </h4>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
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
                    const isSelected = selectedExamForMode?.ExamID === exam.ExamID && selectedExamForMode?.Level === exam.Level;

                    return (
                      <div
                        key={`${exam.Level}_${exam.ExamID}`}
                        className="relative bg-white border border-slate-100 rounded-2xl p-5 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-50/50 transition-all duration-300 flex flex-col justify-between min-h-[190px]"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <span className={`px-2.5 py-0.5 text-[9px] font-black text-white rounded-full bg-gradient-to-r ${getLevelColor(exam.Level)}`}>
                              {exam.Level}
                            </span>
                            {isCompleted && (
                              <span className="inline-flex items-center gap-1 bg-green-50 border border-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-green-500" /> Điểm cao nhất: {bestScore} điểm
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-extrabold text-slate-800">Đề Ôn Tập {exam.ExamID}</h4>
                          <p className="text-xs text-slate-400 mt-1 font-bold">Số lượng câu hỏi: {exam.QuestionIDs.length} câu</p>
                        </div>

                        <button
                          disabled={!preloadFinished}
                          onClick={() => {
                            setSelectedExamForMode(exam);
                            if (!blockedModes.training) {
                              setActiveModeSelection('training');
                            } else if (!blockedModes.testing) {
                              setActiveModeSelection('testing');
                            } else if (!blockedModes.race) {
                              setActiveModeSelection('race');
                            }
                          }}
                          className={`mt-5 w-full py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all duration-300 shadow-sm ${
                            !preloadFinished
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none'
                              : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md cursor-pointer'
                          }`}
                        >
                          {!preloadFinished ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                              Đang tải câu hỏi...
                            </>
                          ) : (
                            <>
                              Bắt đầu làm bài <ChevronRight className="w-4 h-4" />
                            </>
                          )}
                        </button>

                        {isSelected && (
                          <div className="absolute inset-x-0 top-0 min-h-[420px] h-fit bg-white rounded-2xl p-5 z-20 border-2 border-blue-500 shadow-2xl flex flex-col justify-between animate-scale-up">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExamForMode(null);
                              }}
                              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition"
                            >
                              <X className="w-4 h-4" />
                            </button>

                            <div className="space-y-4">
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                                  Cấu hình bài làm
                                </span>
                                <h3 className="text-sm font-black text-slate-800 mt-1">Chọn Chế Độ Luyện Thi</h3>
                                <p className="text-[10px] text-slate-400 font-bold">
                                  Đề {exam.ExamID} ({exam.Level}) • {exam.QuestionIDs.length} câu hỏi
                                </p>
                              </div>

                              {/* Compact Mode Options */}
                              <div className="space-y-2">
                                {/* 1. TRAINING MODE */}
                                <button
                                  type="button"
                                  disabled={blockedModes.training}
                                  onClick={() => setActiveModeSelection('training')}
                                  className={`w-full text-left p-2.5 rounded-xl border-2 transition duration-200 flex gap-3 ${
                                    blockedModes.training
                                      ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-100/50'
                                      : activeModeSelection === 'training'
                                      ? 'border-blue-500 bg-blue-50/20'
                                      : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'
                                  }`}
                                >
                                  <div className={`p-1.5 rounded-lg ${blockedModes.training ? 'bg-slate-200 text-slate-400' : activeModeSelection === 'training' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'} shrink-0 flex items-center justify-center`}>
                                    {blockedModes.training ? <Lock className="w-3.5 h-3.5 text-red-500" /> : <BookOpen className="w-3.5 h-3.5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-1">
                                      Luyện tập
                                      {blockedModes.training && <span className="ml-1 px-1 py-0.2 text-[8px] font-black bg-red-500 text-white rounded-full">ĐÃ KHÓA</span>}
                                      {!blockedModes.training && activeModeSelection === 'training' && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                                    </h5>
                                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed truncate">
                                      {blockedModes.training ? 'Giáo viên đã khóa chế độ này.' : 'Không giới hạn thời gian. Nộp từng câu xem ngay giải thích.'}
                                    </p>
                                  </div>
                                </button>

                                {/* 2. TESTING MODE */}
                                <button
                                  type="button"
                                  disabled={blockedModes.testing}
                                  onClick={() => setActiveModeSelection('testing')}
                                  className={`w-full text-left p-2.5 rounded-xl border-2 transition duration-200 flex gap-3 ${
                                    blockedModes.testing
                                      ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-100/50'
                                      : activeModeSelection === 'testing'
                                      ? 'border-blue-500 bg-blue-50/20'
                                      : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'
                                  }`}
                                >
                                  <div className={`p-1.5 rounded-lg ${blockedModes.testing ? 'bg-slate-200 text-slate-400' : activeModeSelection === 'testing' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'} shrink-0 flex items-center justify-center`}>
                                    {blockedModes.testing ? <Lock className="w-3.5 h-3.5 text-red-500" /> : <Clock className="w-3.5 h-3.5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-1">
                                      Thi thử
                                      {blockedModes.testing && <span className="ml-1 px-1 py-0.2 text-[8px] font-black bg-red-500 text-white rounded-full">ĐÃ KHÓA</span>}
                                      {!blockedModes.testing && activeModeSelection === 'testing' && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                                    </h5>
                                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed truncate">
                                      {blockedModes.testing ? 'Giáo viên đã khóa chế độ này.' : `Giới hạn ${exam.Duration || 40} phút. Chỉ chấm điểm và xem giải thích khi xong.`}
                                    </p>
                                  </div>
                                </button>

                                {/* 3. RACE MODE */}
                                <button
                                  type="button"
                                  disabled={blockedModes.race}
                                  onClick={() => setActiveModeSelection('race')}
                                  className={`w-full text-left p-2.5 rounded-xl border-2 transition duration-200 flex gap-3 ${
                                    blockedModes.race
                                      ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-100/50'
                                      : activeModeSelection === 'race'
                                      ? 'border-amber-500 bg-amber-50/20'
                                      : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'
                                  }`}
                                >
                                  <div className={`p-1.5 rounded-lg ${blockedModes.race ? 'bg-slate-200 text-slate-400' : activeModeSelection === 'race' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'} shrink-0 flex items-center justify-center`}>
                                    {blockedModes.race ? <Lock className="w-3.5 h-3.5 text-red-500" /> : <Trophy className="w-3.5 h-3.5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                                      Tốc độ sinh tử
                                      {!blockedModes.race && <span className="px-1 py-0.2 text-[8px] font-black bg-amber-500 text-white rounded-full">HOT</span>}
                                      {blockedModes.race && <span className="ml-1 px-1 py-0.2 text-[8px] font-black bg-red-500 text-white rounded-full">ĐÃ KHÓA</span>}
                                      {!blockedModes.race && activeModeSelection === 'race' && <span className="w-1 h-1 rounded-full bg-amber-500" />}
                                    </h5>
                                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed truncate">
                                      {blockedModes.race ? 'Giáo viên đã khóa chế độ này.' : 'Trả lời sai bất kỳ câu nào sẽ phải dừng cuộc chơi ngay.'}
                                    </p>
                                  </div>
                                </button>

                                {/* Warning message if all modes blocked */}
                                {blockedModes.training && blockedModes.testing && blockedModes.race && (
                                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2 text-[10px] font-bold text-red-600 mt-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <span>Tất cả các chế độ thi của đề này hiện đã bị giáo viên tạm khóa. Vui lòng đợi giáo viên mở khóa!</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2.5 pt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedExamForMode(null);
                                }}
                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer text-center"
                              >
                                Hủy bỏ
                              </button>
                              <button
                                disabled={blockedModes.training && blockedModes.testing && blockedModes.race}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const mode = activeModeSelection;
                                  setSelectedExamForMode(null);
                                  onSelectExam(exam, exam.Level, mode);
                                }}
                                className={`flex-[1.5] py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition shadow-lg cursor-pointer text-center ${
                                  blockedModes.training && blockedModes.testing && blockedModes.race
                                    ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-100'
                                }`}
                              >
                                Bắt đầu <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Level Scores */}
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-indigo-500" /> Kết quả thi {selectedLevel}
                </h4>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                {scores.filter((s) => s.Level === selectedLevel).length === 0 ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center text-slate-400">
                    <Trophy className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-bold">Chưa có kết quả ở cấp độ này.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Hãy làm các đề thi bên trái để rèn luyện điểm số của bạn nhé!</p>
                  </div>
                ) : (
                  scores
                    .filter((s) => s.Level === selectedLevel)
                    .map((score, index) => (
                      <div
                        key={index}
                        className="bg-slate-50 hover:bg-blue-50/50 border border-slate-100 rounded-xl p-4 transition duration-200 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                            Đề {score.ExamID}
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
                              (score.Correct + score.Wrong) > 0
                                ? (score.Correct / (score.Correct + score.Wrong) >= 0.8)
                                  ? 'bg-green-100 text-green-700'
                                  : (score.Correct / (score.Correct + score.Wrong) >= 0.5)
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {score.Score} điểm
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
      )}


    </div>
  );
}
