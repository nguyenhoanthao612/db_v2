'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import AppsScriptGuide from '@/components/AppsScriptGuide';
import { Shield, ToggleLeft, ToggleRight, CheckCircle2, AlertTriangle, BookOpen, Clock, Trophy, Lock, Unlock } from 'lucide-react';

export default function SettingsPage() {
  const { onSyncComplete } = useAdmin();
  const [blockF12, setBlockF12] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('ic3_block_f12');
      return val !== null ? val === 'true' : true;
    }
    return true;
  });

  const [blockTraining, setBlockTraining] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('ic3_block_training');
      return val === 'true';
    }
    return false;
  });

  const [blockTesting, setBlockTesting] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('ic3_block_testing');
      return val === 'true';
    }
    return false;
  });

  const [blockRace, setBlockRace] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('ic3_block_race');
      return val === 'true';
    }
    return false;
  });

  const handleToggleBlockF12 = () => {
    const newVal = !blockF12;
    setBlockF12(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ic3_block_f12', String(newVal));
      // Dispatch custom event to notify the F12Blocker component instantly
      window.dispatchEvent(new Event('f12BlockSettingChanged'));
    }
  };

  const handleToggleBlockTraining = () => {
    const newVal = !blockTraining;
    setBlockTraining(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ic3_block_training', String(newVal));
      window.dispatchEvent(new Event('ic3BlockSettingsChanged'));
    }
  };

  const handleToggleBlockTesting = () => {
    const newVal = !blockTesting;
    setBlockTesting(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ic3_block_testing', String(newVal));
      window.dispatchEvent(new Event('ic3BlockSettingsChanged'));
    }
  };

  const handleToggleBlockRace = () => {
    const newVal = !blockRace;
    setBlockRace(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ic3_block_race', String(newVal));
      window.dispatchEvent(new Event('ic3BlockSettingsChanged'));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* F12 Blocker Management Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${blockF12 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">Cấu hình bảo mật - Chặn tính năng F12</h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                Chặn F12, phím tắt DevTools (Ctrl+Shift+I/J/C), Xem nguồn trang (Ctrl+U) và Menu chuột phải.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleBlockF12}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
              blockF12
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-100'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            {blockF12 ? (
              <>
                <ToggleRight className="w-4 h-4 shrink-0" />
                Đang BẬT (Đã chặn F12)
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 shrink-0" />
                Đang TẮT (Cho phép F12)
              </>
            )}
          </button>
        </div>

        {/* Info alerts */}
        <div className="mt-4 p-3.5 rounded-xl text-xs leading-relaxed flex items-start gap-2 bg-slate-50 border border-slate-100">
          {blockF12 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          )}
          <span className="font-bold text-slate-500">
            {blockF12 ? (
              <span className="text-emerald-700">Trạng thái: Đang bảo vệ.</span>
            ) : (
              <span className="text-amber-700">Cảnh báo: Đang mở khóa. Học sinh có thể bấm F12 để kiểm tra mã nguồn.</span>
            )}{' '}
            Mặc định, tính năng chặn F12 này luôn được kích hoạt khi mới vào trang web để tránh gian lận đáp án. Quản trị viên có thể tắt để debug khi cần thiết.
          </span>
        </div>
      </div>

      {/* Quiz Modes Blocker Management Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-500" /> Cấu hình chế độ làm bài của học sinh
          </h3>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            Quản lý quyền làm bài của học sinh. Chặn bớt các chế độ nếu muốn tập trung học sinh vào chế độ duy nhất.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. TRAINING MODE */}
          <div className={`border rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all duration-200 ${
            blockTraining 
              ? 'border-red-100 bg-red-50/10' 
              : 'border-slate-150 bg-slate-50/10 hover:border-slate-200'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${blockTraining ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  blockTraining ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {blockTraining ? 'Đã Chặn' : 'Hoạt Động'}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-800">Chế độ Luyện Tập</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5 leading-relaxed">
                  Không giới hạn thời gian. Nộp từng câu xem ngay giải thích đáp án.
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleBlockTraining}
              className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition duration-200 cursor-pointer ${
                blockTraining 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-100' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {blockTraining ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Mở Chặn Luyện Tập
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Chặn Luyện Tập
                </>
              )}
            </button>
          </div>

          {/* 2. TESTING MODE */}
          <div className={`border rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all duration-200 ${
            blockTesting 
              ? 'border-red-100 bg-red-50/10' 
              : 'border-slate-150 bg-slate-50/10 hover:border-slate-200'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${blockTesting ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
                  <Clock className="w-4 h-4" />
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  blockTesting ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {blockTesting ? 'Đã Chặn' : 'Hoạt Động'}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-800">Chế độ Thi Thử</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5 leading-relaxed">
                  Có giới hạn thời gian đề thi. Chỉ biết điểm số và đáp án khi bấm nộp bài.
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleBlockTesting}
              className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition duration-200 cursor-pointer ${
                blockTesting 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-100' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {blockTesting ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Mở Chặn Thi Thử
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Chặn Thi Thử
                </>
              )}
            </button>
          </div>

          {/* 3. RACE MODE */}
          <div className={`border rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all duration-200 ${
            blockRace 
              ? 'border-red-100 bg-red-50/10' 
              : 'border-slate-150 bg-slate-50/10 hover:border-slate-200'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${blockRace ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                  <Trophy className="w-4 h-4" />
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  blockRace ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {blockRace ? 'Đã Chặn' : 'Hoạt Động'}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-800">Chế độ Tốc Độ Sinh Tử</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5 leading-relaxed">
                  Chế độ thi đặc biệt, làm sai bất kỳ một câu nào sẽ bị loại trực tiếp ngay lập tức.
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleBlockRace}
              className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition duration-200 cursor-pointer ${
                blockRace 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-100' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {blockRace ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Mở Chặn Tốc Độ
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Chặn Tốc Độ
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status alerts */}
        <div className="p-3.5 rounded-xl text-xs leading-relaxed flex items-start gap-2 bg-slate-50 border border-slate-100 text-slate-500 font-bold">
          <AlertTriangle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <span>
            Các thay đổi cấu hình chế độ làm bài này sẽ có hiệu lực tức thì đối với học sinh trên toàn hệ thống. Hãy cấu hình phù hợp với buổi học hiện tại.
          </span>
        </div>
      </div>

      <AppsScriptGuide onUrlSaved={onSyncComplete} />
    </div>
  );
}
