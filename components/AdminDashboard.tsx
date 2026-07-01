/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/database-service';
import { Question, Student, ScoreRecord, Exam, IC3QuestionType, QuestionAnswers } from '@/lib/types';
import {
  Users,
  BookOpen,
  HelpCircle,
  Activity,
  Plus,
  Edit,
  Trash2,
  Search,
  Settings,
  ArrowRight,
  Check,
  X,
  FileSpreadsheet,
  Download,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Video,
  ListOrdered,
  Grid,
  CheckCircle,
  Copy,
  FolderOpen,
} from 'lucide-react';
import { motion } from 'motion/react';
import AppsScriptGuide from './AppsScriptGuide';

interface AdminDashboardProps {
  syncTrigger: number;
  onSyncComplete: () => void;
  onOpenSettings: () => void;
}

export default function AdminDashboard({ syncTrigger, onSyncComplete, onOpenSettings }: AdminDashboardProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'stats' | 'students' | 'exams' | 'questions' | 'sync'>('stats');

  // Stats State
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalExams: 0,
    totalQuestions: 0,
    totalSubmissions: 0,
    avgScore: 0,
    accuracyRate: 0,
  });

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

  // Exams State
  const [exams, setExams] = useState<Exam[]>([]);
  const [examLevel, setExamLevel] = useState<'LV1' | 'LV2' | 'LV3'>('LV1');
  const [newExamId, setNewExamId] = useState('');

  // Exam Operations State
  const [selectedExamForOp, setSelectedExamForOp] = useState<Exam | null>(null);
  const [examOpType, setExamOpType] = useState<'rename' | 'move' | 'copy' | ''>('');
  const [opValue, setOpValue] = useState('');
  const [opTargetLevel, setOpTargetLevel] = useState<'LV1' | 'LV2' | 'LV3'>('LV1');

  // Questions State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qSearch, setQSearch] = useState('');
  const [qLevelFilter, setQLevelFilter] = useState<string>('');
  const [qExamFilter, setQExamFilter] = useState<string>('');
  const [qTypeFilter, setQTypeFilter] = useState<string>('');
  const [qOffset, setQOffset] = useState(0);
  const [qTotal, setQTotal] = useState(0);
  const qLimit = 5;

  // Question Form Modal
  const [showQModal, setShowQModal] = useState(false);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [qId, setQId] = useState('');
  const [qExamID, setQExamID] = useState('OT1');
  const [qLevel, setQLevel] = useState<'LV1' | 'LV2' | 'LV3'>('LV1');
  const [qType, setQType] = useState<IC3QuestionType>('Multiple Choice');
  const [qContent, setQContent] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qScore, setQScore] = useState(10);
  const [qImageUrl, setQImageUrl] = useState('');
  const [qVideoUrl, setQVideoUrl] = useState('');

  // Dynamic input fields for 11 Types
  const [mcOptions, setMcOptions] = useState<string[]>(['', '', '', '']);
  const [correctMcIndex, setCorrectMcIndex] = useState(0);

  const [mrOptions, setMrOptions] = useState<string[]>(['', '', '', '']);
  const [correctMrIndices, setCorrectMrIndices] = useState<number[]>([]);

  const [tfCorrect, setTfCorrect] = useState<'Đúng' | 'Sai'>('Đúng');

  // For Matching
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>([{ left: '', right: '' }]);

  // For Ordering
  const [sequenceList, setSequenceList] = useState<string[]>(['', '', '']);

  // For Statement True/False Multiple
  const [stmtRows, setStmtRows] = useState<{ text: string; correct: boolean }[]>([{ text: '', correct: true }]);

  // For Categorization
  const [catCategories, setCatCategories] = useState<string[]>(['', '']);
  const [catItems, setCatItems] = useState<{ name: string; category: string }[]>([{ name: '', category: '' }]);

  // For Hotspots
  const [hotspotsList, setHotspotsList] = useState<{ id: string; name: string; x: number; y: number; w: number; h: number }[]>([
    { id: 'hotspot_1', name: 'Nút A', x: 10, y: 10, w: 20, h: 20 },
  ]);
  const [correctHotspotId, setCorrectHotspotId] = useState('hotspot_1');
  const [draggingSpot, setDraggingSpot] = useState<{
    id: string;
    startX: number;
    startY: number;
    startSpotX: number;
    startSpotY: number;
    containerWidth: number;
    containerHeight: number;
  } | null>(null);
  const [drawingRect, setDrawingRect] = useState<{
    startX: number;
    startY: number;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [resizingSpot, setResizingSpot] = useState<{
    id: string;
    handle: string;
    startX: number;
    startY: number;
    startSpotX: number;
    startSpotY: number;
    startSpotW: number;
    startSpotH: number;
    containerWidth: number;
    containerHeight: number;
  } | null>(null);

  // Match Image To Text
  const [imgTextPairs, setImgTextPairs] = useState<{ img: string; text: string }[]>([{ img: '', text: '' }]);

  // Matrix selection
  const [matrixRows, setMatrixRows] = useState<string[]>(['Row A', 'Row B']);
  const [matrixCols, setMatrixCols] = useState<string[]>(['Col 1', 'Col 2']);
  const [matrixCorrect, setMatrixCorrect] = useState<Record<string, string>>({});

  // Loading States
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Auto parsing states for raw IC3 question text
  const [parseStatus, setParseStatus] = useState('');

  const handleAutoParse = (text: string) => {
    if (!text.trim()) {
      return;
    }

    try {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        return;
      }

      let explanation = '';
      let cleanedLines: string[] = [];

      // Extract explanation
      let explanationIndex = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        const lowerLine = lines[i].toLowerCase();
        if (lowerLine.startsWith('giải thích:') || 
            lowerLine.startsWith('lý do:') || 
            lowerLine.startsWith('explanation:') || 
            lowerLine.startsWith('explain:') ||
            lowerLine.startsWith('*giải thích:') ||
            lowerLine.startsWith('**giải thích:')) {
          explanationIndex = i;
          break;
        }
      }

      if (explanationIndex !== -1) {
        explanation = lines.slice(explanationIndex)
          .join('\n')
          .replace(/^(giải thích|lý do|explanation|explain|[* ]*giải thích)[：:\s]*/i, '')
          .trim();
        cleanedLines = lines.slice(0, explanationIndex);
      } else {
        cleanedLines = [...lines];
      }

      // Separate question from options
      let questionLines: string[] = [];
      let optionLines: string[] = [];
      let reachedOptions = false;

      const isOptionLine = (line: string) => {
        const lower = line.toLowerCase();
        if (/^[a-fA-F]\.\s+/.test(line)) return true;
        if (/^[a-fA-F]\)\s+/.test(line)) return true;
        if (lower.startsWith('- ') || lower.startsWith('• ')) return true;
        if (lower.includes('(correct)')) return true;
        return false;
      };

      for (const line of cleanedLines) {
        if (isOptionLine(line)) {
          reachedOptions = true;
        }
        if (reachedOptions) {
          optionLines.push(line);
        } else {
          questionLines.push(line);
        }
      }

      // Fallback
      if (optionLines.length === 0 && cleanedLines.length > 2) {
        const lastLines = cleanedLines.slice(-4);
        if (lastLines.every(l => /^[a-fA-D1-4]\s*[\.\s\)]/i.test(l))) {
          questionLines = cleanedLines.slice(0, -4);
          optionLines = lastLines;
        } else {
          questionLines = [cleanedLines[0]];
          optionLines = cleanedLines.slice(1);
        }
      }

      const questionContent = questionLines.join('\n').trim();
      const lowerQuestion = questionContent.toLowerCase();

      // Parse individual options
      const parsedOptions = optionLines.map((line) => {
        let textVal = line;
        let isCorrect = false;

        if (line.toLowerCase().includes('(correct)')) {
          isCorrect = true;
          textVal = line.replace(/\(correct\)/i, '').trim();
        }

        // Strip prefix (e.g., "a.", "b.", "1.", "-", etc.)
        textVal = textVal.replace(/^([a-fA-F0-9\-•])[\.\)\s\-•]+\s*/, '').trim();
        return { text: textVal, isCorrect };
      });

      const correctCount = parsedOptions.filter(o => o.isCorrect).length;

      // Identify question type
      let detectedType: IC3QuestionType = 'Multiple Choice';

      const hasArrow = optionLines.some(l => l.includes('->') || l.includes('➔') || l.includes('-->'));
      const isSequenceKeyword = lowerQuestion.includes('thứ tự') || 
                                lowerQuestion.includes('sắp xếp') || 
                                lowerQuestion.includes('trình tự') || 
                                lowerQuestion.includes('các bước') ||
                                lowerQuestion.includes('sequence') || 
                                lowerQuestion.includes('order');

      const isTrueFalse = parsedOptions.length === 2 && (
        parsedOptions.some(o => ['đúng', 'sai'].includes(o.text.toLowerCase())) ||
        parsedOptions.some(o => ['true', 'false'].includes(o.text.toLowerCase())) ||
        parsedOptions.some(o => ['yes', 'no'].includes(o.text.toLowerCase()))
      );

      const isTrueFalseMultiple = parsedOptions.length > 2 && parsedOptions.every(o => 
        o.text.toLowerCase().endsWith('đúng') || 
        o.text.toLowerCase().endsWith('sai') || 
        o.text.toLowerCase().includes('đúng') || 
        o.text.toLowerCase().includes('sai') ||
        o.text.toLowerCase().endsWith('true') || 
        o.text.toLowerCase().endsWith('false')
      );

      const isCategorization = lowerQuestion.includes('phân loại') || lowerQuestion.includes('categorize') || lowerQuestion.includes('nhóm');

      const isMultipleResponse = 
        lowerQuestion.includes('(chọn 2)') || 
        lowerQuestion.includes('(chọn 3)') || 
        lowerQuestion.includes('(chọn tất cả') || 
        lowerQuestion.includes('choose 2') || 
        lowerQuestion.includes('choose 3') || 
        correctCount >= 2;

      if (isTrueFalse) {
        detectedType = 'True / False';
      } else if (hasArrow) {
        if (isCategorization) {
          detectedType = 'Categorization';
        } else {
          detectedType = 'Matching';
        }
      } else if (isSequenceKeyword && parsedOptions.length > 2) {
        detectedType = 'Sequence Ordering';
      } else if (isTrueFalseMultiple) {
        detectedType = 'True/False Multiple';
      } else if (isMultipleResponse) {
        detectedType = 'Multiple Response';
      } else {
        detectedType = 'Multiple Choice';
      }

      setQType(detectedType);
      setQContent(questionContent);
      setQExplanation(explanation);

      // Apply inputs depending on type
      if ((detectedType as string) === 'Multiple Choice' || (detectedType as string) === 'Video Based') {
        const mcOps = ['', '', '', ''];
        parsedOptions.forEach((o, i) => {
          if (i < 4) mcOps[i] = o.text;
        });
        if (parsedOptions.length > 4) {
          setMcOptions(parsedOptions.map(o => o.text));
        } else {
          setMcOptions(mcOps);
        }
        
        const correctIdx = parsedOptions.findIndex(o => o.isCorrect);
        setCorrectMcIndex(correctIdx !== -1 ? correctIdx : 0);
      } 
      else if (detectedType === 'Multiple Response') {
        const mrOps = ['', '', '', ''];
        parsedOptions.forEach((o, i) => {
          if (i < 4) mrOps[i] = o.text;
        });
        if (parsedOptions.length > 4) {
          setMrOptions(parsedOptions.map(o => o.text));
        } else {
          setMrOptions(mrOps);
        }

        const correctIndices: number[] = [];
        parsedOptions.forEach((o, i) => {
          if (o.isCorrect) correctIndices.push(i);
        });
        setCorrectMrIndices(correctIndices);
      } 
      else if (detectedType === 'True / False') {
        const correctOpt = parsedOptions.find(o => o.isCorrect);
        if (correctOpt) {
          const txt = correctOpt.text.toLowerCase();
          if (txt.includes('đúng') || txt.includes('true') || txt.includes('yes')) {
            setTfCorrect('Đúng');
          } else {
            setTfCorrect('Sai');
          }
        } else {
          setTfCorrect('Đúng');
        }
      } 
      else if (detectedType === 'Matching') {
        const pairs = parsedOptions.map(opt => {
          const partRegex = /\s*([-➔➔>]+|:)\s*/;
          const parts = opt.text.split(partRegex);
          if (parts.length >= 2) {
            const rightPart = parts[parts.length - 1];
            const leftPart = opt.text.substring(0, opt.text.lastIndexOf(parts[parts.length - 2])).trim();
            return { left: leftPart || opt.text, right: rightPart };
          }
          return { left: opt.text, right: '' };
        });
        setMatchingPairs(pairs.length > 0 ? pairs : [{ left: '', right: '' }]);
      } 
      else if (detectedType === 'Sequence Ordering') {
        setSequenceList(parsedOptions.map(o => o.text));
      } 
      else if (detectedType === 'True/False Multiple') {
        const rows = parsedOptions.map(opt => {
          let cleanText = opt.text;
          let isCorrect = true;
          const lower = opt.text.toLowerCase();
          if (lower.endsWith('sai') || lower.endsWith('(sai)') || lower.includes(': sai') || lower.includes('- sai')) {
            isCorrect = false;
            cleanText = opt.text.replace(/[:\-\s]*\(?sai\)?$/i, '').trim();
          } else if (lower.endsWith('đúng') || lower.endsWith('(đúng)') || lower.includes(': đúng') || lower.includes('- đúng')) {
            isCorrect = true;
            cleanText = opt.text.replace(/[:\-\s]*\(?đúng\)?$/i, '').trim();
          } else if (lower.endsWith('false') || lower.endsWith('(false)')) {
            isCorrect = false;
            cleanText = opt.text.replace(/[:\-\s]*\(?false\)?$/i, '').trim();
          } else if (lower.endsWith('true') || lower.endsWith('(true)')) {
            isCorrect = true;
            cleanText = opt.text.replace(/[:\-\s]*\(?true\)?$/i, '').trim();
          }
          return { text: cleanText, correct: isCorrect };
        });
        setStmtRows(rows.length > 0 ? rows : [{ text: '', correct: true }]);
      } 
      else if (detectedType === 'Categorization') {
        const items: { name: string; category: string }[] = [];
        const categoriesSet = new Set<string>();
        parsedOptions.forEach(opt => {
          const parts = opt.text.split(/➔|->|:/);
          if (parts.length >= 2) {
            const name = parts[0].trim();
            const category = parts[parts.length - 1].trim();
            categoriesSet.add(category);
            items.push({ name, category });
          }
        });
        const categories = Array.from(categoriesSet);
        if (categories.length >= 2) {
          setCatCategories([categories[0], categories[1]]);
          setCatItems(items);
        } else {
          setCatCategories(['Thiết bị Nhập (Input)', 'Thiết bị Xuất (Output)']);
          setCatItems([{ name: '', category: 'Thiết bị Nhập (Input)' }]);
        }
      }

      setParseStatus(`Đã tự động phân tích câu hỏi dạng "${detectedType}"!`);
    } catch (err) {
      console.error(err);
      setParseStatus('Lỗi phân tích cú pháp câu hỏi.');
    }
  };

  const handleContentChange = (val: string) => {
    setQContent(val);
    
    // Auto-parse if the text contains a newline and structured cues
    const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const lowerVal = val.toLowerCase();
      const hasCorrectMarker = lowerVal.includes('(correct)');
      const hasOptionMarkers = lines.some(line => /^[a-fA-F0-9\-•][\.\)\s\-•]+\s*/.test(line));
      const hasTrueFalseWord = lines.some(line => {
        const lw = line.toLowerCase();
        return lw.endsWith('đúng') || lw.endsWith('sai') || lw.endsWith('true') || lw.endsWith('false');
      });
      
      if (hasCorrectMarker || hasOptionMarkers || hasTrueFalseWord) {
        handleAutoParse(val);
      }
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const { total: stTotal } = await DatabaseService.getStudents();
      const allExams = await DatabaseService.getExams();
      const { total: qTotalCount } = await DatabaseService.getQuestions();
      const scores = await DatabaseService.getScores();

      const totalCorrect = scores.reduce((acc, s) => acc + s.Correct, 0);
      const totalWrong = scores.reduce((acc, s) => acc + s.Wrong, 0);
      const totalAnswers = totalCorrect + totalWrong;
      const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
      const avgScoreVal = scores.length > 0 ? Math.round(scores.reduce((acc, s) => acc + s.Score, 0) / scores.length) : 0;

      setStats({
        totalStudents: stTotal,
        totalExams: allExams.length,
        totalQuestions: qTotalCount,
        totalSubmissions: scores.length,
        avgScore: avgScoreVal,
        accuracyRate: accuracy,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

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

  const loadExams = async () => {
    try {
      const allExams = await DatabaseService.getExams();
      setExams(allExams);
    } catch (e) {
      console.error(e);
    }
  };

  const loadQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const { questions: qs, total } = await DatabaseService.getQuestions({
        search: qSearch,
        level: qLevelFilter,
        examId: qExamFilter,
        type: qTypeFilter,
        limit: qLimit,
        offset: qOffset,
      });
      setQuestions(qs);
      setQTotal(total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Load Admin Data
  useEffect(() => {
    loadStats();
    loadStudents();
    loadExams();
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncTrigger, studentOffset, qOffset, studentSearch, qSearch, qLevelFilter, qExamFilter, qTypeFilter]);

  // ==========================================
  // STUDENT OPERATIONS
  // ==========================================

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
      loadStats();
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
      loadStats();
      onSyncComplete();
    }
    setActionLoading(false);
  };

  // ==========================================
  // EXAM SHEET OPERATIONS (CREATE, MOVE, COPY, DELETE)
  // ==========================================

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
      loadStats();
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
      loadQuestions();
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
      loadQuestions();
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
      loadQuestions();
      loadStats();
      onSyncComplete();
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
      loadQuestions();
      loadStats();
      onSyncComplete();
    }
    setActionLoading(false);
  };

  // ==========================================
  // QUESTIONS OPERATIONS & SPECIAL FORM BUILDER
  // ==========================================

  const handleOpenQModal = (q: Question | null = null) => {
    setParseStatus('');
    if (q) {
      setEditingQ(q);
      setQId(q.QuestionID);
      setQExamID(q.ExamID);
      setQLevel(q.Level);
      setQType(q.QuestionType);
      setQContent(q.QuestionContent);
      setQExplanation(q.Explanation);
      setQScore(q.Score);
      setQImageUrl(q.Image || '');
      setQVideoUrl(q.Video || '');

      const parsed: QuestionAnswers = JSON.parse(q.Answers);

      // Populate custom values depending on types
      if (q.QuestionType === 'Multiple Choice' || q.QuestionType === 'Video Based') {
        setMcOptions(parsed.options || ['', '', '', '']);
        setCorrectMcIndex(Number(q.CorrectAnswer));
      } else if (q.QuestionType === 'Multiple Response') {
        setMrOptions(parsed.options || ['', '', '', '']);
        setCorrectMrIndices(JSON.parse(q.CorrectAnswer));
      } else if (q.QuestionType === 'True / False') {
        setTfCorrect(q.CorrectAnswer as 'Đúng' | 'Sai');
      } else if (q.QuestionType === 'Matching') {
        const parsedPairs = Object.entries(JSON.parse(q.CorrectAnswer)).map(([l, r]) => ({
          left: l,
          right: r as string,
        }));
        setMatchingPairs(parsedPairs);
      } else if (q.QuestionType === 'Sequence Ordering') {
        setSequenceList(parsed.sequenceItems || ['', '', '']);
      } else if (q.QuestionType === 'True/False Multiple') {
        const correctArray: boolean[] = JSON.parse(q.CorrectAnswer);
        const states = (parsed.statements || []).map((stmt, idx) => ({
          text: stmt,
          correct: correctArray[idx],
        }));
        setStmtRows(states);
      } else if (q.QuestionType === 'Categorization') {
        setCatCategories(parsed.categories || ['', '']);
        const correctMap = JSON.parse(q.CorrectAnswer);
        const items = (parsed.categoryItems || []).map((item) => ({
          name: item,
          category: correctMap[item] || '',
        }));
        setCatItems(items);
      } else if (q.QuestionType === 'Hotspot') {
        const hList = (parsed.hotspots || []).map((h) => ({
          id: h.id,
          name: h.name,
          x: h.x,
          y: h.y,
          w: h.width ?? 15,
          h: h.height ?? 15,
        }));
        setHotspotsList(hList);
        setCorrectHotspotId(q.CorrectAnswer);
      } else if (q.QuestionType === 'Match Image To Text') {
        const correctArr: number[] = JSON.parse(q.CorrectAnswer);
        const pairs = (parsed.imageOptions || []).map((imgUrl, idx) => ({
          img: imgUrl,
          text: parsed.textTargets?.[correctArr[idx]] || '',
        }));
        setImgTextPairs(pairs);
      } else if (q.QuestionType === 'Matrix Selection') {
        setMatrixRows(parsed.matrixRows || []);
        setMatrixCols(parsed.matrixCols || []);
        setMatrixCorrect(JSON.parse(q.CorrectAnswer));
      }
    } else {
      setEditingQ(null);
      setQId(`Q${String(stats.totalQuestions + 1).padStart(3, '0')}`);
      setQExamID('OT1');
      setQLevel('LV1');
      setQType('Multiple Choice');
      setQContent('');
      setQExplanation('');
      setQScore(10);
      setQImageUrl('');
      setQVideoUrl('');

      // Clear custom states
      setMcOptions(['', '', '', '']);
      setCorrectMcIndex(0);
      setMrOptions(['', '', '', '']);
      setCorrectMrIndices([]);
      setTfCorrect('Đúng');
      setMatchingPairs([{ left: '', right: '' }]);
      setSequenceList(['', '', '']);
      setStmtRows([{ text: '', correct: true }]);
      setCatCategories(['Thiết bị Nhập (Input)', 'Thiết bị Xuất (Output)']);
      setCatItems([{ name: '', category: 'Thiết bị Nhập (Input)' }]);
      setHotspotsList([{ id: 'hotspot_1', name: 'Nút A', x: 10, y: 10, w: 20, h: 20 }]);
      setCorrectHotspotId('hotspot_1');
      setImgTextPairs([{ img: '', text: '' }]);
      setMatrixRows(['Row A', 'Row B']);
      setMatrixCols(['Col 1', 'Col 2']);
      setMatrixCorrect({});
    }
    setShowQModal(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qId || !qContent) return;

    setActionLoading(true);

    let finalAnswersObj: QuestionAnswers = {};
    let finalCorrectAnswerStr = '';

    // Generate dynamic Answers object based on 11 Types
    if (qType === 'Multiple Choice' || qType === 'Video Based') {
      finalAnswersObj = { options: mcOptions.filter(Boolean) };
      finalCorrectAnswerStr = String(correctMcIndex);
    } else if (qType === 'Multiple Response') {
      finalAnswersObj = { options: mrOptions.filter(Boolean) };
      finalCorrectAnswerStr = JSON.stringify(correctMrIndices);
    } else if (qType === 'True / False') {
      finalAnswersObj = { options: ['Đúng', 'Sai'] };
      finalCorrectAnswerStr = tfCorrect;
    } else if (qType === 'Matching') {
      const lefts = matchingPairs.map((p) => p.left).filter(Boolean);
      const rights = matchingPairs.map((p) => p.right).filter(Boolean);
      finalAnswersObj = { leftOptions: lefts, rightOptions: rights };

      const correctMap: Record<string, string> = {};
      matchingPairs.forEach((p) => {
        if (p.left && p.right) correctMap[p.left] = p.right;
      });
      finalCorrectAnswerStr = JSON.stringify(correctMap);
    } else if (qType === 'Sequence Ordering') {
      const list = sequenceList.filter(Boolean);
      finalAnswersObj = { sequenceItems: list };
      // By default order of sequence list is chronological, so [0, 1, 2...]
      finalCorrectAnswerStr = JSON.stringify(list.map((_, i) => i));
    } else if (qType === 'True/False Multiple') {
      const list = stmtRows.filter((r) => r.text);
      finalAnswersObj = { statements: list.map((r) => r.text) };
      finalCorrectAnswerStr = JSON.stringify(list.map((r) => r.correct));
    } else if (qType === 'Categorization') {
      const cats = catCategories.filter(Boolean);
      const items = catItems.map((it) => it.name).filter(Boolean);
      finalAnswersObj = { categories: cats, categoryItems: items };

      const correctMap: Record<string, string> = {};
      catItems.forEach((it) => {
        if (it.name && it.category) correctMap[it.name] = it.category;
      });
      finalCorrectAnswerStr = JSON.stringify(correctMap);
    } else if (qType === 'Hotspot') {
      const hList = hotspotsList.map((h) => ({
        id: h.id,
        name: h.name,
        x: h.x,
        y: h.y,
        width: h.w,
        height: h.h,
      }));
      finalAnswersObj = { hotspots: hList };
      finalCorrectAnswerStr = correctHotspotId;
    } else if (qType === 'Match Image To Text') {
      const imgs = imgTextPairs.map((p) => p.img).filter(Boolean);
      const txts = imgTextPairs.map((p) => p.text).filter(Boolean);
      finalAnswersObj = { imageOptions: imgs, textTargets: txts };
      // Map index-to-index
      finalCorrectAnswerStr = JSON.stringify(imgs.map((_, i) => i));
    } else if (qType === 'Matrix Selection') {
      finalAnswersObj = { matrixRows, matrixCols };
      finalCorrectAnswerStr = JSON.stringify(matrixCorrect);
    }

    const newQ: Question = {
      QuestionID: qId.trim().toUpperCase(),
      ExamID: qExamID.trim().toUpperCase(),
      Level: qLevel,
      QuestionType: qType,
      QuestionContent: qContent.trim(),
      Answers: JSON.stringify(finalAnswersObj),
      CorrectAnswer: finalCorrectAnswerStr,
      Explanation: qExplanation.trim(),
      Image: qImageUrl.trim() || undefined,
      Video: qVideoUrl.trim() || undefined,
      Score: Number(qScore),
      CreatedAt: editingQ ? editingQ.CreatedAt : new Date().toISOString(),
    };

    const success = await DatabaseService.saveQuestion(newQ);
    if (success) {
      setShowQModal(false);
      loadQuestions();
      loadStats();
      onSyncComplete();
    }
    setActionLoading(false);
  };

  const handleDeleteQ = async (id: string) => {
    if (!confirm(`Bạn có chắc muốn xóa câu hỏi ${id} khỏi hệ thống không?`)) return;
    setActionLoading(true);
    const success = await DatabaseService.deleteQuestion(id);
    if (success) {
      loadQuestions();
      loadStats();
      onSyncComplete();
    }
    setActionLoading(false);
  };

  return (
    <div id="admin-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">Quản trị Hệ thống IC3 GS6</h2>
          <p className="text-xs text-slate-400 font-bold">Quản lý đồng bộ hai chiều tuyệt đối, chỉnh sửa học sinh, đề ôn tập và ngân hàng câu hỏi</p>
        </div>

        <button
          onClick={onOpenSettings}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-extrabold rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
        >
          <Settings className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} /> Cấu hình Sheets URL
        </button>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex flex-wrap border-b border-slate-200 gap-2 font-bold text-xs">
        {[
          { id: 'stats', label: 'Báo cáo & Thống kê', icon: Activity },
          { id: 'students', label: 'Quản lý Học sinh', icon: Users },
          { id: 'exams', label: 'Quản lý Đề ôn tập', icon: BookOpen },
          { id: 'questions', label: 'Ngân hàng Câu hỏi', icon: HelpCircle },
          { id: 'sync', label: 'Cài đặt kết nối Sheets', icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-3 border-b-2 font-bold cursor-pointer transition ${
                isSelected ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: REPORT & STATISTICS */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-slate-50 border border-slate-100 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-white border border-blue-50 p-5 rounded-2xl shadow-sm text-center">
                <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng Học Sinh</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalStudents}</p>
              </div>

              <div className="bg-white border border-blue-50 p-5 rounded-2xl shadow-sm text-center">
                <BookOpen className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng Đề Thi</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalExams}</p>
              </div>

              <div className="bg-white border border-blue-50 p-5 rounded-2xl shadow-sm text-center">
                <HelpCircle className="w-6 h-6 text-teal-500 mx-auto mb-2" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng Câu Hỏi</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalQuestions}</p>
              </div>

              <div className="bg-white border border-blue-50 p-5 rounded-2xl shadow-sm text-center">
                <Activity className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Lượt làm bài</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalSubmissions}</p>
              </div>

              <div className="bg-white border border-blue-50 p-5 rounded-2xl shadow-sm text-center">
                <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Điểm TB</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{stats.avgScore}%</p>
              </div>

              <div className="bg-white border border-blue-50 p-5 rounded-2xl shadow-sm text-center col-span-2 md:col-span-1">
                <Check className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Tỷ lệ đúng</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{stats.accuracyRate}%</p>
              </div>
            </div>
          )}

          {/* Guidelines on Sync */}
          <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl">
            <h3 className="text-sm font-extrabold text-slate-700 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Đồng bộ hai chiều là gì?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-2 font-medium">
              Hệ thống này được thiết kế để đồng bộ hóa hoàn hảo với Google Sheets. Khi bạn thêm/sửa/xóa một câu hỏi, học sinh hay đề thi trên website, các thao tác này sẽ tự động gọi Google Apps Script API để cập nhật trực tiếp dòng tương ứng trên Google Sheets. Ngược lại, nếu bạn thao tác trực tiếp trên Google Sheets (như thêm thủ công một học sinh, dán hàng loạt câu hỏi, thêm/xóa sheet đề thi dạng LV1_OT4), chỉ cần nhấn biểu tượng đồng bộ ở góc trên cùng bên phải màn hình để tải toàn bộ thông tin mới về website.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS MANAGEMENT */}
      {activeTab === 'students' && (
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
        </div>
      )}

      {/* TAB 3: EXAM & SHEET LEVEL OPERATIONS */}
      {activeTab === 'exams' && (
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
                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow self-end cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Tạo đề thi mới
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
                    <p className="text-xs text-slate-400 font-bold">Số lượng câu hỏi đã gán: {exam.QuestionIDs.length} câu</p>
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs font-bold">
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
                      onClick={() => handleDeleteExam(exam.Level, exam.ExamID)}
                      className="py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 transition cursor-pointer text-center"
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
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Xác nhận đổi tên
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
                    className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Bắt đầu sao chép (Clone câu hỏi & Tạo Sheet mới)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: QUESTIONS DATABASE MANAGER */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Filters & Add new button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 flex-1">
              {/* Search text */}
              <div className="relative min-w-[180px] flex-1 max-w-xs">
                <input
                  type="text"
                  placeholder="Tìm câu hỏi theo nội dung..."
                  value={qSearch}
                  onChange={(e) => {
                    setQSearch(e.target.value);
                    setQOffset(0);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* Filter Level */}
              <select
                value={qLevelFilter}
                onChange={(e) => {
                  setQLevelFilter(e.target.value);
                  setQOffset(0);
                }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-500"
              >
                <option value="">Tất cả Level</option>
                <option value="LV1">LV1</option>
                <option value="LV2">LV2</option>
                <option value="LV3">LV3</option>
              </select>

              {/* Filter Exam */}
              <select
                value={qExamFilter}
                onChange={(e) => {
                  setQExamFilter(e.target.value);
                  setQOffset(0);
                }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-500"
              >
                <option value="">Tất cả Đề</option>
                <option value="OT1">OT1</option>
                <option value="OT2">OT2</option>
                <option value="OT3">OT3</option>
              </select>

              {/* Filter Type */}
              <select
                value={qTypeFilter}
                onChange={(e) => {
                  setQTypeFilter(e.target.value);
                  setQOffset(0);
                }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-500"
              >
                <option value="">Tất cả Dạng câu hỏi</option>
                <option value="Multiple Choice">Multiple Choice</option>
                <option value="Multiple Response">Multiple Response</option>
                <option value="True / False">True / False</option>
                <option value="Matching">Matching</option>
                <option value="Sequence Ordering">Sequence Ordering</option>
                <option value="True/False Multiple">True/False Multiple</option>
                <option value="Video Based">Video Based</option>
                <option value="Categorization">Categorization</option>
                <option value="Hotspot">Hotspot</option>
                <option value="Match Image To Text">Match Image To Text</option>
                <option value="Matrix Selection">Matrix Selection</option>
              </select>
            </div>

            <button
              onClick={() => handleOpenQModal()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer self-start md:self-auto shadow"
            >
              <Plus className="w-4 h-4" /> Thêm câu hỏi mới
            </button>
          </div>

          {/* List display */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                    <th className="p-4 w-20">Mã câu hỏi</th>
                    <th className="p-4 w-20">Cấp độ & Đề</th>
                    <th className="p-4">Dạng Câu Hỏi</th>
                    <th className="p-4 max-w-sm">Nội dung câu hỏi</th>
                    <th className="p-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loadingQuestions ? (
                    [1, 2, 3].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="p-4 h-12 bg-slate-50" />
                      </tr>
                    ))
                  ) : questions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Không tìm thấy câu hỏi nào thỏa mãn bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    questions.map((q) => (
                      <tr key={q.QuestionID} className="hover:bg-slate-50/50">
                        <td className="p-4 font-black text-slate-700">{q.QuestionID}</td>
                        <td className="p-4">
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-black mr-1">
                            {q.Level}
                          </span>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black">
                            {q.ExamID}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded text-[9px] font-black uppercase">
                            {q.QuestionType}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs truncate font-semibold text-slate-800" title={q.QuestionContent}>
                          {q.QuestionContent}
                        </td>
                        <td className="p-4 space-x-1.5">
                          <button
                            onClick={() => handleOpenQModal(q)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition cursor-pointer inline-block"
                            title="Sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQ(q.QuestionID)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer inline-block"
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
            {qTotal > qLimit && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-bold">
                  Hiển thị {qOffset + 1} - {Math.min(qOffset + qLimit, qTotal)} trong {qTotal} câu hỏi
                </span>

                <div className="flex gap-2">
                  <button
                    disabled={qOffset === 0}
                    onClick={() => setQOffset((prev) => Math.max(0, prev - qLimit))}
                    className="p-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={qOffset + qLimit >= qTotal}
                    onClick={() => setQOffset((prev) => prev + qLimit)}
                    className="p-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DATABASE & SYNC STATUS */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          <AppsScriptGuide onUrlSaved={onSyncComplete} />
        </div>
      )}

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

      {/* ========================================================
          QUESTION FORM MODAL (COMPLEX SPECIAL MULTI-FORM)
         ======================================================== */}
      {showQModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-3xl shadow-xl border border-slate-100 my-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowQModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base sm:text-lg font-black text-slate-800 mb-6">
              {editingQ ? `Sửa câu hỏi ${qId}` : 'Thêm câu hỏi mới vào Ngân hàng'}
            </h3>

            <form onSubmit={handleSaveQuestion} className="space-y-5 text-xs font-bold text-slate-500">
              {/* Question metadata row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block mb-1.5 text-[10px] text-slate-400">MÃ CÂU HỎI</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingQ}
                    value={qId}
                    onChange={(e) => setQId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none text-slate-700 bg-slate-100 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-[10px] text-slate-400">CHỌN LEVEL</label>
                  <select
                    value={qLevel}
                    onChange={(e) => setQLevel(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700"
                  >
                    <option value="LV1">LV1</option>
                    <option value="LV2">LV2</option>
                    <option value="LV3">LV3</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 text-[10px] text-slate-400">ĐỀ THI (EXAMID)</label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: OT1"
                    value={qExamID}
                    onChange={(e) => setQExamID(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 uppercase"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-[10px] text-slate-400">ĐIỂM SỐ</label>
                  <input
                    type="number"
                    required
                    value={qScore}
                    onChange={(e) => setQScore(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700"
                  />
                </div>
              </div>

              {/* Question type selector */}
              <div>
                <label className="block mb-1.5 text-[10px] text-slate-400">DẠNG CÂU HỎI (QUYẾT ĐỊNH FORM BÊN DƯỚI)</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as IC3QuestionType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-blue-600 font-extrabold"
                >
                  <option value="Multiple Choice">Multiple Choice</option>
                  <option value="Multiple Response">Multiple Response</option>
                  <option value="True / False">True / False</option>
                  <option value="Matching">Matching</option>
                  <option value="Sequence Ordering">Sequence Ordering</option>
                  <option value="True/False Multiple">True/False Multiple</option>
                  <option value="Video Based">Video Based</option>
                  <option value="Categorization">Categorization</option>
                  <option value="Hotspot">Hotspot</option>
                  <option value="Match Image To Text">Match Image To Text</option>
                  <option value="Matrix Selection">Matrix Selection</option>
                </select>
              </div>

              {/* Question Content */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] text-slate-400 uppercase font-black">
                    NỘI DUNG CÂU HỎI & CHỌN ĐÁP ÁN NHANH (Auto Parser)
                  </label>
                  {parseStatus && (
                    <span className="text-[10px] text-emerald-600 font-black animate-pulse bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      ✨ {parseStatus}
                    </span>
                  )}
                </div>
                <textarea
                  required
                  rows={5}
                  placeholder="Dán trực tiếp toàn bộ câu hỏi và đáp án kèm dấu (Correct) để tự động điền form nhanh chóng...&#10;Ví dụ:&#10;Bạn cần lưu danh sách trang web...&#10;a. Duyệt đa trang một lúc&#10;b. Lịch sử hoặc dòng thời gian&#10;c. Mục yêu thích hoặc dấu trang (Correct)&#10;d. Hộp địa chỉ"
                  value={qContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none text-slate-700 bg-slate-50/50 leading-relaxed font-semibold placeholder:text-slate-400 text-xs"
                />
              </div>

              {/* Media Attachments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-[10px] text-slate-400">ẢNH MINH HỌA (URL)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={qImageUrl}
                    onChange={(e) => setQImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 bg-white"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-[10px] text-slate-400">VIDEO MINH HỌA (URL)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={qVideoUrl}
                    onChange={(e) => setQVideoUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 bg-white"
                  />
                </div>
              </div>

              {/* ========================================================
                  DYNAMIC RENDER OPTION FIELDS DEPENDING ON SELECTION TYPE
                 ======================================================== */}
              <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-2xl space-y-4">
                <h4 className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Cấu hình câu trả lời đặc thù</h4>

                {/* 1. Multiple Choice / 7. Video Based */}
                {(qType === 'Multiple Choice' || qType === 'Video Based') && (
                  <div className="space-y-2.5">
                    {mcOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">PA {idx + 1}</span>
                        <input
                          type="text"
                          required
                          placeholder={`Phương án lựa chọn ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const arr = [...mcOptions];
                            arr[idx] = e.target.value;
                            setMcOptions(arr);
                          }}
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setCorrectMcIndex(idx)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-extrabold transition cursor-pointer ${
                            correctMcIndex === idx
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          ĐÚNG
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Multiple Response */}
                {qType === 'Multiple Response' && (
                  <div className="space-y-2.5">
                    {mrOptions.map((opt, idx) => {
                      const isChecked = correctMrIndices.includes(idx);
                      const toggleCheck = () => {
                        if (isChecked) {
                          setCorrectMrIndices(correctMrIndices.filter((i) => i !== idx));
                        } else {
                          setCorrectMrIndices([...correctMrIndices, idx]);
                        }
                      };

                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">PA {idx + 1}</span>
                          <input
                            type="text"
                            required
                            placeholder={`Phương án lựa chọn ${idx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const arr = [...mrOptions];
                              arr[idx] = e.target.value;
                              setMrOptions(arr);
                            }}
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
                          />
                          <button
                            type="button"
                            onClick={toggleCheck}
                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-extrabold transition cursor-pointer ${
                              isChecked
                                ? 'bg-indigo-500 border-indigo-500 text-white'
                                : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            ĐÚNG
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. True / False */}
                {qType === 'True / False' && (
                  <div className="flex gap-4">
                    {(['Đúng', 'Sai'] as const).map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setTfCorrect(label)}
                        className={`flex-1 py-3 border rounded-xl font-black text-xs transition cursor-pointer ${
                          tfCorrect === label
                            ? label === 'Đúng'
                              ? 'bg-green-500 border-green-500 text-white shadow-sm'
                              : 'bg-red-500 border-red-500 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* 4. Matching */}
                {qType === 'Matching' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase">Danh sách cặp nối</span>
                      <button
                        type="button"
                        onClick={() => setMatchingPairs([...matchingPairs, { left: '', right: '' }])}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-[10px]"
                      >
                        Thêm cặp nối +
                      </button>
                    </div>

                    <div className="space-y-2">
                      {matchingPairs.map((pair, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            required
                            placeholder="Mục bên trái"
                            value={pair.left}
                            onChange={(e) => {
                              const arr = [...matchingPairs];
                              arr[idx].left = e.target.value;
                              setMatchingPairs(arr);
                            }}
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
                          />
                          <span className="text-slate-400">➔</span>
                          <input
                            type="text"
                            required
                            placeholder="Mô tả ghép đúng bên phải"
                            value={pair.right}
                            onChange={(e) => {
                              const arr = [...matchingPairs];
                              arr[idx].right = e.target.value;
                              setMatchingPairs(arr);
                            }}
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
                          />
                          {matchingPairs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setMatchingPairs(matchingPairs.filter((_, i) => i !== idx))}
                              className="text-red-500 text-[10px]"
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Sequence Ordering */}
                {qType === 'Sequence Ordering' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase">Thứ tự đúng từ trên xuống</span>
                      <button
                        type="button"
                        onClick={() => setSequenceList([...sequenceList, ''])}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-[10px]"
                      >
                        Thêm bước +
                      </button>
                    </div>

                    <div className="space-y-2">
                      {sequenceList.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <span className="w-5 h-5 bg-blue-500 text-white rounded flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            required
                            placeholder={`Mô tả bước thứ ${idx + 1}`}
                            value={item}
                            onChange={(e) => {
                              const arr = [...sequenceList];
                              arr[idx] = e.target.value;
                              setSequenceList(arr);
                            }}
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
                          />
                          {sequenceList.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setSequenceList(sequenceList.filter((_, i) => i !== idx))}
                              className="text-red-500 text-[10px]"
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. True/False Multiple */}
                {qType === 'True/False Multiple' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase">Các phát biểu</span>
                      <button
                        type="button"
                        onClick={() => setStmtRows([...stmtRows, { text: '', correct: true }])}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-[10px]"
                      >
                        Thêm phát biểu +
                      </button>
                    </div>

                    <div className="space-y-2">
                      {stmtRows.map((row, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            required
                            placeholder="Nội dung phát biểu..."
                            value={row.text}
                            onChange={(e) => {
                              const arr = [...stmtRows];
                              arr[idx].text = e.target.value;
                              setStmtRows(arr);
                            }}
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const arr = [...stmtRows];
                              arr[idx].correct = !arr[idx].correct;
                              setStmtRows(arr);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                              row.correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                            }`}
                          >
                            {row.correct ? 'ĐÚNG' : 'SAI'}
                          </button>
                          {stmtRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setStmtRows(stmtRows.filter((_, i) => i !== idx))}
                              className="text-red-500 text-[10px]"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. Categorization */}
                {qType === 'Categorization' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1 text-[10px] text-slate-400 uppercase">Nhóm 1</label>
                        <input
                          type="text"
                          required
                          value={catCategories[0] || ''}
                          onChange={(e) => {
                            const arr = [...catCategories];
                            arr[0] = e.target.value;
                            setCatCategories(arr);
                          }}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[10px] text-slate-400 uppercase">Nhóm 2</label>
                        <input
                          type="text"
                          required
                          value={catCategories[1] || ''}
                          onChange={(e) => {
                            const arr = [...catCategories];
                            arr[1] = e.target.value;
                            setCatCategories(arr);
                          }}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 uppercase">Mục cần phân loại</span>
                        <button
                          type="button"
                          onClick={() => setCatItems([...catItems, { name: '', category: catCategories[0] }])}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-[10px]"
                        >
                          Thêm mục phân loại +
                        </button>
                      </div>

                      <div className="space-y-2">
                        {catItems.map((it, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              required
                              placeholder="Mục (ví dụ: Chuột máy tính)"
                              value={it.name}
                              onChange={(e) => {
                                const arr = [...catItems];
                                arr[idx].name = e.target.value;
                                setCatItems(arr);
                              }}
                              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
                            />
                            <select
                              value={it.category}
                              onChange={(e) => {
                                const arr = [...catItems];
                                arr[idx].category = e.target.value;
                                setCatItems(arr);
                              }}
                              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600"
                            >
                              {catCategories.filter(Boolean).map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                            {catItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setCatItems(catItems.filter((_, i) => i !== idx))}
                                className="text-red-500 text-[10px]"
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 9. Hotspot */}
                {qType === 'Hotspot' && (
                  <div className="space-y-4">
                    {/* Visual Preview Section */}
                    {qImageUrl ? (
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">
                            TRỰC QUAN SƠ ĐỒ & VÙNG CHỌN (Click để định vị nhanh)
                          </span>
                          <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold">
                            Đang chọn: {correctHotspotId || 'Chưa chọn'}
                          </span>
                        </div>

                        <div 
                          className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-950 select-none max-w-xl mx-auto shadow-inner"
                          onPointerDown={(e) => {
                            // Only start drawing if clicking on the wrapper itself or on the image (not on existing spots or resize handles)
                            if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName !== 'IMG') {
                              return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const startXPct = ((e.clientX - rect.left) / rect.width) * 100;
                            const startYPct = ((e.clientY - rect.top) / rect.height) * 100;

                            setDrawingRect({
                              startX: startXPct,
                              startY: startYPct,
                              x: startXPct,
                              y: startYPct,
                              w: 0,
                              h: 0,
                            });
                            
                            e.currentTarget.setPointerCapture(e.pointerId);
                          }}
                          onPointerMove={(e) => {
                            if (drawingRect) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const currXPct = ((e.clientX - rect.left) / rect.width) * 100;
                              const currYPct = ((e.clientY - rect.top) / rect.height) * 100;

                              const x1 = Math.max(0, Math.min(100, Math.min(drawingRect.startX, currXPct)));
                              const y1 = Math.max(0, Math.min(100, Math.min(drawingRect.startY, currYPct)));
                              const x2 = Math.max(0, Math.min(100, Math.max(drawingRect.startX, currXPct)));
                              const y2 = Math.max(0, Math.min(100, Math.max(drawingRect.startY, currYPct)));

                              setDrawingRect({
                                startX: drawingRect.startX,
                                startY: drawingRect.startY,
                                x: x1,
                                y: y1,
                                w: x2 - x1,
                                h: y2 - y1,
                              });
                            }
                          }}
                          onPointerUp={(e) => {
                            if (drawingRect) {
                              e.currentTarget.releasePointerCapture(e.pointerId);
                              
                              // If drag width & height are tiny, treat it as a click to center the active hotspot
                              if (drawingRect.w <= 1.5 && drawingRect.h <= 1.5) {
                                if (hotspotsList.length > 0) {
                                  const activeIdx = hotspotsList.findIndex(h => h.id === correctHotspotId);
                                  const targetIdx = activeIdx !== -1 ? activeIdx : 0;
                                  const arr = [...hotspotsList];
                                  const spot = arr[targetIdx];
                                  const newX = Math.round(drawingRect.x - spot.w / 2);
                                  const newY = Math.round(drawingRect.y - spot.h / 2);
                                  spot.x = Math.max(0, Math.min(100 - spot.w, newX));
                                  spot.y = Math.max(0, Math.min(100 - spot.h, newY));
                                  setHotspotsList(arr);
                                }
                              } else {
                                // Create a new hotspot with these coordinates!
                                const nextNum = hotspotsList.length + 1;
                                const nextId = `hotspot_${Date.now()}`;
                                const nameLetters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
                                const nextLetter = nameLetters[nextNum - 1] || `${nextNum}`;
                                const newSpot = {
                                  id: nextId,
                                  name: `Vùng ${nextLetter}`,
                                  x: Math.round(drawingRect.x),
                                  y: Math.round(drawingRect.y),
                                  w: Math.round(drawingRect.w),
                                  h: Math.round(drawingRect.h),
                                };
                                setHotspotsList([...hotspotsList, newSpot]);
                                setCorrectHotspotId(nextId);
                              }
                              setDrawingRect(null);
                            }
                          }}
                        >
                          <img
                            src={qImageUrl}
                            alt="Hotspot positioning preview"
                            className="w-full h-auto opacity-90 max-h-[350px] object-contain cursor-crosshair pointer-events-none"
                          />

                          {/* Render hotspots as absolute overlays */}
                          {hotspotsList.map((spot, sIdx) => {
                            const isCorrect = correctHotspotId === spot.id;
                            const isDragging = draggingSpot && draggingSpot.id === spot.id;
                            return (
                              <div
                                key={spot.id || sIdx}
                                onClick={(e) => {
                                  e.stopPropagation(); // prevent clicking background image
                                  setCorrectHotspotId(spot.id);
                                }}
                                onPointerDown={(e) => {
                                  const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                                  if (!rect) return;
                                  
                                  setDraggingSpot({
                                    id: spot.id,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    startSpotX: spot.x,
                                    startSpotY: spot.y,
                                    containerWidth: rect.width,
                                    containerHeight: rect.height,
                                  });
                                  
                                  setCorrectHotspotId(spot.id);
                                  e.currentTarget.setPointerCapture(e.pointerId);
                                  e.stopPropagation();
                                }}
                                onPointerMove={(e) => {
                                  if (draggingSpot && draggingSpot.id === spot.id) {
                                    const deltaX = e.clientX - draggingSpot.startX;
                                    const deltaY = e.clientY - draggingSpot.startY;
                                    
                                    const deltaXPct = (deltaX / draggingSpot.containerWidth) * 100;
                                    const deltaYPct = (deltaY / draggingSpot.containerHeight) * 100;
                                    
                                    const newX = Math.round(draggingSpot.startSpotX + deltaXPct);
                                    const newY = Math.round(draggingSpot.startSpotY + deltaYPct);
                                    
                                    const boundedX = Math.max(0, Math.min(100 - spot.w, newX));
                                    const boundedY = Math.max(0, Math.min(100 - spot.h, newY));
                                    
                                    const arr = [...hotspotsList];
                                    const idx = arr.findIndex(h => h.id === spot.id);
                                    if (idx !== -1) {
                                      arr[idx].x = boundedX;
                                      arr[idx].y = boundedY;
                                      setHotspotsList(arr);
                                    }
                                  }
                                }}
                                onPointerUp={(e) => {
                                  if (draggingSpot && draggingSpot.id === spot.id) {
                                    e.currentTarget.releasePointerCapture(e.pointerId);
                                    setDraggingSpot(null);
                                  }
                                }}
                                className={`absolute border-2 cursor-move flex items-center justify-center select-none ${
                                  isCorrect
                                    ? 'bg-emerald-500/25 border-emerald-500 ring-4 ring-emerald-300/30'
                                    : 'bg-blue-500/15 border-blue-400 hover:bg-blue-500/30'
                                } ${isDragging ? 'z-50 border-dashed border-yellow-400' : 'transition-all duration-150'}`}
                                style={{
                                  left: `${spot.x}%`,
                                  top: `${spot.y}%`,
                                  width: `${spot.w}%`,
                                  height: `${spot.h}%`,
                                  transform: 'translate(0, 0)', // ensure coordinates start from top-left of area
                                  touchAction: 'none', // prevents scrolling while dragging on touch devices
                                }}
                                title={`${spot.name || spot.id} (Nhấn giữ chuột để kéo thả di chuyển vùng)`}
                              >
                                <span className="bg-slate-900/80 text-white font-extrabold px-1.5 py-0.5 rounded text-[8px] truncate max-w-[90%] scale-90 shadow-sm pointer-events-none">
                                  {spot.name || spot.id}
                                </span>

                                {/* 8 resize handles for the currently selected hotspot */}
                                {isCorrect && (
                                  <>
                                    {[
                                      { handle: 'tl', cursor: 'nwse-resize', class: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2' },
                                      { handle: 'tc', cursor: 'ns-resize', class: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2' },
                                      { handle: 'tr', cursor: 'nesw-resize', class: 'right-0 top-0 translate-x-1/2 -translate-y-1/2' },
                                      { handle: 'mr', cursor: 'ew-resize', class: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2' },
                                      { handle: 'br', cursor: 'nwse-resize', class: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2' },
                                      { handle: 'bc', cursor: 'ns-resize', class: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2' },
                                      { handle: 'bl', cursor: 'nesw-resize', class: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2' },
                                      { handle: 'ml', cursor: 'ew-resize', class: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2' },
                                    ].map((hSpec) => (
                                      <div
                                        key={hSpec.handle}
                                        onPointerDown={(e) => {
                                          const rect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                                          if (!rect) return;
                                          
                                          setResizingSpot({
                                            id: spot.id,
                                            handle: hSpec.handle,
                                            startX: e.clientX,
                                            startY: e.clientY,
                                            startSpotX: spot.x,
                                            startSpotY: spot.y,
                                            startSpotW: spot.w,
                                            startSpotH: spot.h,
                                            containerWidth: rect.width,
                                            containerHeight: rect.height,
                                          });
                                          
                                          e.currentTarget.setPointerCapture(e.pointerId);
                                          e.stopPropagation();
                                        }}
                                        onPointerMove={(e) => {
                                          if (resizingSpot && resizingSpot.id === spot.id && resizingSpot.handle === hSpec.handle) {
                                            const deltaX = e.clientX - resizingSpot.startX;
                                            const deltaY = e.clientY - resizingSpot.startY;
                                            
                                            const deltaXPct = (deltaX / resizingSpot.containerWidth) * 100;
                                            const deltaYPct = (deltaY / resizingSpot.containerHeight) * 100;
                                            
                                            let newX = resizingSpot.startSpotX;
                                            let newY = resizingSpot.startSpotY;
                                            let newW = resizingSpot.startSpotW;
                                            let newH = resizingSpot.startSpotH;
                                            
                                            const handle = resizingSpot.handle;
                                            
                                            // Adjust coordinates based on which handle is being dragged
                                            if (handle.includes('l')) {
                                              // drag left: adjusts x and w
                                              const prospectiveX = resizingSpot.startSpotX + deltaXPct;
                                              const prospectiveW = resizingSpot.startSpotW - deltaXPct;
                                              if (prospectiveW >= 2) {
                                                newX = Math.max(0, Math.min(100, prospectiveX));
                                                newW = prospectiveW;
                                              }
                                            }
                                            if (handle.includes('r')) {
                                              // drag right: adjusts w only
                                              const prospectiveW = resizingSpot.startSpotW + deltaXPct;
                                              if (prospectiveW >= 2) {
                                                newW = Math.min(100 - resizingSpot.startSpotX, prospectiveW);
                                              }
                                            }
                                            if (handle.includes('t')) {
                                              // drag top: adjusts y and h
                                              const prospectiveY = resizingSpot.startSpotY + deltaYPct;
                                              const prospectiveH = resizingSpot.startSpotH - deltaYPct;
                                              if (prospectiveH >= 2) {
                                                newY = Math.max(0, Math.min(100, prospectiveY));
                                                newH = prospectiveH;
                                              }
                                            }
                                            if (handle.includes('b')) {
                                              // drag bottom: adjusts h only
                                              const prospectiveH = resizingSpot.startSpotH + deltaYPct;
                                              if (prospectiveH >= 2) {
                                                newH = Math.min(100 - resizingSpot.startSpotY, prospectiveH);
                                              }
                                            }
                                            
                                            const arr = [...hotspotsList];
                                            const idx = arr.findIndex(h => h.id === spot.id);
                                            if (idx !== -1) {
                                              arr[idx].x = Math.round(newX);
                                              arr[idx].y = Math.round(newY);
                                              arr[idx].w = Math.round(newW);
                                              arr[idx].h = Math.round(newH);
                                              setHotspotsList(arr);
                                            }
                                          }
                                        }}
                                        onPointerUp={(e) => {
                                          if (resizingSpot && resizingSpot.id === spot.id && resizingSpot.handle === hSpec.handle) {
                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                            setResizingSpot(null);
                                          }
                                        }}
                                        className={`absolute w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm shadow-md ${hSpec.class} z-30`}
                                        style={{
                                          cursor: hSpec.cursor,
                                          touchAction: 'none',
                                        }}
                                      />
                                    ))}
                                  </>
                                )}
                              </div>
                            );
                          })}

                          {/* Drawing Rect Preview */}
                          {drawingRect && (
                            <div
                              className="absolute border-2 border-dashed border-indigo-500 bg-indigo-500/20 pointer-events-none z-40"
                              style={{
                                left: `${drawingRect.x}%`,
                                top: `${drawingRect.y}%`,
                                width: `${drawingRect.w}%`,
                                height: `${drawingRect.h}%`,
                              }}
                            />
                          )}
                        </div>
                        <div className="bg-blue-50/80 text-blue-700 p-2.5 rounded-xl text-[9px] leading-normal font-medium">
                          💡 <strong>Hướng dẫn:</strong> 
                          <ul className="list-disc pl-4 mt-1 space-y-0.5">
                            <li>Click vào một vùng trên ảnh để chọn vùng đó làm câu trả lời <strong>ĐÚNG</strong>.</li>
                            <li><strong>Kéo và thả (Drag & Drop):</strong> Nhấn giữ chuột vào hộp màu và kéo để di chuyển vị trí của vùng trực quan trên hình ảnh.</li>
                            <li>Click vào điểm bất kỳ trên ảnh nền để <strong>di chuyển nhanh tâm</strong> của vùng đang chọn sang vị trí đó.</li>
                            <li>Điều chỉnh kích thước (Rộng/Cao) của từng vùng bằng các ô số bên dưới.</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-[10px] font-bold text-center">
                        ⚠️ Chưa nhập <strong>ẢNH MINH HỌA (URL)</strong> ở phía trên. Vui lòng nhập link ảnh trước để xem trước sơ đồ hotspot và cấu hình vùng chọn trực quan!
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Danh sách vùng chọn (tọa độ %)</span>
                      <button
                        type="button"
                        onClick={() =>
                          setHotspotsList([
                            ...hotspotsList,
                            { id: `hotspot_${hotspotsList.length + 1}`, name: '', x: 20, y: 20, w: 15, h: 15 },
                          ])
                        }
                        className="px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold cursor-pointer transition"
                      >
                        Thêm vùng chọn +
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {hotspotsList.map((spot, idx) => (
                        <div key={idx} className="bg-white p-3 border border-slate-200 rounded-xl space-y-2 text-[10px]">
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              required
                              placeholder="Mã vùng (id)"
                              value={spot.id}
                              onChange={(e) => {
                                const arr = [...hotspotsList];
                                arr[idx].id = e.target.value;
                                setHotspotsList(arr);
                              }}
                              className="w-24 px-2 py-1 border border-slate-200 rounded text-slate-700 bg-slate-50 font-bold"
                            />
                            <input
                              type="text"
                              required
                              placeholder="Tên nhãn mô tả vùng"
                              value={spot.name}
                              onChange={(e) => {
                                const arr = [...hotspotsList];
                                arr[idx].name = e.target.value;
                                setHotspotsList(arr);
                              }}
                              className="flex-1 px-2 py-1 border border-slate-200 rounded text-slate-700"
                            />
                            <button
                              type="button"
                              onClick={() => setCorrectHotspotId(spot.id)}
                              className={`px-2 py-1 rounded text-[9px] font-black transition cursor-pointer ${
                                correctHotspotId === spot.id ? 'bg-green-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              ĐÚNG
                            </button>
                            {hotspotsList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setHotspotsList(hotspotsList.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                Xóa
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-slate-400 font-bold">
                            <div>
                              <span>X (%):</span>
                              <input
                                type="number"
                                required
                                min={0}
                                max={100}
                                value={spot.x}
                                onChange={(e) => {
                                  const arr = [...hotspotsList];
                                  arr[idx].x = Number(e.target.value);
                                  setHotspotsList(arr);
                                }}
                                className="w-full px-1 py-0.5 border border-slate-200 rounded text-slate-700 mt-0.5"
                              />
                            </div>
                            <div>
                              <span>Y (%):</span>
                              <input
                                type="number"
                                required
                                min={0}
                                max={100}
                                value={spot.y}
                                onChange={(e) => {
                                  const arr = [...hotspotsList];
                                  arr[idx].y = Number(e.target.value);
                                  setHotspotsList(arr);
                                }}
                                className="w-full px-1 py-0.5 border border-slate-200 rounded text-slate-700 mt-0.5"
                              />
                            </div>
                            <div>
                              <span>Rộng (%):</span>
                              <input
                                type="number"
                                required
                                min={1}
                                max={100}
                                value={spot.w}
                                onChange={(e) => {
                                  const arr = [...hotspotsList];
                                  arr[idx].w = Number(e.target.value);
                                  setHotspotsList(arr);
                                }}
                                className="w-full px-1 py-0.5 border border-slate-200 rounded text-slate-700 mt-0.5"
                              />
                            </div>
                            <div>
                              <span>Cao (%):</span>
                              <input
                                type="number"
                                required
                                min={1}
                                max={100}
                                value={spot.h}
                                onChange={(e) => {
                                  const arr = [...hotspotsList];
                                  arr[idx].h = Number(e.target.value);
                                  setHotspotsList(arr);
                                }}
                                className="w-full px-1 py-0.5 border border-slate-200 rounded text-slate-700 mt-0.5"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 10. Match Image To Text */}
                {qType === 'Match Image To Text' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">Cặp ghép bài học</span>
                        <span className="text-[9px] text-slate-400 uppercase font-semibold">Mô tả Text (Trái) ➔ Ảnh minh họa (Phải)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImgTextPairs([...imgTextPairs, { img: '', text: '' }])}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition shadow-sm cursor-pointer"
                      >
                        Thêm cặp mới +
                      </button>
                    </div>

                    <div className="space-y-3">
                      {imgTextPairs.map((pair, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-200/80 rounded-xl space-y-2 shadow-sm relative hover:border-slate-300 transition">
                          <div className="flex gap-2 items-center text-[10px]">
                            {/* Left Side: Description Text */}
                            <div className="flex-1 space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Mô tả Text (Trái)</label>
                              <input
                                type="text"
                                required
                                placeholder="Nhập mô tả văn bản phù hợp..."
                                value={pair.text}
                                onChange={(e) => {
                                  const arr = [...imgTextPairs];
                                  arr[idx].text = e.target.value;
                                  setImgTextPairs(arr);
                                }}
                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white text-xs font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                              />
                            </div>

                            <span className="text-slate-400 font-extrabold text-sm self-end pb-1.5">➔</span>

                            {/* Right Side: Image URL */}
                            <div className="flex-1 space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">URL Hình ảnh minh họa (Phải)</label>
                              <input
                                type="text"
                                required
                                placeholder="Dán link ảnh (https://...)"
                                value={pair.img}
                                onChange={(e) => {
                                  const arr = [...imgTextPairs];
                                  arr[idx].img = e.target.value;
                                  setImgTextPairs(arr);
                                }}
                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white text-xs font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                              />
                            </div>

                            {imgTextPairs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setImgTextPairs(imgTextPairs.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-700 font-bold self-end pb-1.5 ml-1 transition"
                                title="Xóa cặp này"
                              >
                                Xóa
                              </button>
                            )}
                          </div>

                          {/* Live Image Preview */}
                          {pair.img && (
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-3 bg-slate-50/50 px-2 py-1.5 rounded-lg">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Xem trước hình ảnh:</span>
                              <div className="relative w-14 h-14 border border-slate-200 rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-sm">
                                <img
                                  src={pair.img}
                                  alt={`Preview ${idx + 1}`}
                                  className="max-w-full max-h-full object-contain"
                                  onError={(e) => {
                                    // custom error handle: if image is broken, we can display a warning
                                    e.currentTarget.style.display = 'none';
                                    const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (sibling) sibling.style.display = 'flex';
                                  }}
                                />
                                <div className="hidden absolute inset-0 text-[8px] text-rose-500 font-bold items-center justify-center text-center p-1 bg-rose-50">
                                  Lỗi tải ảnh
                                </div>
                              </div>
                              <span className="text-[9px] text-emerald-600 font-medium truncate max-w-xs">
                                ✓ Đã dán URL - vui lòng kiểm tra ảnh xem hiển thị đúng chưa
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 11. Matrix Selection */}
                {qType === 'Matrix Selection' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div>
                        <span className="text-slate-400 font-bold block mb-1">CÁC HÀNG (ngăn cách bởi dấu phẩy)</span>
                        <input
                          type="text"
                          placeholder="Row1,Row2,Row3"
                          value={matrixRows.join(',')}
                          onChange={(e) => setMatrixRows(e.target.value.split(',').filter(Boolean))}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block mb-1">CÁC CỘT (ngăn cách bởi dấu phẩy)</span>
                        <input
                          type="text"
                          placeholder="Col1,Col2,Col3"
                          value={matrixCols.join(',')}
                          onChange={(e) => setMatrixCols(e.target.value.split(',').filter(Boolean))}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-black uppercase">Đáp án ma trận ghép đúng:</span>

                      {matrixRows.map((row) => (
                        <div key={row} className="flex gap-2 items-center">
                          <span className="w-24 truncate text-slate-600 font-bold">{row}:</span>
                          <select
                            value={matrixCorrect[row] || ''}
                            onChange={(e) => {
                              setMatrixCorrect({
                                ...matrixCorrect,
                                [row]: e.target.value,
                              });
                            }}
                            className="flex-1 px-3 py-1 border border-slate-200 rounded bg-white text-xs"
                          >
                            <option value="">-- Chọn cột đúng --</option>
                            {matrixCols.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Explanation Content */}
              <div>
                <label className="block mb-1.5 text-[10px] text-slate-400">GIẢI THÍCH CHI TIẾT ĐÁP ÁN ĐÚNG</label>
                <textarea
                  rows={2}
                  placeholder="Nhập phần giải thích lý do đáp án để học sinh ôn tập..."
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none text-slate-700 bg-slate-50/50 leading-relaxed font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md shadow-blue-200 flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                {actionLoading ? 'Đang lưu trữ thông tin...' : 'Xác nhận Lưu câu hỏi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
