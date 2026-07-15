'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/database-service';
import { Exam } from '@/lib/types';
import { useAdmin } from '@/components/admin/AdminContext';
import { Plus, X, RefreshCw } from 'lucide-react';

export default function ExamsPage() {
  const { syncTrigger, onSyncComplete } = useAdmin();

  // Exams State
  const [exams, setExams] = useState<Exam[]>([]);
  const [examLevel, setExamLevel] = useState<'LV1' | 'LV2' | 'LV3'>('LV1');
  const [newExamId, setNewExamId] = useState('');

  // Operations State
  const [selectedExamForOp, setSelectedExamForOp] = useState<Exam | null>(null);
  const [examOpType, setExamOpType] = useState<'rename' | 'move' | 'copy' | 'duration' | ''>('');
  const [opValue, setOpValue] = useState('');
  const [opTargetLevel, setOpTargetLevel] = useState<'LV1' | 'LV2' | 'LV3'>('LV1');

  // Merge State
  const [mergeSourceExams, setMergeSourceExams] = useState<{ Level: 'LV1' | 'LV2' | 'LV3'; ExamID: string }[]>([]);
  const [mergeTargetLevel, setMergeTargetLevel] = useState<'LV1' | 'LV2' | 'LV3'>('LV1');
  const [mergeTargetExamId, setMergeTargetExamId] = useState('');

  // Loading States
  const [actionLoading, setActionLoading] = useState(false);

  // Delete Confirmation State
  const [examToDelete, setExamToDelete] = useState<{ level: 'LV1' | 'LV2' | 'LV3'; examId: string } | null>(null);

  const loadExams = async () => {
    try {
      const allExams = await DatabaseService.getExams();
      setExams(allExams);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadExams();
  }, [syncTrigger]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamId.trim()) return;

    setActionLoading(true);
    const examId = newExamId.trim().toUpperCase();

    // Verify duplication
    if (exams.some((ex) => ex.ExamID === examId && ex.Level === examLevel)) {
      alert('Đề thi này đã tồn tại ở Level này!');
      setActionLoading(false);
      return;
    }

    const success = await DatabaseService.createExam(examLevel, examId);
    if (success) {
      setNewExamId('');
      loadExams();
      onSyncComplete();
      alert(`Đã tự động tạo Sheet đề thi ${examLevel}_${examId} thành công!`);
    }
    setActionLoading(false);
  };

  const handleRenameExamSubmit = async () => {
    if (!selectedExamForOp || !opValue.trim()) return;
    setActionLoading(true);
    const success = await DatabaseService.renameExam(selectedExamForOp.Level, selectedExamForOp.ExamID, opValue.trim().toUpperCase());
    if (success) {
      setExamOpType('');
      setSelectedExamForOp(null);
      setOpValue('');
      loadExams();
      onSyncComplete();
    }
    setActionLoading(false);
  };

  const handleMoveExamSubmit = async () => {
    if (!selectedExamForOp) return;
    setActionLoading(true);
    const success = await DatabaseService.moveExam(selectedExamForOp.ExamID, selectedExamForOp.Level, opTargetLevel);
    if (success) {
      setExamOpType('');
      setSelectedExamForOp(null);
      loadExams();
      onSyncComplete();
    }
    setActionLoading(false);
  };

  const handleCopyExamSubmit = async () => {
    if (!selectedExamForOp || !opValue.trim()) return;
    setActionLoading(true);
    const success = await DatabaseService.copyExam(
      selectedExamForOp.Level,
      selectedExamForOp.ExamID,
      opTargetLevel,
      opValue.trim().toUpperCase()
    );
    if (success) {
      setExamOpType('');
      setSelectedExamForOp(null);
      setOpValue('');
      loadExams();
      onSyncComplete();
    }
    setActionLoading(false);
  };

  const handleUpdateDurationSubmit = async () => {
    if (!selectedExamForOp || !opValue.trim()) return;
    setActionLoading(true);
    const mins = parseInt(opValue.trim(), 10);
    if (isNaN(mins) || mins <= 0) {
      alert('Vui lòng nhập số phút hợp lệ lớn hơn 0!');
      setActionLoading(false);
      return;
    }
    const success = await DatabaseService.updateExamDuration(selectedExamForOp.Level, selectedExamForOp.ExamID, mins);
    if (success) {
      setExamOpType('');
      setSelectedExamForOp(null);
      setOpValue('');
      loadExams();
      onSyncComplete();
      alert('Đã cập nhật thời gian làm bài thành công!');
    }
    setActionLoading(false);
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    const { level, examId } = examToDelete;
    setActionLoading(true);
    const success = await DatabaseService.deleteExam(level, examId);
    if (success) {
      setExamToDelete(null);
      loadExams();
      onSyncComplete();
    }
    setActionLoading(false);
  };

  const handleMergeExamsSubmit = async () => {
    if (mergeSourceExams.length < 2) {
      alert('Vui lòng chọn từ 2 đề thi trở lên để gộp!');
      return;
    }
    const targetId = mergeTargetExamId.trim().toUpperCase();
    if (!targetId) {
      alert('Vui lòng nhập tên đề thi mới!');
      return;
    }

    // Check if target exam already exists
    if (exams.some(ex => ex.ExamID === targetId && ex.Level === mergeTargetLevel)) {
      alert(`Đề thi ${mergeTargetLevel}_${targetId} đã tồn tại! Vui lòng chọn tên khác để tạo đề mới hoàn toàn.`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await DatabaseService.mergeExams(mergeSourceExams, mergeTargetLevel, targetId);
      if (res.success) {
        alert(`Đã gộp thành công ${res.questionCount} câu hỏi thành đề thi mới ${mergeTargetLevel}_${targetId}!`);
        setMergeSourceExams([]);
        setMergeTargetExamId('');
        loadExams();
        onSyncComplete();
      }
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi trong quá trình gộp đề thi!');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Exam Sheet block */}
      <form onSubmit={handleCreateExam} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800">Tạo đề thi mới (Tạo Google Sheet tự động)</h3>
          <p className="text-xs text-slate-400">Đặt tên đề thi (ví dụ: OT5, OT6). Hệ thống sẽ tự tạo Sheet đề tương ứng trên Google Sheets.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 max-w-[160px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cấp độ (Level)</label>
            <select
              value={examLevel}
              onChange={(e) => setExamLevel(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none"
            >
              <option value="LV1">Level 1 (LV1)</option>
              <option value="LV2">Level 2 (LV2)</option>
              <option value="LV3">Level 3 (LV3)</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên Đề thi (ExamID)</label>
            <input
              type="text"
              required
              placeholder="ví dụ: OT4"
              value={newExamId}
              onChange={(e) => setNewExamId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none bg-white font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow self-end cursor-pointer font-bold"
          >
            <Plus className="w-4 h-4" /> {actionLoading ? 'Đang tạo...' : 'Tạo đề thi mới'}
          </button>
        </div>
      </form>

      {/* Merge Exams block */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800">Gộp các đề thi thành một đề mới (Trộn / Merge)</h3>
          <p className="text-xs text-slate-400">Chọn 2 đề trở lên để gộp toàn bộ câu hỏi của các đề đó thành một đề thi mới hoàn toàn.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Bước 1: Chọn các đề thi cần gộp</label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white p-3 space-y-2">
              {exams.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 font-bold">Chưa có đề thi nào để chọn.</p>
              ) : (
                exams.map((ex) => {
                  const isChecked = mergeSourceExams.some(src => src.Level === ex.Level && src.ExamID === ex.ExamID);
                  return (
                    <label key={`${ex.Level}_${ex.ExamID}`} className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setMergeSourceExams(prev => prev.filter(src => !(src.Level === ex.Level && src.ExamID === ex.ExamID)));
                          } else {
                            setMergeSourceExams(prev => [...prev, { Level: ex.Level, ExamID: ex.ExamID }]);
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-extrabold text-slate-700">
                          {ex.Level}_{ex.ExamID}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">
                          {ex.QuestionIDs?.length || 0} câu
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            {mergeSourceExams.length > 0 && (
              <p className="text-[10px] text-blue-600 font-bold">
                Đã chọn: {mergeSourceExams.map(ex => `${ex.Level}_${ex.ExamID}`).join(', ')}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Bước 2: Thông tin đề thi mới</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cấp độ (Level)</label>
                <select
                  value={mergeTargetLevel}
                  onChange={(e) => setMergeTargetLevel(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none"
                >
                  <option value="LV1">Level 1 (LV1)</option>
                  <option value="LV2">Level 2 (LV2)</option>
                  <option value="LV3">Level 3 (LV3)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên Đề mới (ExamID)</label>
                <input
                  type="text"
                  required
                  placeholder="ví dụ: OT_GOP"
                  value={mergeTargetExamId}
                  onChange={(e) => setMergeTargetExamId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none bg-white font-bold"
                />
              </div>
            </div>

            <button
              onClick={handleMergeExamsSubmit}
              disabled={actionLoading || mergeSourceExams.length < 2 || !mergeTargetExamId.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow cursor-pointer transition font-bold"
            >
              <RefreshCw className="w-4 h-4" /> {actionLoading ? 'Đang gộp...' : 'Bắt đầu gộp đề thi'}
            </button>
            <p className="text-[10px] text-slate-400 leading-normal">
              * Quy tắc: Đề mới gộp xong sẽ tự động thừa hưởng toàn bộ câu hỏi. Nếu tổng số câu hỏi <strong>lớn hơn 100 câu</strong>, thời gian làm bài mặc định được cài là <strong>70 phút</strong> (ngược lại là 50 phút).
            </p>
          </div>
        </div>
      </div>

      {/* ACTIVE EXAMS LIST */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800">Danh sách các Đề ôn tập đang có</h3>
          <p className="text-xs text-slate-400 font-semibold">Tự động đồng bộ và phản hồi đổi tên, di chuyển hay nhân bản.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => (
            <div
              key={`${exam.Level}_${exam.ExamID}`}
              className="bg-white border border-slate-200/60 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition duration-200 shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="px-2 py-0.5 text-[9px] font-black bg-blue-500 text-white rounded-full">
                    {exam.Level}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Sheet: {exam.Level}_{exam.ExamID}</span>
                </div>
                <h4 className="text-sm font-black text-slate-800">Đề Ôn Tập: {exam.ExamID}</h4>
                <p className="text-xs text-slate-400 font-bold">Số lượng câu hỏi đã gán: {exam.QuestionIDs?.length || 0} câu</p>
                <p className="text-xs text-blue-600 font-extrabold bg-blue-50/50 px-2.5 py-1 rounded-lg w-fit">⏱️ Thời gian: {exam.Duration || (exam.QuestionIDs?.length > 100 ? 70 : 50)} phút</p>
              </div>

              {/* Actions buttons */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs font-bold text-slate-500">
                <button
                  onClick={() => {
                    setSelectedExamForOp(exam);
                    setExamOpType('rename');
                    setOpValue(exam.ExamID);
                  }}
                  className="py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer text-center"
                >
                  Đổi tên đề
                </button>
                <button
                  onClick={() => {
                    setSelectedExamForOp(exam);
                    setExamOpType('move');
                    setOpTargetLevel(exam.Level);
                  }}
                  className="py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer text-center"
                >
                  Di chuyển LV
                </button>
                <button
                  onClick={() => {
                    setSelectedExamForOp(exam);
                    setExamOpType('copy');
                    setOpValue(`${exam.ExamID}_CLONE`);
                    setOpTargetLevel(exam.Level);
                  }}
                  className="py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer text-center"
                >
                  Sao chép đề
                </button>
                <button
                  onClick={() => {
                    setSelectedExamForOp(exam);
                    setExamOpType('duration');
                    setOpValue(String(exam.Duration || (exam.QuestionIDs?.length > 100 ? 70 : 50)));
                  }}
                  className="py-1.5 bg-blue-50 hover:bg-blue-100/80 rounded-lg text-blue-600 transition cursor-pointer text-center font-extrabold"
                >
                  Thời gian thi
                </button>
                <button
                  onClick={() => setExamToDelete({ level: exam.Level, examId: exam.ExamID })}
                  className="py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 transition cursor-pointer text-center col-span-2"
                >
                  Xóa đề thi
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DYNAMIC OPERATIONS PANEL */}
      {selectedExamForOp && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-4 max-w-xl animate-fade-in">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-blue-800 uppercase tracking-wide">
              Đang xử lý đề {selectedExamForOp.Level}_{selectedExamForOp.ExamID}
            </h4>
            <button
              onClick={() => {
                setSelectedExamForOp(null);
                setExamOpType('');
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {examOpType === 'rename' && (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên Đề mới</label>
                <input
                  type="text"
                  value={opValue}
                  onChange={(e) => setOpValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold"
                />
              </div>
              <button
                onClick={handleRenameExamSubmit}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Xác nhận đổi tên
              </button>
            </div>
          )}

          {examOpType === 'duration' && (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Thời gian làm bài (Phút)</label>
                <input
                  type="number"
                  min="1"
                  value={opValue}
                  onChange={(e) => setOpValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold"
                />
              </div>
              <button
                onClick={handleUpdateDurationSubmit}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Xác nhận lưu
              </button>
            </div>
          )}

          {examOpType === 'move' && (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chọn Level đích</label>
                <select
                  value={opTargetLevel}
                  onChange={(e) => setOpTargetLevel(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-700"
                >
                  <option value="LV1">Level 1 (LV1)</option>
                  <option value="LV2">Level 2 (LV2)</option>
                  <option value="LV3">Level 3 (LV3)</option>
                </select>
              </div>
              <button
                onClick={handleMoveExamSubmit}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Xác nhận di chuyển
              </button>
            </div>
          )}

          {examOpType === 'copy' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Đến Level</label>
                  <select
                    value={opTargetLevel}
                    onChange={(e) => setOpTargetLevel(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-700"
                  >
                    <option value="LV1">Level 1 (LV1)</option>
                    <option value="LV2">Level 2 (LV2)</option>
                    <option value="LV3">Level 3 (LV3)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên đề bản sao (ExamID)</label>
                  <input
                    type="text"
                    value={opValue}
                    onChange={(e) => setOpValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold"
                  />
                </div>
              </div>
              <button
                onClick={handleCopyExamSubmit}
                disabled={actionLoading}
                className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer text-center"
              >
                Bắt đầu sao chép (Clone câu hỏi & Tạo Sheet mới)
              </button>
            </div>
          )}
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-800">Xác nhận xóa đề thi</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Bạn đang chuẩn bị xóa đề thi <strong className="text-slate-700">{examToDelete.level}_{examToDelete.examId}</strong>.
                </p>
                <p className="text-[11px] text-red-500 font-bold leading-relaxed bg-red-50 p-2 rounded-lg mt-2">
                  CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn Sheet đề thi tương ứng trên Google Sheets và TOÀN BỘ câu hỏi thuộc đề này! Bạn có muốn tiếp tục?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setExamToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteExam}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-red-200 flex items-center gap-1.5"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  'Đồng ý xóa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
