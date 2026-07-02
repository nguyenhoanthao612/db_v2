'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/database-service';
import { Student } from '@/lib/types';
import { useAdmin } from '@/components/admin/AdminContext';
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function StudentsPage() {
  const { syncTrigger, onSyncComplete } = useAdmin();

  // Students state
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentOffset, setStudentOffset] = useState(0);
  const [studentTotal, setStudentTotal] = useState(0);
  const studentLimit = 5;

  // Student Form Modal
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentFullName, setStudentFullName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentSchool, setStudentSchool] = useState('');

  // Loading States
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const { students: sts, total } = await DatabaseService.getStudents({
        search: studentSearch,
        limit: studentLimit,
        offset: studentOffset,
      });
      setStudents(sts);
      setStudentTotal(total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncTrigger, studentOffset, studentSearch]);

  const handleOpenStudentModal = (st: Student | null = null) => {
    if (st) {
      setEditingStudent(st);
      setStudentUsername(st.Username);
      setStudentPassword(st.Password || '123');
      setStudentFullName(st.FullName);
      setStudentClass(st.ClassGroup);
      setStudentSchool(st.SchoolName || '');
    } else {
      setEditingStudent(null);
      setStudentUsername('');
      setStudentPassword('');
      setStudentFullName('');
      setStudentClass('');
      setStudentSchool('');
    }
    setShowStudentModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentUsername || !studentFullName) return;

    setActionLoading(true);
    const id = editingStudent ? editingStudent.StudentID : `S${Date.now().toString().slice(-4)}`;

    const newSt: Student = {
      StudentID: id,
      SchoolName: studentSchool,
      Username: studentUsername,
      Password: studentPassword || '123',
      FullName: studentFullName,
      ClassGroup: studentClass,
      CreatedAt: editingStudent ? editingStudent.CreatedAt : new Date().toISOString(),
    };

    const success = await DatabaseService.saveStudent(newSt);
    if (success) {
      setShowStudentModal(false);
      loadStudents();
      onSyncComplete();
    }
    setActionLoading(false);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa học sinh này và toàn bộ lịch sử điểm không?')) return;
    setActionLoading(true);
    const success = await DatabaseService.deleteStudent(id);
    if (success) {
      loadStudents();
      onSyncComplete();
    }
    setActionLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Tìm học sinh theo tên, lớp, username..."
            value={studentSearch}
            onChange={(e) => {
              setStudentSearch(e.target.value);
              setStudentOffset(0);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <button
          onClick={() => handleOpenStudentModal()}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer self-start sm:self-auto shadow"
        >
          <Plus className="w-4 h-4" /> Thêm học sinh mới
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                <th className="p-4">Mã Học Sinh</th>
                <th className="p-4">Họ và Tên</th>
                <th className="p-4">Tên đăng nhập</th>
                <th className="p-4">Lớp</th>
                <th className="p-4">Ngày Tạo</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loadingStudents ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="p-4 h-12 bg-slate-50" />
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Không tìm thấy học sinh nào.
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.StudentID} className="hover:bg-slate-50/50">
                    <td className="p-4 font-black text-slate-700">{st.StudentID}</td>
                    <td className="p-4 font-bold text-slate-800">{st.FullName}</td>
                    <td className="p-4 text-slate-500">{st.Username}</td>
                    <td className="p-4">
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-extrabold">
                        Lớp {st.ClassGroup}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">
                      {new Date(st.CreatedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenStudentModal(st)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="Sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(st.StudentID)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {studentTotal > studentLimit && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold">
              Hiển thị {studentOffset + 1} - {Math.min(studentOffset + studentLimit, studentTotal)} trong {studentTotal} học sinh
            </span>

            <div className="flex gap-2">
              <button
                disabled={studentOffset === 0}
                onClick={() => setStudentOffset((prev) => Math.max(0, prev - studentLimit))}
                className="p-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={studentOffset + studentLimit >= studentTotal}
                onClick={() => setStudentOffset((prev) => prev + studentLimit)}
                className="p-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          STUDENT FORM MODAL
         ======================================================== */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 animate-fade-in relative">
            <button
              onClick={() => setShowStudentModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-800 mb-4">
              {editingStudent ? 'Sửa thông tin học sinh' : 'Thêm học sinh mới'}
            </h3>

            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs font-bold text-slate-500">
              <div>
                <label className="block mb-1.5">Họ và Tên</label>
                <input
                  type="text"
                  required
                  placeholder="ví dụ: Nguyễn Văn Hải"
                  value={studentFullName}
                  onChange={(e) => setStudentFullName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block mb-1.5">Tên Đăng Nhập</label>
                <input
                  type="text"
                  required
                  disabled={!!editingStudent}
                  placeholder="ví dụ: vanhai123"
                  value={studentUsername}
                  onChange={(e) => setStudentUsername(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-700 bg-slate-50/50 disabled:opacity-55"
                />
              </div>

              <div>
                <label className="block mb-1.5">Mật Khẩu</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu (Mặc định: 123)"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block mb-1.5">Trường Học</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên Trường học"
                  value={studentSchool}
                  onChange={(e) => setStudentSchool(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block mb-1.5">Lớp Học</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên Lớp (VD: 10A1)"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-700 bg-slate-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-black rounded-xl transition cursor-pointer"
              >
                {actionLoading ? 'Đang lưu học sinh...' : 'Lưu học sinh'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
