'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import AppsScriptGuide from '@/components/AppsScriptGuide';
import { Shield, ToggleLeft, ToggleRight, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const { onSyncComplete } = useAdmin();
  const [blockF12, setBlockF12] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('ic3_block_f12');
      return val !== null ? val === 'true' : true;
    }
    return true;
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

      <AppsScriptGuide onUrlSaved={onSyncComplete} />
    </div>
  );
}
