'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/database-service';
import { useAdmin } from '@/components/admin/AdminContext';
import { Users, BookOpen, HelpCircle, Activity, CheckCircle, Check, FileSpreadsheet } from 'lucide-react';

export default function ReportsPage() {
  const { syncTrigger } = useAdmin();
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalExams: 0,
    totalQuestions: 0,
    totalSubmissions: 0,
    avgScore: 0,
    accuracyRate: 0,
  });

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const { total: stTotal } = await DatabaseService.getStudents();
      const allExams = await DatabaseService.getExams();
      const { total: qTotalCount } = await DatabaseService.getQuestions();
      const scores = await DatabaseService.getScores();

      const totalCorrect = scores.reduce((acc, s) => acc + s.Correct, 0);
      const totalWrong = scores.reduce((acc, s) => acc + s.Wrong, 0);
      const totalAnswers = totalCorrect + totalWrong;
      const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
      const avgScoreVal = scores.length > 0 ? Math.round(scores.reduce((acc, s) => acc + s.Score, 0) / scores.length) : 0;

      setStats({
        totalStudents: stTotal,
        totalExams: allExams.length,
        totalQuestions: qTotalCount,
        totalSubmissions: scores.length,
        avgScore: avgScoreVal,
        accuracyRate: accuracy,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats();
  }, [syncTrigger]);

  return (
    <div className="space-y-6">
      {loadingStats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-50 border border-slate-100 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white border border-blue-50 p-5 rounded-2xl shadow-sm text-center">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng Học Sinh</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalStudents}</p>
          </div>

          <div className="bg-white border border-blue-50 p-5 rounded-2xl shadow-sm text-center">
            <BookOpen className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng Đề Thi</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalExams}</p>
          </div>

          <div className="bg-white border border-blue-50 p-5 rounded-2xl shadow-sm text-center">
            <HelpCircle className="w-6 h-6 text-teal-500 mx-auto mb-2" />
            <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng Câu Hỏi</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalQuestions}</p>
          </div>

          <div className="bg-white border border-blue-50 p-5 rounded-2xl shadow-sm text-center">
            <Activity className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-[10px] text-slate-400 font-bold uppercase">Lượt làm bài</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalSubmissions}</p>
          </div>

          <div className="bg-white border border-blue-50 p-5 rounded-2xl shadow-sm text-center">
            <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-[10px] text-slate-400 font-bold uppercase">Điểm TB</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.avgScore}%</p>
          </div>

          <div className="bg-white border border-blue-50 p-5 rounded-2xl shadow-sm text-center col-span-2 md:col-span-1">
            <Check className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-[10px] text-slate-400 font-bold uppercase">Tỷ lệ đúng</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.accuracyRate}%</p>
          </div>
        </div>
      )}

      {/* Guidelines on Sync */}
      <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl">
        <h3 className="text-sm font-extrabold text-slate-700 flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Đồng bộ hai chiều là gì?
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed mt-2 font-medium">
          Hệ thống này được thiết kế để đồng bộ hóa hoàn hảo với Google Sheets. Khi bạn thêm/sửa/xóa một câu hỏi, học sinh hay đề thi trên website, các thao tác này sẽ tự động gọi Google Apps Script API để cập nhật trực tiếp dòng tương ứng trên Google Sheets. Ngược lại, nếu bạn thao tác trực tiếp trên Google Sheets (như thêm thủ công một học sinh, dán hàng loạt câu hỏi, thêm/xóa sheet đề thi dạng LV1_OT4), chỉ cần nhấn biểu tượng đồng bộ ở góc trên cùng bên phải màn hình để tải toàn bộ thông tin mới về website.
        </p>
      </div>
    </div>
  );
}
