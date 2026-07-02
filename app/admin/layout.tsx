'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DatabaseService } from '@/lib/database-service';
import Header from '@/components/Header';
import Link from 'next/link';
import { Activity, Users, BookOpen, HelpCircle, FileSpreadsheet, Settings } from 'lucide-react';
import { AdminContext } from '@/components/admin/AdminContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'Admin' | 'Student' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncTrigger, setSyncTrigger] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Initial local storage setup
    DatabaseService.initLocalStorage();

    const storedUser = sessionStorage.getItem('ic3_current_user');
    const storedRole = sessionStorage.getItem('ic3_user_role');
    if (storedUser && storedRole) {
      const parsedUser = JSON.parse(storedUser);
      if (storedRole === 'Admin') {
        setCurrentUser(parsedUser);
        setUserRole('Admin');
        setIsLoading(false);
      } else {
        router.replace('/');
      }
    } else {
      router.replace('/');
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('ic3_current_user');
    sessionStorage.removeItem('ic3_user_role');
    router.replace('/');
  };

  const triggerSyncUpdate = () => {
    setSyncTrigger((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-bold">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Determine active tab ID from URL path
  let activeTab = 'stats';
  if (pathname?.includes('/admin/students')) activeTab = 'students';
  else if (pathname?.includes('/admin/exams')) activeTab = 'exams';
  else if (pathname?.includes('/admin/questions')) activeTab = 'questions';
  else if (pathname?.includes('/admin/settings')) activeTab = 'sync';

  return (
    <AdminContext.Provider value={{ syncTrigger, onSyncComplete: triggerSyncUpdate, currentUser, userRole }}>
      <div id="app-root-container" className="min-h-screen bg-slate-50/50 text-slate-700 font-sans selection:bg-blue-100 selection:text-blue-800">
        <Header
          currentUser={currentUser}
          userRole={userRole}
          onLogout={handleLogout}
          onOpenSettings={() => router.push('/admin/settings')}
          syncTrigger={syncTrigger}
          onSyncComplete={triggerSyncUpdate}
        />

        <main id="main-content-section" className="transition-all duration-300">
          <div id="admin-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Title block */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800">Quản trị Hệ thống IC3 GS6</h2>
                <p className="text-xs text-slate-400 font-bold">Quản lý đồng bộ hai chiều tuyệt đối, chỉnh sửa học sinh, đề ôn tập và ngân hàng câu hỏi</p>
              </div>

              <Link
                href="/admin/settings"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-extrabold rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} /> Cấu hình Sheets URL
              </Link>
            </div>

            {/* TABS SELECTOR */}
            <div className="flex flex-wrap border-b border-slate-200 gap-2 font-bold text-xs">
              {[
                { id: 'stats', label: 'Báo cáo & Thống kê', icon: Activity, href: '/admin/reports' },
                { id: 'students', label: 'Quản lý Học sinh', icon: Users, href: '/admin/students' },
                { id: 'exams', label: 'Quản lý Đề ôn tập', icon: BookOpen, href: '/admin/exams' },
                { id: 'questions', label: 'Ngân hàng Câu hỏi', icon: HelpCircle, href: '/admin/questions' },
                { id: 'sync', label: 'Cài đặt kết nối Sheets', icon: FileSpreadsheet, href: '/admin/settings' },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className={`flex items-center gap-1.5 px-4 py-3 border-b-2 font-bold cursor-pointer transition ${
                      isSelected ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            <div className="pt-2">
              {children}
            </div>
          </div>
        </main>
      </div>
    </AdminContext.Provider>
  );
}
