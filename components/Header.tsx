/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/database-service';
import { SyncConfig } from '@/lib/types';
import { Database, RefreshCw, LogOut, Shield, User, Settings, Check, CloudLightning, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  currentUser: any;
  userRole: 'Admin' | 'Student' | null;
  onLogout: () => void;
  onOpenSettings: () => void;
  syncTrigger: number;
  onSyncComplete: () => void;
  hideSyncButton?: boolean;
}

export default function Header({
  currentUser,
  userRole,
  onLogout,
  onOpenSettings,
  syncTrigger,
  onSyncComplete,
  hideSyncButton = false,
}: HeaderProps) {
  const [config, setConfig] = useState<SyncConfig>({ appsScriptUrl: '' });
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    const activeConfig = DatabaseService.getSyncConfig();
    setConfig(activeConfig);
  }, [syncTrigger]);

  const handleSync = async () => {
    if (!config.appsScriptUrl) {
      onOpenSettings();
      return;
    }
    setSyncing(true);
    setSyncMsg('Đang đồng bộ...');
    try {
      const res = await DatabaseService.pullFromGoogleSheets();
      if (res.success) {
        setSyncMsg('Đã đồng bộ xong!');
        onSyncComplete();
      } else {
        setSyncMsg('Đồng bộ thất bại!');
      }
    } catch (e) {
      setSyncMsg('Lỗi đồng bộ!');
    } finally {
      setTimeout(() => {
        setSyncing(false);
        setSyncMsg('');
      }, 2000);
    }
  };

  return (
    <header id="app-header" className="bg-white/80 backdrop-blur-md border-b border-blue-100 sticky top-0 z-40 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* LOGO */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-200 transition-transform hover:scale-105 select-none">
            IC3
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight leading-none">
              IC3 GS6 <span className="text-blue-500 font-black">PREP</span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-semibold mt-0.5">Website Ôn Tập Thông Minh</p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* DATABASE CONNECTION STATUS */}
          {config.appsScriptUrl && currentUser && !hideSyncButton && (
            <button
              onClick={handleSync}
              disabled={syncing}
              title="Đồng bộ dữ liệu với Google Sheets."
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-100 transition cursor-pointer shadow-sm select-none"
            >
              <CloudLightning className="w-3.5 h-3.5 text-blue-500 animate-bounce" />
              <span>{syncMsg || 'Đồng bộ Google Sheets'}</span>
              <RefreshCw className={`w-3 h-3 text-blue-600 ${syncing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* USER PROFILE INFO */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  {userRole === 'Admin' ? (
                    <Shield className="w-3.5 h-3.5 text-blue-500 inline" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-indigo-500 inline" />
                  )}
                  {currentUser.FullName || currentUser.Username}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {userRole === 'Admin' ? 'Quản trị viên' : `Lớp: ${currentUser.ClassGroup || 'Tự do'}`}
                </span>
              </div>

              {/* QUICK LOGOUT */}
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
