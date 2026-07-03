/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DatabaseService } from '@/lib/database-service';
import { Exam } from '@/lib/types';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import StudentDashboard from '@/components/StudentDashboard';
import QuizPlayer from '@/components/QuizPlayer';
import { Database, X, HelpCircle, FileSpreadsheet, RefreshCw, CheckCircle, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'Admin' | 'Student' | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [activeExamLevel, setActiveExamLevel] = useState<'LV1' | 'LV2' | 'LV3' | null>(null);
  const [selectedMode, setSelectedMode] = useState<'training' | 'testing' | 'race'>('training');

  // Sync state
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsUrl, setSettingsUrl] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionMsg, setConnectionMsg] = useState<{ type: 'success' | 'error' | ''; message: string }>({
    type: '',
    message: '',
  });

  // Initial local storage setup
  useEffect(() => {
    DatabaseService.initLocalStorage();

    // Check if user session exists in sessionStorage (fast refresh persistence)
    const storedUser = sessionStorage.getItem('ic3_current_user');
    const storedRole = sessionStorage.getItem('ic3_user_role');
    if (storedUser && storedRole) {
      setCurrentUser(JSON.parse(storedUser));
      setUserRole(storedRole as any);
      if (storedRole === 'Admin') {
        router.push('/admin/reports');
      }
    }

    const config = DatabaseService.getSyncConfig();
    if (config.appsScriptUrl) {
      setSettingsUrl(config.appsScriptUrl);
      
      // Auto-sync in background so student/other devices have fresh Google Sheets data
      setAutoSyncing(true);
      DatabaseService.pullFromGoogleSheets()
        .then((res) => {
          if (res.success) {
            console.log('Background auto-sync with Google Sheets completed.');
            setSyncTrigger((prev) => prev + 1);
          }
        })
        .catch((err) => console.error('Background auto-sync failed', err))
        .finally(() => setAutoSyncing(false));
    }
  }, [router]);

  const handleLoginSuccess = (user: any, role: 'Admin' | 'Student') => {
    setCurrentUser(user);
    setUserRole(role);
    sessionStorage.setItem('ic3_current_user', JSON.stringify(user));
    sessionStorage.setItem('ic3_user_role', role);
    if (role === 'Admin') {
      router.push('/admin/reports');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserRole(null);
    setSelectedExam(null);
    setActiveExamLevel(null);
    sessionStorage.removeItem('ic3_current_user');
    sessionStorage.removeItem('ic3_user_role');
  };

  const triggerSyncUpdate = () => {
    setSyncTrigger((prev) => prev + 1);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingConnection(true);
    setConnectionMsg({ type: '', message: '' });

    if (!settingsUrl.trim()) {
      DatabaseService.saveSyncConfig('');
      setConnectionMsg({ type: 'success', message: 'Đã xóa cấu hình. Hệ thống chuyển về chế độ Database Local.' });
      setTestingConnection(false);
      triggerSyncUpdate();
      return;
    }

    try {
      const connRes = await DatabaseService.testConnection(settingsUrl.trim());
      if (connRes.success) {
        DatabaseService.saveSyncConfig(settingsUrl.trim());
        const pullRes = await DatabaseService.pullFromGoogleSheets();
        if (pullRes.success) {
          setConnectionMsg({
            type: 'success',
            message: 'Đồng bộ Google Sheets thành công! Dữ liệu đã được cập nhật.',
          });
          triggerSyncUpdate();
        } else {
          setConnectionMsg({
            type: 'error',
            message: `Kết nối thành công nhưng kéo dữ liệu lỗi: ${pullRes.message}`,
          });
        }
      } else {
        setConnectionMsg({
          type: 'error',
          message: connRes.message || 'Không thể kết nối. Hãy chắc chắn Apps Script đã được Deploy dạng "Anyone can access".',
        });
      }
    } catch (error: any) {
      setConnectionMsg({
        type: 'error',
        message: `Lỗi kết nối: ${error.message || error}`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-50/50 text-slate-700 font-sans selection:bg-blue-100 selection:text-blue-800">
      {/* Dynamic Header */}
      <Header
        currentUser={currentUser}
        userRole={userRole}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
        syncTrigger={syncTrigger}
        onSyncComplete={triggerSyncUpdate}
        hideSyncButton={!!(selectedExam && activeExamLevel)}
      />

      {autoSyncing && (
        <div className="bg-indigo-600 text-white text-[11px] font-black py-2 px-4 flex items-center justify-center gap-2 animate-pulse shadow-inner uppercase tracking-wider">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Đang tự động tải dữ liệu mới nhất từ Google Sheets...</span>
        </div>
      )}

      {/* Main Container */}
      <main id="main-content-section" className="transition-all duration-300">
        <AnimatePresence mode="wait">
          {!currentUser ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AuthModal onLoginSuccess={handleLoginSuccess} />
            </motion.div>
          ) : selectedExam && activeExamLevel ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <QuizPlayer
                exam={selectedExam}
                level={activeExamLevel}
                student={currentUser}
                mode={selectedMode}
                onBack={() => {
                  setSelectedExam(null);
                  setActiveExamLevel(null);
                  triggerSyncUpdate();
                }}
                syncTrigger={syncTrigger}
              />
            </motion.div>
          ) : userRole === 'Admin' ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center p-8"
            >
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="student"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <StudentDashboard
                student={currentUser}
                onSelectExam={(exam, lvl, mode) => {
                  setSelectedExam(exam);
                  setActiveExamLevel(lvl);
                  setSelectedMode(mode);
                }}
                syncTrigger={syncTrigger}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ========================================================
          SETTINGS & GOOGLE SHEETS SYNC MODAL
         ======================================================== */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-xl border border-slate-100 animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowSettings(false);
                setConnectionMsg({ type: '', message: '' });
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <Database className="w-5 h-5 text-blue-500" />
              <h3 className="text-base sm:text-lg font-black text-slate-800">Cấu hình liên kết Google Sheets</h3>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-bold text-slate-500">
              <div className="space-y-1.5 leading-relaxed bg-slate-50 border border-slate-100 p-4 rounded-xl font-medium text-[11px] text-slate-500">
                <p className="font-extrabold text-xs text-slate-700 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Đồng bộ hai chiều thực sự (Two-Way Sync):
                </p>
                <ul className="list-disc pl-4 space-y-1 mt-1 font-bold">
                  <li>Thêm/Sửa/Xóa câu hỏi trên Website ➔ Google Sheet tự động biến đổi tức thì.</li>
                  <li>Thêm/Sửa/Xóa dòng trên Google Sheet ➔ Nhấn nút &quot;Đồng bộ&quot; trên Web để tải mới hoàn toàn.</li>
                  <li>Quản lý đề, đổi tên đề, xóa đề ➔ Google Sheets tự động đổi tên/xóa Sheet tương ứng.</li>
                </ul>
              </div>

              <div>
                <label className="block mb-1.5 text-slate-600">Google Apps Script Web App URL</label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={settingsUrl}
                  onChange={(e) => setSettingsUrl(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-700 bg-slate-50/50 text-xs"
                />
              </div>

              {connectionMsg.message && (
                <div
                  className={`p-3 rounded-lg text-xs font-bold leading-relaxed ${
                    connectionMsg.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'bg-red-50 text-red-700 border border-red-100'
                  }`}
                >
                  {connectionMsg.message}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={testingConnection}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-black rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow"
                >
                  {testingConnection ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Đang đồng bộ...
                    </>
                  ) : (
                    'Lưu & Kiểm tra kết nối'
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ database local và phục hồi trạng thái demo ban đầu?')) {
                      DatabaseService.clearAllData();
                      triggerSyncUpdate();
                      alert('Đã khôi phục dữ liệu cục bộ!');
                    }
                  }}
                  className="px-3.5 py-2.5 border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black rounded-xl cursor-pointer"
                  title="Khôi phục trạng thái gốc"
                >
                  Reset Local DB
                </button>
              </div>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>* Xem file <code className="bg-slate-100 px-1 rounded text-slate-600 font-bold">google-apps-script.js</code> để lấy hướng dẫn.</span>
              <button
                onClick={() => {
                  // Direct jump to instructions inside Admin dashboard if logged in
                  setShowSettings(false);
                  if (userRole === 'Admin') {
                    // Force change tab
                    const el = document.getElementById('admin-dashboard');
                    if (el) {
                      // Admin can look at sync tab
                      // To simplify we can alert or guide
                    }
                  }
                  alert('Để thiết lập, bạn có thể copy mã nguồn Apps Script trong file google-apps-script.js của thư mục dự án và làm theo hướng dẫn!');
                }}
                className="text-blue-500 hover:underline font-bold"
              >
                Cách lấy URL ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
