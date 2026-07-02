'use client';

import React, { useState } from 'react';
import { DatabaseService } from '@/lib/database-service';
import { Student } from '@/lib/types';
import { Shield, User, Key, UserPlus, LogIn, Sparkles, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthModalProps {
  onLoginSuccess: (user: any, role: 'Admin' | 'Student') => void;
}

export default function AuthModal({ onLoginSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'Student' | 'Admin'>('Student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dropdown options loaded from allStudents
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState('');

  // Custom registration inputs if they choose "Nhập khác"
  const [regSchoolType, setRegSchoolType] = useState<'select' | 'custom'>('custom');
  const [regSchoolCustom, setRegSchoolCustom] = useState('');
  const [regClassType, setRegClassType] = useState<'select' | 'custom'>('custom');
  const [regClassCustom, setRegClassCustom] = useState('');

  // Load students from DB to populate dropdowns
  React.useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { students } = await DatabaseService.getStudents();
        setAllStudents(students);
        
        const uniqueSchools = Array.from(new Set(students.map((s) => s.SchoolName).filter(Boolean)));
        if (uniqueSchools.length === 0) {
          setRegSchoolType('custom');
          setRegClassType('custom');
        } else {
          setRegSchoolType('select');
          setRegClassType('select');
        }
      } catch (err) {
        console.error('Failed to load students list for dropdowns:', err);
      }
    };
    fetchStudents();
  }, [isLogin]);

  // Derive schools list from allStudents
  const schools = React.useMemo(() => {
    return Array.from(new Set(allStudents.map((s) => s.SchoolName).filter(Boolean)));
  }, [allStudents]);

  // Derive classes list based on selected school
  const classes = React.useMemo(() => {
    if (!selectedSchool) return [];
    const schoolStudents = allStudents.filter((s) => s.SchoolName === selectedSchool);
    return Array.from(new Set(schoolStudents.map((s) => s.ClassGroup).filter(Boolean)));
  }, [selectedSchool, allStudents]);

  // Derive filtered students based on school and class
  const filteredStudents = React.useMemo(() => {
    if (!selectedSchool || !selectedClass) return [];
    return allStudents.filter(
      (s) => s.SchoolName === selectedSchool && s.ClassGroup === selectedClass
    );
  }, [selectedSchool, selectedClass, allStudents]);

  // Clear selections when switching roles
  const handleRoleChange = (newRole: 'Student' | 'Admin') => {
    setRole(newRole);
    setError('');
    setSelectedSchool('');
    setSelectedClass('');
    setSelectedStudentName('');
  };

  const handleSchoolChange = (school: string) => {
    setSelectedSchool(school);
    setSelectedClass('');
    setSelectedStudentName('');

    if (school) {
      const schoolStudents = allStudents.filter((s) => s.SchoolName === school);
      const uniqueClasses = Array.from(new Set(schoolStudents.map((s) => s.ClassGroup).filter(Boolean)));
      if (uniqueClasses.length === 0) {
        setRegClassType('custom');
      } else {
        setRegClassType('select');
      }
    } else {
      setRegClassType('custom');
    }
  };

  const handleClassChange = (cls: string) => {
    setSelectedClass(cls);
    setSelectedStudentName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        if (role === 'Admin') {
          if (!username.trim() || !password.trim()) {
            setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
            setLoading(false);
            return;
          }
          const res = await DatabaseService.login(username.trim(), password.trim(), 'Admin');
          if (res.success && res.user) {
            onLoginSuccess(res.user, 'Admin');
          } else {
            setError(res.message || 'Tài khoản hoặc mật khẩu không chính xác.');
          }
        } else {
          // Student login via cascading dropdown
          if (!selectedSchool) {
            setError('Vui lòng chọn Trường.');
            setLoading(false);
            return;
          }
          if (!selectedClass) {
            setError('Vui lòng chọn Lớp.');
            setLoading(false);
            return;
          }
          if (!selectedStudentName) {
            setError('Vui lòng chọn Tên học sinh.');
            setLoading(false);
            return;
          }
          if (!password.trim()) {
            setError('Vui lòng nhập mật khẩu.');
            setLoading(false);
            return;
          }

          const res = await DatabaseService.login('', password.trim(), 'Student', {
            schoolName: selectedSchool,
            classGroup: selectedClass,
            fullName: selectedStudentName,
          });

          if (res.success && res.user) {
            onLoginSuccess(res.user, 'Student');
          } else {
            setError(res.message || 'Mật khẩu học sinh không chính xác.');
          }
        }
      } else {
        // Student Register
        if (!fullName.trim()) {
          setError('Vui lòng nhập họ và tên.');
          setLoading(false);
          return;
        }

        const schoolToSave = regSchoolType === 'custom' ? regSchoolCustom.trim() : selectedSchool;
        const classToSave = regClassType === 'custom' ? regClassCustom.trim() : classGroup;

        if (!schoolToSave) {
          setError('Vui lòng chọn hoặc nhập tên Trường học.');
          setLoading(false);
          return;
        }
        if (!classToSave) {
          setError('Vui lòng chọn hoặc nhập tên Lớp học.');
          setLoading(false);
          return;
        }
        if (!password.trim()) {
          setError('Vui lòng nhập mật khẩu đăng nhập.');
          setLoading(false);
          return;
        }

        const generatedUsername = `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        const newStudent: Student = {
          StudentID: `S${Date.now().toString().slice(-4)}`,
          SchoolName: schoolToSave,
          Username: generatedUsername,
          Password: password.trim(),
          FullName: fullName.trim(),
          ClassGroup: classToSave,
          CreatedAt: new Date().toISOString(),
        };

        const success = await DatabaseService.saveStudent(newStudent);
        if (success) {
          onLoginSuccess(newStudent, 'Student');
        } else {
          setError('Đăng ký không thành công. Hãy kiểm tra kết nối.');
        }
      }
    } catch (err: any) {
      setError('Đã xảy ra lỗi hệ thống. Thử lại sau.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal-overlay" className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50/30 to-sky-50 px-4 py-8">
      <div className="w-full max-w-md bg-white border border-blue-100/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-blue-100/50 relative overflow-hidden">
        {/* Cute background circles */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-100/40 rounded-full blur-xl" />
        <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-indigo-100/40 rounded-full blur-xl" />

        {/* Floating icon */}
        <div className="flex flex-col items-center text-center mb-6 relative">
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 mb-3 animate-bounce" style={{ animationDuration: '3s' }}>
            <BookOpen className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Chào Bạn Nhé! 👋
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1 max-w-xs">
            Đăng nhập ôn tập IC3 GS6 11 dạng bài học sinh
          </p>
        </div>

        {/* Role Toggle Selector for Login */}
        {isLogin && (
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6 text-xs font-bold shadow-inner">
            <button
              onClick={() => handleRoleChange('Student')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                role === 'Student' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Học Sinh
            </button>
            <button
              onClick={() => handleRoleChange('Admin')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                role === 'Admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Quản Trị Viên
            </button>
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* REGISTER FLOW */}
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Họ và Tên Học Sinh</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-500">Trường Học</label>
                  {schools.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setRegSchoolType(regSchoolType === 'select' ? 'custom' : 'select')}
                      className="text-xs text-blue-500 hover:underline font-bold"
                    >
                      {regSchoolType === 'select' ? 'Tự nhập tên trường' : 'Chọn trường có sẵn'}
                    </button>
                  )}
                </div>
                {regSchoolType === 'select' && schools.length > 0 ? (
                  <select
                    value={selectedSchool}
                    onChange={(e) => handleSchoolChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white"
                  >
                    <option value="">-- Chọn Trường học có sẵn --</option>
                    {schools.map((school) => (
                      <option key={school} value={school}>
                        {school}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={regSchoolCustom}
                    onChange={(e) => setRegSchoolCustom(e.target.value)}
                    placeholder="Nhập tên trường học của bạn"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                  />
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-500">Lớp Học</label>
                  {classes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setRegClassType(regClassType === 'select' ? 'custom' : 'select')}
                      className="text-xs text-blue-500 hover:underline font-bold"
                    >
                      {regClassType === 'select' ? 'Tự nhập tên lớp' : 'Chọn lớp có sẵn'}
                    </button>
                  )}
                </div>
                {regClassType === 'select' && classes.length > 0 ? (
                  <select
                    value={classGroup}
                    onChange={(e) => setClassGroup(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white"
                  >
                    <option value="">-- Chọn Lớp học có sẵn --</option>
                    {classes.map((cls) => (
                      <option key={cls} value={cls}>
                        Lớp {cls}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={regClassCustom}
                    onChange={(e) => setRegClassCustom(e.target.value)}
                    placeholder="Nhập tên lớp học (VD: 10A1)"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                  />
                )}
              </div>
            </>
          )}

          {/* LOGIN FLOW - STUDENT CASCADING DROPDOWNS */}
          {isLogin && role === 'Student' && (
            <>
              {/* 1. Chọn Trường */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Trường Học</label>
                <select
                  required
                  value={selectedSchool}
                  onChange={(e) => handleSchoolChange(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white"
                >
                  <option value="">-- Chọn Trường --</option>
                  {schools.length === 0 ? (
                    <option value="" disabled>Chưa có dữ liệu trường học. Vui lòng liên hệ Giáo viên/Quản trị viên.</option>
                  ) : (
                    schools.map((school) => (
                      <option key={school} value={school}>
                        {school}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* 2. Chọn Lớp */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Lớp Học</label>
                <select
                  required
                  disabled={!selectedSchool}
                  value={selectedClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">-- Chọn Lớp (Chọn Trường trước) --</option>
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>
                      Lớp {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Chọn Tên Học Sinh */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Học Sinh</label>
                <select
                  required
                  disabled={!selectedClass}
                  value={selectedStudentName}
                  onChange={(e) => setSelectedStudentName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">-- Chọn Tên học sinh (Chọn Lớp trước) --</option>
                  {filteredStudents.map((st) => (
                    <option key={st.StudentID} value={st.FullName}>
                      {st.FullName}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* LOGIN FLOW - ADMIN USERNAME FIELD */}
          {isLogin && role === 'Admin' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Tên Đăng Nhập Quản Trị Viên</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>
          )}

          {/* PASSWORD FIELD FOR ALL FLOWS */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Mật Khẩu</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-extrabold rounded-xl transition shadow-md shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            {loading ? (
              'Vui lòng đợi...'
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" /> Đăng Nhập Ngay
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Hoàn Tất Đăng Ký
              </>
            )}
          </button>
        </form>

        {/* Registration is closed by request */}
      </div>
    </div>
  );
}
