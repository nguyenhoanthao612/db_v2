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
import { Database, X, HelpCircle, FileSpreadsheet, RefreshCw, CheckCircle, WifiOff, AlertTriangle, Loader2 } from 'lucide-react';
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
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsUrl, setSettingsUrl] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionMsg, setConnectionMsg] = useState<{ type: 'success' | 'error' | ''; message: string }>({
    type: '',
    message: '',
  });

  // Preload and synchronization blockage states for students
  const [preloadFinished, setPreloadFinished] = useState<boolean>(false);
  const [preloadStep, setPreloadStep] = useState<number>(0);
  // 0: Initial, 1: Connecting to Apps Script, 2: Syncing Exams, 3: Fetching Questions, 4: Complete, 5: Offline Fallback, 6: Local DB Mode
  const [preloadProgress, setPreloadProgress] = useState<number>(0);
  const [preloadError, setPreloadError] = useState<string>('');

  // Login preloading states
  const [loginPreloadFinished, setLoginPreloadFinished] = useState<boolean>(false);
  const [loginPreloadStep, setLoginPreloadStep] = useState<number>(0);
  const [loginPreloadProgress, setLoginPreloadProgress] = useState<number>(0);

  // 1. Initial page load mount logic (renders instantly from local cache)
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
      } else if (storedRole === 'Student') {
        const isSynced = sessionStorage.getItem('ic3_full_synced') === 'true';
        if (isSynced) {
          setPreloadFinished(true);
        }
      }
    }
  }, [router]);

  // 2. Highly optimized progressive background sync & preload blocking logic
  useEffect(() => {
    DatabaseService.initLocalStorage();
    const config = DatabaseService.getSyncConfig();
    const appsScriptUrl = config.appsScriptUrl;
    setSettingsUrl(appsScriptUrl || '');

    if (!currentUser || userRole !== 'Student') {
      // Background non-blocking sync for admin only
      if (userRole === 'Admin') {
        const delayTimer = setTimeout(() => {
          const isFullSynced = sessionStorage.getItem('ic3_full_synced') === 'true';
          if (isFullSynced || !appsScriptUrl) return;
          setSyncStatus('syncing');
          DatabaseService.pullFromGoogleSheets()
            .then((res) => {
              if (res.success) {
                sessionStorage.setItem('ic3_full_synced', 'true');
                setSyncTrigger((prev) => prev + 1);
                setSyncStatus('success');
                setTimeout(() => setSyncStatus('idle'), 3000);
              } else {
                setSyncStatus('error');
                setTimeout(() => setSyncStatus('idle'), 4000);
              }
            })
            .catch((err) => {
              console.error('Admin sync failed:', err);
              setSyncStatus('error');
              setTimeout(() => setSyncStatus('idle'), 4000);
            });
        }, 1200);
        return () => clearTimeout(delayTimer);
      }
      return;
    }

    // --- STUDENT PRELOAD & SYNC LOGIC ---
    const isFullSynced = sessionStorage.getItem('ic3_full_synced') === 'true';
    if (isFullSynced) {
      setPreloadFinished(true);
      return;
    }

    // A. Local DB mode if Apps Script is not configured
    if (!appsScriptUrl) {
      setPreloadStep(6);
      setPreloadProgress(10);
      const t1 = setTimeout(() => {
        setPreloadProgress(50);
        const t2 = setTimeout(() => {
          setPreloadProgress(100);
          setPreloadStep(4); // Ready
          const t3 = setTimeout(() => {
            setPreloadFinished(true);
            sessionStorage.setItem('ic3_full_synced', 'true');
          }, 600);
        }, 500);
      }, 400);

      return () => {
        clearTimeout(t1);
      };
    }

    // B. Online Sync mode if Apps Script is configured
    setPreloadStep(1); // Connecting...
    setPreloadProgress(10);
    setSyncStatus('syncing');

    let isSubscribed = true;

    const runOnlineSync = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 600));
        if (!isSubscribed) return;

        // Step 2: Syncing Exams & Scores
        setPreloadStep(2);
        setPreloadProgress(35);
        const dashRes = await DatabaseService.pullDashboardData();
        if (!isSubscribed) return;

        if (!dashRes.success) {
          throw new Error(dashRes.message || 'Lỗi kết nối hoặc đồng bộ danh sách đề thi.');
        }

        // Step 3: Fetching Questions
        setPreloadStep(3);
        setPreloadProgress(70);
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (!isSubscribed) return;

        const qRes = await DatabaseService.pullQuestionsData();
        if (!isSubscribed) return;

        if (!qRes.success) {
          throw new Error(qRes.message || 'Lỗi tải ngân hàng câu hỏi đề thi.');
        }

        // Step 4: Ready/Complete
        setPreloadStep(4);
        setPreloadProgress(100);
        setSyncStatus('success');
        setTimeout(() => {
          if (isSubscribed) setSyncStatus('idle');
        }, 3000);

        setTimeout(() => {
          if (isSubscribed) {
            setPreloadFinished(true);
            sessionStorage.setItem('ic3_full_synced', 'true');
            setSyncTrigger((prev) => prev + 1);
          }
        }, 1200);

      } catch (err: any) {
        console.error('Student progressive sync failed:', err);
        if (isSubscribed) {
          setPreloadStep(5); // Offline Fallback
          setPreloadProgress(100);
          setPreloadError(err.message || 'Không thể kết nối tới Google Sheets.');
          setSyncStatus('error');
          setTimeout(() => setSyncStatus('idle'), 4000);
          // Auto-unlock the dashboard after 1 second so students can work offline without any blocking modals
          setTimeout(() => {
            if (isSubscribed) {
              setPreloadFinished(true);
              sessionStorage.setItem('ic3_full_synced', 'true');
              setSyncTrigger((prev) => prev + 1);
            }
          }, 1000);
        }
      }
    };

    runOnlineSync();

    return () => {
      isSubscribed = false;
    };
  }, [currentUser, userRole, syncTrigger]);

  // 2b. Highly stylized Login Page Preloader
  useEffect(() => {
    if (currentUser) return;

    const config = DatabaseService.getSyncConfig();
    const appsScriptUrl = config.appsScriptUrl;
    const isLoginSynced = sessionStorage.getItem('ic3_login_synced') === 'true';

    // A. Local DB mode or already synced - fast elegant simulated load (650ms) to look cohesive
    if (isLoginSynced || !appsScriptUrl) {
      setLoginPreloadStep(1);
      setLoginPreloadProgress(15);
      const t1 = setTimeout(() => {
        setLoginPreloadStep(2);
        setLoginPreloadProgress(50);
        const t2 = setTimeout(() => {
          setLoginPreloadStep(3);
          setLoginPreloadProgress(85);
          const t3 = setTimeout(() => {
            setLoginPreloadProgress(100);
            setLoginPreloadStep(4);
            const t4 = setTimeout(() => {
              setLoginPreloadFinished(true);
            }, 300);
          }, 200);
        }, 150);
      }, 150);
      return () => {
        clearTimeout(t1);
      };
    }

    // B. Online Sync mode - Actual pull with visual preparation progress bar
    setLoginPreloadStep(1);
    setLoginPreloadProgress(10);
    setSyncStatus('syncing');

    let isSubscribed = true;

    const runLoginPreload = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 600));
        if (!isSubscribed) return;

        setLoginPreloadStep(2);
        setLoginPreloadProgress(50);

        const res = await DatabaseService.pullLoginData();
        if (!isSubscribed) return;

        if (res.success) {
          sessionStorage.setItem('ic3_login_synced', 'true');
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 3000);
        } else {
          console.warn('Login pull failed, running offline fallback');
        }

        setLoginPreloadStep(3);
        setLoginPreloadProgress(85);
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (!isSubscribed) return;

        setLoginPreloadProgress(100);
        setLoginPreloadStep(4);
        
        setTimeout(() => {
          if (isSubscribed) {
            setLoginPreloadFinished(true);
            setSyncTrigger((prev) => prev + 1);
          }
        }, 300);

      } catch (err) {
        console.error('Login preloader error:', err);
        if (isSubscribed) {
          setLoginPreloadProgress(100);
          setLoginPreloadFinished(true);
        }
      }
    };

    runLoginPreload();

    return () => {
      isSubscribed = false;
    };
  }, [currentUser, syncTrigger]);

  const handleLoginSuccess = (user: any, role: 'Admin' | 'Student') => {
    setCurrentUser(user);
    setUserRole(role);
    sessionStorage.setItem('ic3_current_user', JSON.stringify(user));
    sessionStorage.setItem('ic3_user_role', role);
    
    // Reset progressive flags on login to force background updates of dashboard/exams for the user
    sessionStorage.removeItem('ic3_full_synced');
    setPreloadFinished(false);
    setPreloadStep(0);
    setPreloadProgress(0);
    setSyncTrigger((prev) => prev + 1);

    if (role === 'Admin') {
      router.push('/admin/reports');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserRole(null);
    setSelectedExam(null);
    setActiveExamLevel(null);
    setLoginPreloadFinished(false);
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

      {/* Main Container */}
      <main id="main-content-section" className="transition-all duration-300">
        <AnimatePresence mode="wait">
          {!currentUser ? (
            <motion.div
              key="auth-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative min-h-[500px]"
            >
              {/* AuthModal container - blurred and translucent during preload, then transitions to crisp and fully interactive */}
              <div className={`transition-all duration-1000 ease-out ${
                !loginPreloadFinished
                  ? "filter blur-md opacity-25 scale-95 select-none pointer-events-none"
                  : "filter blur-0 opacity-100 scale-100 pointer-events-auto"
              }`}>
                <AuthModal onLoginSuccess={handleLoginSuccess} syncTrigger={syncTrigger} />
              </div>
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
              transition={{ duration: 1.0 }}
            >
              <StudentDashboard
                student={currentUser}
                onSelectExam={(exam, lvl, mode) => {
                  setSelectedExam(exam);
                  setActiveExamLevel(lvl);
                  setSelectedMode(mode);
                }}
                syncTrigger={syncTrigger}
                preloadFinished={preloadFinished}
                preloadStep={preloadStep}
                preloadProgress={preloadProgress}
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
