'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/database-service';
import { Exam } from '@/lib/types';
import { useAdmin } from '@/components/admin/AdminContext';
import { Plus, X } from 'lucide-react';

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

  // Loading States
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleDeleteExam = async (level: 'LV1' | 'LV2' | 'LV3', examId: string) => {
    if (
      !confirm(
        `CẢNH BÁO: Xóa đề thi sẽ xóa cả Sheet ${level}_${examId} và XÓA TOÀN BỘ câu hỏi thuộc đề này! Bạn có muốn tiếp tục?`
      )
    ) {
      return;
    }
    setActionLoading(true);
    const success = await DatabaseService.deleteExam(level, examId);
    if (success) {
      loadExams();
      onSyncComplete();
    }
    setActionLoading(false);
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
                <p className="text-xs text-blue-600 font-extrabold bg-blue-50/50 px-2.5 py-1 rounded-lg w-fit">⏱️ Thời gian: {exam.Duration || 50} phút</p>
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
                    setOpValue(String(exam.Duration || 50));
                  }}
                  className="py-1.5 bg-blue-50 hover:bg-blue-100/80 rounded-lg text-blue-600 transition cursor-pointer text-center font-extrabold"
                >
                  Thời gian thi
                </button>
                <button
                  onClick={() => handleDeleteExam(exam.Level, exam.ExamID)}
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
    </div>
  );
}
