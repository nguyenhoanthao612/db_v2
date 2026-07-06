'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DatabaseService } from '@/lib/database-service';
import { Question, IC3QuestionType, QuestionAnswers } from '@/lib/types';
import { useAdmin } from '@/components/admin/AdminContext';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Video,
  ListOrdered,
  Grid,
} from 'lucide-react';

export default function QuestionsPage() {
  const { syncTrigger, onSyncComplete } = useAdmin();

  // Questions State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qSearch, setQSearch] = useState('');
  const [qLevelFilter, setQLevelFilter] = useState<string>('');
  const [qExamFilter, setQExamFilter] = useState<string>('');
  const [qTypeFilter, setQTypeFilter] = useState<string>('');
  const [qOffset, setQOffset] = useState(0);
  const [qTotal, setQTotal] = useState(0);
  const qLimit = 5;

  // For next ID computation
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);

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
  const [hotspotsList, setHotspotsList] = useState<{ id: string; name: string; x: number; y: number; w: number; h: number; radius?: number }[]>([
    { id: 'hotspot_1', name: 'Nút A', x: 10, y: 10, w: 20, h: 20, radius: 10 },
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

  const [imageRect, setImageRect] = useState<{
    width: number;
    height: number;
    left: number;
    top: number;
  } | null>(null);
  const [adminImgElement, setAdminImgElement] = useState<HTMLImageElement | null>(null);

  const adminImgRefCallback = useCallback((node: HTMLImageElement | null) => {
    if (node !== null) {
      setAdminImgElement(node);
    }
  }, []);

  const updateAdminImageRect = useCallback((img: HTMLImageElement | null) => {
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    if (!naturalWidth || !naturalHeight || !rect.width || !rect.height) return;

    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const imageRatio = naturalWidth / naturalHeight;
    const containerRatio = containerWidth / containerHeight;

    let displayedWidth = containerWidth;
    let displayedHeight = containerHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (containerRatio > imageRatio) {
      displayedHeight = containerHeight;
      displayedWidth = containerHeight * imageRatio;
      offsetX = (containerWidth - displayedWidth) / 2;
    } else {
      displayedWidth = containerWidth;
      displayedHeight = containerWidth / imageRatio;
      offsetY = (containerHeight - displayedHeight) / 2;
    }

    setImageRect({
      width: displayedWidth,
      height: displayedHeight,
      left: offsetX,
      top: offsetY,
    });
  }, []);

  useEffect(() => {
    if (!adminImgElement) return;

    const observer = new ResizeObserver(() => {
      updateAdminImageRect(adminImgElement);
    });
    observer.observe(adminImgElement);

    const handleLoad = () => {
      updateAdminImageRect(adminImgElement);
    };

    adminImgElement.addEventListener('load', handleLoad);
    const timerId = setTimeout(() => {
      updateAdminImageRect(adminImgElement);
    }, 0);

    return () => {
      observer.disconnect();
      adminImgElement.removeEventListener('load', handleLoad);
      clearTimeout(timerId);
    };
  }, [adminImgElement, qImageUrl, showQModal, updateAdminImageRect]);

  // For Match Image to Text
  const [imgTextPairs, setImgTextPairs] = useState<{ img: string; text: string }[]>([{ img: '', text: '' }]);

  // For Matrix Selection
  const [matrixRows, setMatrixRows] = useState<string[]>(['Row A', 'Row B']);
  const [matrixCols, setMatrixCols] = useState<string[]>(['Col 1', 'Col 2']);
  const [matrixCorrect, setMatrixCorrect] = useState<Record<string, string>>({});

  // Parse state (AI/Auto parser)
  const [parseStatus, setParseStatus] = useState('');
  const [parseError, setParseError] = useState('');

  // Loading States
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadQuestions = async () => {
    try {
      // Get filtered list and unfiltered total count in parallel using Promise.all
      const [filteredRes, unfilteredRes] = await Promise.all([
        DatabaseService.getQuestions({
          search: qSearch,
          level: qLevelFilter,
          examId: qExamFilter,
          type: qTypeFilter,
          limit: qLimit,
          offset: qOffset,
        }),
        DatabaseService.getQuestions()
      ]);
      setQuestions(filteredRes.questions);
      setQTotal(filteredRes.total);
      setTotalQuestionsCount(unfilteredRes.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncTrigger, qOffset, qSearch, qLevelFilter, qExamFilter, qTypeFilter]);

  const computeNextQId = useCallback(async (level: string, examId: string) => {
    try {
      const res = await DatabaseService.getQuestions();
      const allQ = res.questions || [];
      
      const groupQ = allQ.filter(
        (q) => q.Level === level && q.ExamID === examId
      );
      
      let maxNum = 0;
      if (groupQ.length > 0) {
        groupQ.forEach((q) => {
          const match = q.QuestionID.match(/Q(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        return `Q${String(maxNum + 1).padStart(3, '0')}`;
      } else {
        let globalMaxNum = 0;
        allQ.forEach((q) => {
          const match = q.QuestionID.match(/Q(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > globalMaxNum) globalMaxNum = num;
          }
        });
        return `Q${String(globalMaxNum + 1).padStart(3, '0')}`;
      }
    } catch (e) {
      console.error('Error computing next QId', e);
      return `Q${String(totalQuestionsCount + 1).padStart(3, '0')}`;
    }
  }, [totalQuestionsCount]);

  // Dynamic recalculation of QuestionID when Level or ExamID is changed inside the creation modal
  useEffect(() => {
    if (showQModal && !editingQ && qLevel && qExamID && qExamID.trim()) {
      const updateQId = async () => {
        const nextQId = await computeNextQId(qLevel, qExamID.trim());
        setQId(nextQId);
      };
      updateQId();
    }
  }, [showQModal, editingQ, qLevel, qExamID, computeNextQId]);

  const handleOpenQModal = async (q: Question | null = null) => {
    setParseStatus('');
    setParseError('');
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
          radius: h.radius ?? Math.max(1, Math.round((h.width ?? 15) / 2)) ?? 15,
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
      
      const defaultLevel = (qLevelFilter as 'LV1' | 'LV2' | 'LV3') || 'LV1';
      const defaultExamID = qExamFilter || 'OT1';
      
      setQExamID(defaultExamID);
      setQLevel(defaultLevel);
      
      const nextQId = await computeNextQId(defaultLevel, defaultExamID);
      setQId(nextQId);
      
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

  const getValidationError = () => {
    if (!qContent.trim()) {
      return 'Thiếu nội dung câu hỏi.';
    }

    if (qType === 'Multiple Choice' || qType === 'Video Based') {
      const activeOptions = mcOptions.filter(o => o.trim() !== '');
      if (activeOptions.length < 2) {
        return 'Câu hỏi trắc nghiệm cần tối thiểu 2 đáp án.';
      }

      const seen = new Set<string>();
      for (const opt of mcOptions) {
        const trimmed = opt.trim().toLowerCase();
        if (trimmed) {
          if (seen.has(trimmed)) {
            return 'Có đáp án trùng nhau.';
          }
          seen.add(trimmed);
        }
      }

      const hasEmpty = mcOptions.some(opt => !opt.trim());
      if (hasEmpty) {
        return 'Có ký hiệu đáp án sai định dạng hoặc đáp án bị để trống.';
      }

      if (correctMcIndex < 0 || correctMcIndex >= mcOptions.length) {
        return 'Không tìm thấy đáp án đúng.';
      }
    } else if (qType === 'Multiple Response') {
      const activeOptions = mrOptions.filter(o => o.trim() !== '');
      if (activeOptions.length < 2) {
        return 'Câu hỏi trắc nghiệm cần tối thiểu 2 đáp án.';
      }

      const seen = new Set<string>();
      for (const opt of mrOptions) {
        const trimmed = opt.trim().toLowerCase();
        if (trimmed) {
          if (seen.has(trimmed)) {
            return 'Có đáp án trùng nhau.';
          }
          seen.add(trimmed);
        }
      }

      const hasEmpty = mrOptions.some(opt => !opt.trim());
      if (hasEmpty) {
        return 'Có ký hiệu đáp án sai định dạng hoặc đáp án bị để trống.';
      }

      if (correctMrIndices.length === 0) {
        return 'Không tìm thấy đáp án đúng.';
      }
    }

    return '';
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qId || !qContent) return;

    const validationMsg = getValidationError();
    if (validationMsg) {
      setParseError(validationMsg);
      alert(`Không thể lưu câu hỏi. Lỗi kiểm tra:\n- ${validationMsg}`);
      return;
    }

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
        radius: h.radius ?? Math.max(1, Math.round(h.w / 2)) ?? 15,
      }));
      finalAnswersObj = { hotspots: hList };
      finalCorrectAnswerStr = correctHotspotId;
    } else if (qType === 'Match Image To Text') {
      const textTargets = imgTextPairs.map((p) => p.text).filter(Boolean);
      const imageOptions = imgTextPairs.map((p) => p.img).filter(Boolean);
      finalAnswersObj = { imageOptions, textTargets };
      finalCorrectAnswerStr = JSON.stringify(textTargets.map((_, i) => i));
    } else if (qType === 'Matrix Selection') {
      const filteredRows = matrixRows.map((r) => r.trim()).filter(Boolean);
      const filteredCols = matrixCols.map((c) => c.trim()).filter(Boolean);
      finalAnswersObj = { matrixRows: filteredRows, matrixCols: filteredCols };

      const cleanCorrect: Record<string, string> = {};
      Object.entries(matrixCorrect).forEach(([row, col]) => {
        if (row.trim() && col.trim() && filteredRows.includes(row.trim()) && filteredCols.includes(col.trim())) {
          cleanCorrect[row.trim()] = col.trim();
        }
      });
      finalCorrectAnswerStr = JSON.stringify(cleanCorrect);
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
      onSyncComplete();
    }
    setActionLoading(false);
  };

  // Drag handles for Hotspot Editor
  const handleSpotMouseDown = (e: React.MouseEvent, spotId: string) => {
    if (!imageRect) return;
    const spot = hotspotsList.find((h) => h.id === spotId);
    if (!spot) return;

    setDraggingSpot({
      id: spotId,
      startX: e.clientX,
      startY: e.clientY,
      startSpotX: spot.x,
      startSpotY: spot.y,
      containerWidth: imageRect.width,
      containerHeight: imageRect.height,
    });
  };

  const handleSpotMouseMove = (e: React.MouseEvent) => {
    if (!draggingSpot) return;

    const deltaX = e.clientX - draggingSpot.startX;
    const deltaY = e.clientY - draggingSpot.startY;

    const pctX = (deltaX / draggingSpot.containerWidth) * 100;
    const pctY = (deltaY / draggingSpot.containerHeight) * 100;

    const newX = Math.round(Math.max(0, Math.min(100, draggingSpot.startSpotX + pctX)));
    const newY = Math.round(Math.max(0, Math.min(100, draggingSpot.startSpotY + pctY)));

    setHotspotsList((prev) =>
      prev.map((h) => (h.id === draggingSpot.id ? { ...h, x: newX, y: newY } : h))
    );
  };

  const handleSpotMouseUp = () => {
    setDraggingSpot(null);
  };

  // Smart automatic parsing of pasted questions and answers
  const runSmartParser = (textToParse: string) => {
    if (!textToParse || !textToParse.trim()) return;

    setParseStatus('Đang tự động phân tích định dạng...');
    setParseError('');

    try {
      const optionRegex = /^\s*(?:([a-zA-Z0-9]{1,2})\s*[.)\-:]|([①②③④⑤⑥⑦⑧⑨⑩]))\s*(.*)/i;
      const answerLineRegex = /^\s*(?:Đáp án đúng|Correct|Đáp án|Answer)\s*:\s*(.*)/i;
      const circledMap: Record<string, string> = {
        '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5',
        '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9', '⑩': '10'
      };

      const checkAndStripCorrect = (optionText: string) => {
        const patterns = [
          /\((?:Correct|correct|Đúng|đúng)\)/i,
          /【(?:Correct|correct|Đúng|đúng)】/i,
          /\[(?:Correct|correct|Đúng|đúng)\]/i,
          /✔/g,
          /✓/g,
          /\s*[-–—:]\s*(?:Đáp án đúng|Correct|correct|Đúng|đúng)\s*$/i,
          /\s*(?:Đáp án đúng)\s*$/i,
        ];

        let isCorrect = false;
        let cleanText = optionText;

        for (const pattern of patterns) {
          if (pattern.test(cleanText)) {
            isCorrect = true;
            cleanText = cleanText.replace(pattern, '');
          }
        }

        const tailPattern = /\s*\(?\s*(?:Correct|correct|Đáp án đúng|Đúng)\s*\)?\s*$/i;
        if (tailPattern.test(cleanText)) {
          const temp = cleanText.replace(tailPattern, '').trim();
          if (temp.length > 0) {
            isCorrect = true;
            cleanText = temp;
          }
        }

        cleanText = cleanText.trim().replace(/\s*[-–—:]\s*$/, '').trim();
        return { isCorrect, cleanText };
      };

      const lines = textToParse.replace(/\r/g, '').split('\n');
      let firstOptionIdx = -1;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() && optionRegex.test(lines[i])) {
          firstOptionIdx = i;
          break;
        }
      }

      // If no options found, try to treat as standard content
      if (firstOptionIdx === -1) {
        setQContent(textToParse.trim());
        setParseStatus('Không phát hiện danh sách lựa chọn. Đã cập nhật nội dung câu hỏi.');
        setParseError('Không tìm thấy đáp án đúng.');
        return;
      }

      const questionContent = lines.slice(0, firstOptionIdx).join('\n').trim();
      
      const parsedOptions: { prefix: string; text: string; isCorrect: boolean }[] = [];
      const externalCorrectKeys: string[] = [];

      for (let i = firstOptionIdx; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Check if it's an answer key line
        const ansMatch = line.match(answerLineRegex);
        if (ansMatch) {
          const keysStr = ansMatch[1];
          const keys = keysStr.split(/[\s,&\/|]+/).map(k => k.trim().toUpperCase()).filter(Boolean);
          externalCorrectKeys.push(...keys);
          continue;
        }

        const match = line.match(optionRegex);
        if (match) {
          const prefix = (match[1] || match[2] || '').trim();
          const rawText = (match[3] || '').trim();
          const { isCorrect, cleanText } = checkAndStripCorrect(rawText);
          parsedOptions.push({ prefix, text: cleanText, isCorrect });
        } else {
          // Continuation of last option
          if (parsedOptions.length > 0) {
            const { isCorrect, cleanText } = checkAndStripCorrect(line);
            if (isCorrect) {
              parsedOptions[parsedOptions.length - 1].isCorrect = true;
              if (cleanText.trim()) {
                parsedOptions[parsedOptions.length - 1].text += '\n' + cleanText.trim();
              }
            } else {
              parsedOptions[parsedOptions.length - 1].text += '\n' + line.trim();
            }
          }
        }
      }

      // Process external correct keys if any
      if (externalCorrectKeys.length > 0) {
        parsedOptions.forEach(opt => {
          const normPrefix = (circledMap[opt.prefix] || opt.prefix).toUpperCase();
          if (externalCorrectKeys.includes(normPrefix)) {
            opt.isCorrect = true;
          }
        });
      }

      // Count correct options
      const correctIndices = parsedOptions
        .map((opt, idx) => (opt.isCorrect ? idx : -1))
        .filter(idx => idx !== -1);

      const correctCount = correctIndices.length;

      // 1. Check Error: Thiếu nội dung câu hỏi
      if (!questionContent) {
        setParseError('Thiếu nội dung câu hỏi.');
        setParseStatus('Phân tích thất bại!');
        return;
      }

      // 2. Check Error: Không tìm thấy đáp án đúng
      let currentError = '';
      if (correctCount === 0) {
        currentError = 'Không tìm thấy đáp án đúng.';
      }

      // 3. Check Error: Có đáp án trùng nhau
      const seenTexts = new Set<string>();
      let hasDuplicates = false;
      parsedOptions.forEach(opt => {
        const textNorm = opt.text.toLowerCase().trim();
        if (textNorm) {
          if (seenTexts.has(textNorm)) {
            hasDuplicates = true;
          }
          seenTexts.add(textNorm);
        }
      });
      if (hasDuplicates) {
        currentError = currentError ? currentError + ' Có đáp án trùng nhau.' : 'Có đáp án trùng nhau.';
      }

      // 4. Check Error: Có ký hiệu đáp án sai định dạng (e.g. prefix is weird or contains empty option text)
      const hasEmptyOption = parsedOptions.some(opt => !opt.text.trim());
      if (hasEmptyOption) {
        currentError = currentError ? currentError + ' Có ký hiệu đáp án sai định dạng.' : 'Có ký hiệu đáp án sai định dạng.';
      }

      if (currentError) {
        setParseError(currentError);
      }

      // Determine type based on correct count
      let detectedType: IC3QuestionType = 'Multiple Choice'; // Default is single selection (1 correct answer)
      if (correctCount > 1) {
        detectedType = 'Multiple Response';
      }

      // Update Form Fields
      setQContent(questionContent);
      setQType(detectedType);

      const optionTexts = parsedOptions.map(opt => opt.text.trim());

      if (detectedType === 'Multiple Choice') {
        setMcOptions(optionTexts);
        setCorrectMcIndex(correctIndices[0] ?? 0);
      } else {
        setMrOptions(optionTexts);
        setCorrectMrIndices(correctIndices);
      }

      // Show success message if no errors
      if (correctCount > 0 && !hasDuplicates && !hasEmptyOption) {
        setParseStatus(
          `Đã tự động phân tích thành công: ${parsedOptions.length} đáp án, tự động chọn loại ${
            detectedType === 'Multiple Choice' ? 'Single Choice' : 'Multiple Choice'
          }.`
        );
      } else {
        setParseStatus('Phân tích có cảnh báo hoặc lỗi định dạng!');
      }

    } catch (err) {
      console.error(err);
      setParseStatus('Lỗi hệ thống khi phân tích cú pháp!');
      setParseError('Lỗi hệ thống khi phân tích cú pháp!');
    }
  };

  // Auto parsing questions button trigger
  const handleAutoParseContent = () => {
    if (!qContent.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi trước khi phân tích!');
      return;
    }
    runSmartParser(qContent);
  };

  return (
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
                <th className="p-4 text-right">Thao tác</th>
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
                    <td className="p-4 text-right space-x-1.5">
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
                    placeholder="ví dụ: Q101"
                    value={qId}
                    onChange={(e) => setQId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none text-slate-700 bg-slate-50/50 font-black uppercase"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-[10px] text-slate-400 font-bold">MÃ ĐỀ THI (EXAMID)</label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: OT1, OT2"
                    value={qExamID}
                    onChange={(e) => setQExamID(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none text-slate-700 bg-slate-50/50 font-black"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-[10px] text-slate-400 font-bold">LEVEL</label>
                  <select
                    value={qLevel}
                    onChange={(e) => setQLevel(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none text-slate-700 bg-white font-bold"
                  >
                    <option value="LV1">Level 1 (LV1)</option>
                    <option value="LV2">Level 2 (LV2)</option>
                    <option value="LV3">Level 3 (LV3)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 text-[10px] text-slate-400 font-bold">ĐIỂM SỐ</label>
                  <input
                    type="number"
                    required
                    value={qScore}
                    onChange={(e) => setQScore(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none text-slate-700 bg-slate-50/50 font-black"
                  />
                </div>
              </div>

              {/* Media input fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-[10px] text-slate-400">URL HÌNH ẢNH (TÙY CHỌN)</label>
                  <input
                    type="url"
                    placeholder="Nhập link ảnh https://..."
                    value={qImageUrl}
                    onChange={(e) => setQImageUrl(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none text-slate-700 bg-slate-50/50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-[10px] text-slate-400">URL VIDEO (TÙY CHỌN CHO DẠNG VIDEO)</label>
                  <input
                    type="url"
                    placeholder="Nhập link video https://..."
                    value={qVideoUrl}
                    onChange={(e) => setQVideoUrl(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none text-slate-700 bg-slate-50/50 font-semibold"
                  />
                </div>
              </div>

              {/* Question type dropdown */}
              <div>
                <label className="block mb-1.5 text-[10px] text-slate-400">DẠNG CÂU HỎI (11 LOẠI CHUYÊN BIỆT)</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as any)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none text-slate-700 bg-white font-bold"
                >
                  <option value="Multiple Choice">Multiple Choice (Trắc nghiệm 1 đáp án đúng)</option>
                  <option value="Multiple Response">Multiple Response (Trắc nghiệm nhiều đáp án đúng)</option>
                  <option value="True / False">True / False (Đúng / Sai đơn)</option>
                  <option value="Matching">Matching (Nối cột trái - phải kéo thả)</option>
                  <option value="Sequence Ordering">Sequence Ordering (Sắp xếp thứ tự kéo thả)</option>
                  <option value="True/False Multiple">True/False Multiple (Chọn Đúng/Sai cho nhiều phát biểu)</option>
                  <option value="Video Based">Video Based (Trắc nghiệm kèm video hướng dẫn)</option>
                  <option value="Categorization">Categorization (Phân loại các ý vào nhóm)</option>
                  <option value="Hotspot">Hotspot (Click chọn điểm nóng trực quan trên ảnh)</option>
                  <option value="Match Image To Text">Match Image To Text (Nối hình ảnh với text tương ứng)</option>
                  <option value="Matrix Selection">Matrix Selection (Ma trận lựa chọn dòng/cột chuyên nghiệp)</option>
                </select>
              </div>

              {/* Question content textarea with Parse action */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] text-slate-400 uppercase">NỘI DUNG CÂU HỎI & ĐÁP ÁN (DÁN TOÀN BỘ ĐỂ TỰ ĐỘNG PHÂN TÍCH)</label>
                  <button
                    type="button"
                    onClick={handleAutoParseContent}
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                    title="Hệ thống sẽ tự nhận dạng các lựa chọn A, B, C, D hoặc ký tự đặc biệt để điền nhanh form"
                  >
                    Tự động Phân tích định dạng text nhanh
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="Nhập nội dung câu hỏi, hoặc dán toàn bộ Câu hỏi kèm các đáp án a. b. c. d. (Correct) vào đây..."
                  value={qContent}
                  onChange={(e) => setQContent(e.target.value)}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (pastedText) {
                      e.preventDefault();
                      runSmartParser(pastedText);
                    }
                  }}
                  className="w-full px-3.5 py-3 border border-slate-200 rounded-2xl focus:outline-none text-slate-700 bg-slate-50/50 leading-relaxed font-bold"
                />
                {parseStatus && (
                  <p className={`text-[10px] font-bold mt-1 ${parseError ? 'text-red-500 font-black' : 'text-blue-500 animate-pulse'}`}>{parseStatus}</p>
                )}
                {parseError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-2xl text-[11px] text-red-600 font-bold leading-relaxed space-y-1">
                    <p className="flex items-center gap-1">
                      <span>⚠️ Lỗi/Cảnh báo định dạng:</span>
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {parseError.split('.').map(err => err.trim()).filter(Boolean).map((err, i) => (
                        <li key={i}>{err}.</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* DYNAMIC ANSWER BUILDERS (11 Dạng) */}
              <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/40 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  Thiết lập đáp án cho dạng: <span className="text-blue-600 font-black">{qType}</span>
                </h4>

                {/* Multiple Choice / Video Based */}
                {(qType === 'Multiple Choice' || qType === 'Video Based') && (
                  <div className="space-y-3">
                    <label className="block text-[10px] text-slate-400">DANH SÁCH LỰA CHỌN (TÍCH CHỌN ĐÁP ÁN ĐÚNG)</label>
                    {mcOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCorrectMcIndex(idx)}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 select-none cursor-pointer transition ${
                            correctMcIndex === idx
                              ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                              : 'border-slate-300 bg-white text-slate-400 hover:border-slate-400'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </button>
                        <input
                          type="text"
                          required={idx < 2}
                          value={opt}
                          onChange={(e) => {
                            const updated = [...mcOptions];
                            updated[idx] = e.target.value;
                            setMcOptions(updated);
                          }}
                          placeholder={`Lựa chọn ${String.fromCharCode(65 + idx)}`}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none text-slate-700 font-bold"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Multiple Response */}
                {qType === 'Multiple Response' && (
                  <div className="space-y-3">
                    <label className="block text-[10px] text-slate-400">DANH SÁCH LỰA CHỌN (TÍCH CHỌN ĐÁP ÁN ĐÚNG - CÓ THỂ CHỌN NHIỀU)</label>
                    {mrOptions.map((opt, idx) => {
                      const isCorrect = correctMrIndices.includes(idx);
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (isCorrect) {
                                setCorrectMrIndices(correctMrIndices.filter((i) => i !== idx));
                              } else {
                                setCorrectMrIndices([...correctMrIndices, idx].sort());
                              }
                            }}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 select-none cursor-pointer transition ${
                              isCorrect
                                ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                                : 'border-slate-300 bg-white text-slate-400 hover:border-slate-400'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </button>
                          <input
                            type="text"
                            required={idx < 2}
                            value={opt}
                            onChange={(e) => {
                              const updated = [...mrOptions];
                              updated[idx] = e.target.value;
                              setMrOptions(updated);
                            }}
                            placeholder={`Lựa chọn ${String.fromCharCode(65 + idx)}`}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none text-slate-700 font-bold"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* True / False */}
                {qType === 'True / False' && (
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-2">ĐÁP ÁN ĐÚNG</label>
                    <div className="flex gap-4">
                      {['Đúng', 'Sai'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTfCorrect(val as any)}
                          className={`flex-1 py-3 border rounded-xl font-bold transition select-none cursor-pointer text-center text-xs ${
                            tfCorrect === val
                              ? 'bg-blue-50 border-blue-400 text-blue-600 shadow-sm shadow-blue-100/60'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching */}
                {qType === 'Matching' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-slate-400">CÁC CẶP GHÉP ĐỐI ỨNG (HỌC SINH SẼ KÉO Ý PHẢI VÀO Ý TRÁI)</label>
                      <button
                        type="button"
                        onClick={() => setMatchingPairs([...matchingPairs, { left: '', right: '' }])}
                        className="text-[10px] text-blue-500 hover:underline cursor-pointer font-bold"
                      >
                        + Thêm cặp nối mới
                      </button>
                    </div>

                    {matchingPairs.map((pair, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <span className="text-[10px] text-slate-400 w-4 shrink-0 font-bold">#{idx + 1}</span>
                        <input
                          type="text"
                          required
                          value={pair.left}
                          onChange={(e) => {
                            const updated = [...matchingPairs];
                            updated[idx].left = e.target.value;
                            setMatchingPairs(updated);
                          }}
                          placeholder="Nội dung ý Trái"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none text-slate-700 font-bold"
                        />
                        <span className="text-slate-400 font-black">⇄</span>
                        <input
                          type="text"
                          required
                          value={pair.right}
                          onChange={(e) => {
                            const updated = [...matchingPairs];
                            updated[idx].right = e.target.value;
                            setMatchingPairs(updated);
                          }}
                          placeholder="Nội dung ý Phải"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none text-slate-700 font-bold"
                        />
                        {matchingPairs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setMatchingPairs(matchingPairs.filter((_, i) => i !== idx))}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Sequence Ordering */}
                {qType === 'Sequence Ordering' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-slate-400">DANH SÁCH BƯỚC THEO THỨ TỰ ĐÚNG (HỆ THỐNG SẼ TỰ ĐẢO TRỘN KHI THI)</label>
                      <button
                        type="button"
                        onClick={() => setSequenceList([...sequenceList, ''])}
                        className="text-[10px] text-blue-500 hover:underline cursor-pointer font-bold"
                      >
                        + Thêm bước tiếp theo
                      </button>
                    </div>

                    {sequenceList.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <span className="w-5 h-5 rounded-full bg-slate-200/80 flex items-center justify-center font-bold text-[10px] text-slate-600 shrink-0 select-none">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          required
                          value={item}
                          onChange={(e) => {
                            const updated = [...sequenceList];
                            updated[idx] = e.target.value;
                            setSequenceList(updated);
                          }}
                          placeholder={`Nội dung bước thứ ${idx + 1}`}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none text-slate-700 font-bold"
                        />
                        {sequenceList.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setSequenceList(sequenceList.filter((_, i) => i !== idx))}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* True/False Multiple */}
                {qType === 'True/False Multiple' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-slate-400">DANH SÁCH PHÁT BIỂU VÀ ĐÁP ÁN ĐÚNG</label>
                      <button
                        type="button"
                        onClick={() => setStmtRows([...stmtRows, { text: '', correct: true }])}
                        className="text-[10px] text-blue-500 hover:underline cursor-pointer font-bold"
                      >
                        + Thêm phát biểu mới
                      </button>
                    </div>

                    {stmtRows.map((row, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <span className="text-[10px] text-slate-400 w-4 shrink-0 font-bold">#{idx + 1}</span>
                        <input
                          type="text"
                          required
                          value={row.text}
                          onChange={(e) => {
                            const updated = [...stmtRows];
                            updated[idx].text = e.target.value;
                            setStmtRows(updated);
                          }}
                          placeholder="Nhập phát biểu, ví dụ: CPU là bộ xử lý trung tâm"
                          className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none text-slate-700 font-bold"
                        />

                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...stmtRows];
                              updated[idx].correct = true;
                              setStmtRows(updated);
                            }}
                            className={`px-3 py-1.5 border text-[10px] font-extrabold rounded-lg select-none cursor-pointer ${
                              row.correct
                                ? 'bg-green-50 border-green-300 text-green-700 font-black'
                                : 'bg-white border-slate-200 text-slate-400'
                            }`}
                          >
                            Đúng
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...stmtRows];
                              updated[idx].correct = false;
                              setStmtRows(updated);
                            }}
                            className={`px-3 py-1.5 border text-[10px] font-extrabold rounded-lg select-none cursor-pointer ${
                              !row.correct
                                ? 'bg-red-50 border-red-300 text-red-700 font-black'
                                : 'bg-white border-slate-200 text-slate-400'
                            }`}
                          >
                            Sai
                          </button>
                        </div>

                        {stmtRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setStmtRows(stmtRows.filter((_, i) => i !== idx))}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Categorization */}
                {qType === 'Categorization' && (
                  <div className="space-y-4">
                    {/* Categories Setup */}
                    <div className="space-y-2 border-b border-slate-100 pb-3">
                      <label className="block text-[10px] text-slate-400 font-bold">1. THIẾT LẬP CÁC NHÓM PHÂN LOẠI</label>
                      <div className="grid grid-cols-2 gap-3">
                        {catCategories.map((cat, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <span className="text-[10px] text-slate-400 font-bold">Nhóm {idx + 1}</span>
                            <input
                              type="text"
                              required
                              value={cat}
                              onChange={(e) => {
                                const updated = [...catCategories];
                                updated[idx] = e.target.value;
                                setCatCategories(updated);
                              }}
                              placeholder={`Tên nhóm ${idx + 1}`}
                              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none text-slate-700 text-xs font-bold"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Items Setup */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-slate-400 font-bold">2. DANH SÁCH Ý VÀ CHỈ ĐỊNH NHÓM PHÙ HỢP</label>
                        <button
                          type="button"
                          onClick={() => setCatItems([...catItems, { name: '', category: catCategories[0] || '' }])}
                          className="text-[10px] text-blue-500 hover:underline cursor-pointer font-bold"
                        >
                          + Thêm ý mới
                        </button>
                      </div>

                      {catItems.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <input
                            type="text"
                            required
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...catItems];
                              updated[idx].name = e.target.value;
                              setCatItems(updated);
                            }}
                            placeholder="Tên ý, ví dụ: Máy in"
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none text-slate-700 font-bold"
                          />
                          <span className="text-slate-400 font-black">➜</span>
                          <select
                            value={item.category}
                            onChange={(e) => {
                              const updated = [...catItems];
                              updated[idx].category = e.target.value;
                              setCatItems(updated);
                            }}
                            className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none font-bold"
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
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hotspot */}
                {qType === 'Hotspot' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-slate-400">THIẾT LẬP ĐIỂM NÓNG TRỰC QUAN (HOTSPOT)</label>
                      <p className="text-[11px] text-slate-400 font-bold mt-1">
                        1. Điền link ảnh ở mục ảnh phía trên.<br />
                        2. Nhấp &quot;+ Thêm điểm nóng&quot; để vẽ ô tương tác.<br />
                        3. Kéo thả ô chấm đỏ trực tiếp trên khung ảnh xem trước bên dưới để căn chỉnh vị trí tọa độ (%).<br />
                        4. Tích chọn điểm nào là Đáp Án Đúng cho câu hỏi này.
                      </p>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold">Danh sách các điểm vẽ trên ảnh</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nid = `hotspot_${Date.now()}`;
                          setHotspotsList([...hotspotsList, { id: nid, name: `Điểm ${hotspotsList.length + 1}`, x: 30, y: 30, w: 15, h: 15 }]);
                        }}
                        className="text-[10px] text-blue-500 hover:underline cursor-pointer font-bold"
                      >
                        + Thêm điểm nóng mới
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {hotspotsList.map((h, idx) => {
                        const isCorrect = correctHotspotId === h.id;
                        return (
                          <div key={h.id} className="flex gap-2 items-center bg-white p-3 border border-slate-200/60 rounded-xl shadow-sm">
                            <span className="text-[10px] text-slate-400 font-bold w-4">#{idx + 1}</span>
                            <input
                              type="text"
                              value={h.name}
                              onChange={(e) => {
                                setHotspotsList(hotspotsList.map((spot) => (spot.id === h.id ? { ...spot, name: e.target.value } : spot)));
                              }}
                              placeholder="Tên vùng"
                              className="w-32 px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 focus:outline-none font-bold"
                            />

                            <div className="flex gap-2 text-[10px] text-slate-400 font-bold items-center">
                              <span>X: {h.x}%</span>
                              <span>Y: {h.y}%</span>
                              <span>Bán kính (Radius %):</span>
                              <input
                                type="number"
                                value={h.radius ?? Math.max(1, Math.round(h.w / 2)) ?? 15}
                                onChange={(e) => {
                                  const newRad = Number(e.target.value);
                                  setHotspotsList(hotspotsList.map((spot) => (spot.id === h.id ? { ...spot, radius: newRad, w: newRad * 2, h: newRad * 2 } : spot)));
                                }}
                                className="w-12 px-1 py-1 border border-slate-200 rounded font-bold"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => setCorrectHotspotId(h.id)}
                              className={`ml-auto px-2.5 py-1.5 text-[10px] rounded-lg border font-black transition cursor-pointer ${
                                isCorrect
                                  ? 'bg-green-50 border-green-300 text-green-700'
                                  : 'bg-white border-slate-200 text-slate-400'
                              }`}
                            >
                              {isCorrect ? '★ Đáp án đúng' : 'Đặt làm đáp án'}
                            </button>

                            {hotspotsList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = hotspotsList.filter((spot) => spot.id !== h.id);
                                  setHotspotsList(filtered);
                                  if (correctHotspotId === h.id) {
                                    setCorrectHotspotId(filtered[0]?.id || '');
                                  }
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* INTERACTIVE PREVIEW BUILDER STAGE */}
                    {qImageUrl ? (
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold">BẢN ĐỒ XEM TRƯỚC VÀ KÉO THẢ ĐỊNH VỊ (HỌC SINH SẼ THẤY ĐÚNG NHƯ VẬY):</label>
                        <div
                          id="hotspot-editor-container"
                          onMouseMove={handleSpotMouseMove}
                          onMouseUp={handleSpotMouseUp}
                          onMouseLeave={handleSpotMouseUp}
                          className="relative border-2 border-dashed border-slate-200 rounded-2xl bg-slate-900/5 overflow-hidden w-full h-80 flex items-center justify-center cursor-crosshair select-none"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            ref={adminImgRefCallback}
                            src={qImageUrl}
                            alt="Interactive hotspot builder"
                            className="w-full h-full object-contain pointer-events-none"
                            referrerPolicy="no-referrer"
                          />

                          {imageRect && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${imageRect.left}px`,
                                top: `${imageRect.top}px`,
                                width: `${imageRect.width}px`,
                                height: `${imageRect.height}px`,
                              }}
                              className="pointer-events-auto"
                            >
                              {hotspotsList.map((h, idx) => {
                                const isCorrect = correctHotspotId === h.id;
                                const radius = h.radius ?? Math.max(1, Math.round(h.w / 2)) ?? 15;
                                return (
                                  <div
                                    key={h.id}
                                    onMouseDown={(e) => handleSpotMouseDown(e, h.id)}
                                    style={{
                                      left: `${h.x}%`,
                                      top: `${h.y}%`,
                                      width: `${radius * 2}%`,
                                      aspectRatio: '1 / 1',
                                      transform: 'translate(-50%, -50%)',
                                    }}
                                    className={`absolute border-2 rounded-full flex flex-col items-center justify-center transition-colors cursor-move shadow-md ${
                                      isCorrect
                                        ? 'bg-green-500/20 border-green-500 text-green-700'
                                        : 'bg-blue-500/20 border-blue-500 text-blue-700'
                                    }`}
                                  >
                                    <span className="bg-slate-900/80 text-white text-[8px] font-black px-1 py-0.5 rounded pointer-events-none">
                                      #{idx + 1}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-xs">
                        Vui lòng nhập URL hình ảnh phía trên để xem trước trực tiếp và kéo thả định vị các Hotspot tương tác.
                      </div>
                    )}
                  </div>
                )}

                {/* Match Image To Text */}
                {qType === 'Match Image To Text' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-slate-400">THIẾT LẬP CÁC CẶP HÌNH ẢNH VÀ CHỮ TƯƠNG ỨNG</label>
                      <button
                        type="button"
                        onClick={() => setImgTextPairs([...imgTextPairs, { img: '', text: '' }])}
                        className="text-[10px] text-blue-500 hover:underline cursor-pointer font-bold"
                      >
                        + Thêm cặp ảnh-text mới
                      </button>
                    </div>

                    {imgTextPairs.map((pair, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <span className="text-[10px] text-slate-400 w-4 shrink-0 font-bold">#{idx + 1}</span>
                        <input
                          type="url"
                          required
                          value={pair.img}
                          onChange={(e) => {
                            const updated = [...imgTextPairs];
                            updated[idx].img = e.target.value;
                            setImgTextPairs(updated);
                          }}
                          placeholder="Link hình ảnh https://..."
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none text-slate-700 text-xs font-semibold"
                        />
                        <span className="text-slate-400 font-black">⇄</span>
                        <input
                          type="text"
                          required
                          value={pair.text}
                          onChange={(e) => {
                            const updated = [...imgTextPairs];
                            updated[idx].text = e.target.value;
                            setImgTextPairs(updated);
                          }}
                          placeholder="Mô tả ý tương ứng"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none text-slate-700 font-bold text-xs"
                        />
                        {imgTextPairs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setImgTextPairs(imgTextPairs.filter((_, i) => i !== idx))}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Matrix Selection */}
                {qType === 'Matrix Selection' && (
                  <div className="space-y-4">
                    {/* Rows inputs */}
                    <div className="space-y-2 border-b border-slate-100 pb-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-slate-400 font-black">1. THIẾT LẬP DANH SÁCH CÁC HÀNG (PHÁT BIỂU NỘI DUNG)</label>
                        <button
                          type="button"
                          onClick={() => setMatrixRows([...matrixRows, ''])}
                          className="text-[10px] text-blue-500 hover:underline cursor-pointer font-bold"
                        >
                          + Thêm hàng phát biểu mới
                        </button>
                      </div>
                      <div className="space-y-2">
                        {matrixRows.map((row, idx) => (
                          <div key={`row-input-${idx}`} className="flex gap-2 items-center">
                            <span className="text-[10px] text-slate-400 font-bold w-12 shrink-0">Hàng {idx + 1}</span>
                            <input
                              type="text"
                              required
                              value={row}
                              onChange={(e) => {
                                const updated = [...matrixRows];
                                updated[idx] = e.target.value;
                                setMatrixRows(updated);
                              }}
                              placeholder={`Nội dung hàng phát biểu ${idx + 1}`}
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none text-slate-700 text-xs font-bold"
                            />
                            {matrixRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = matrixRows.filter((_, i) => i !== idx);
                                  setMatrixRows(filtered);
                                  const newCorrect = { ...matrixCorrect };
                                  delete newCorrect[row];
                                  setMatrixCorrect(newCorrect);
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Columns inputs */}
                    <div className="space-y-2 border-b border-slate-100 pb-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-slate-400 font-black">2. THIẾT LẬP DANH SÁCH CÁC CỘT (CÁC TIÊU CHÍ LỰA CHỌN)</label>
                        <button
                          type="button"
                          onClick={() => setMatrixCols([...matrixCols, ''])}
                          className="text-[10px] text-blue-500 hover:underline cursor-pointer font-bold"
                        >
                          + Thêm cột tiêu chí mới
                        </button>
                      </div>
                      <div className="space-y-2">
                        {matrixCols.map((col, idx) => (
                          <div key={`col-input-${idx}`} className="flex gap-2 items-center">
                            <span className="text-[10px] text-slate-400 font-bold w-12 shrink-0">Cột {idx + 1}</span>
                            <input
                              type="text"
                              required
                              value={col}
                              onChange={(e) => {
                                const updated = [...matrixCols];
                                updated[idx] = e.target.value;
                                setMatrixCols(updated);
                              }}
                              placeholder={`Tên cột tiêu chí ${idx + 1}`}
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none text-slate-700 text-xs font-bold"
                            />
                            {matrixCols.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = matrixCols.filter((_, i) => i !== idx);
                                  setMatrixCols(filtered);
                                  // Clean correct col associations
                                  const newCorrect = { ...matrixCorrect };
                                  Object.keys(newCorrect).forEach((k) => {
                                    if (newCorrect[k] === col) {
                                      delete newCorrect[k];
                                    }
                                  });
                                  setMatrixCorrect(newCorrect);
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Interactive Setup Table Preview */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 font-black">3. THIẾT LẬP MẪU ĐÁP ÁN ĐÚNG TRỰC QUAN (NHẤP CHỌN NÚT TRÒN ĐỂ CÀI ĐẶT ĐÁP ÁN ĐÚNG CHO TỪNG DÒNG)</label>

                      {matrixRows.filter(Boolean).length > 0 && matrixCols.filter(Boolean).length > 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          <table className="w-full border-collapse border-slate-200">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold">
                                <th className="p-3 text-left border-r border-slate-200">Hàng / Cột</th>
                                {matrixCols.map((col, idx) => (
                                  <th
                                    key={`col-header-${idx}`}
                                    className="p-3 text-center border-l border-slate-200 max-w-[120px] break-words"
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {matrixRows.map((row, rIdx) => {
                                const selectedCol = matrixCorrect[row];

                                return (
                                  <tr key={`row-${rIdx}`} className="hover:bg-slate-50/50 transition">
                                    {/* Row title on the left */}
                                    <td className="p-3 border-b border-r border-slate-200 text-xs font-semibold text-slate-700 max-w-[280px] break-words">
                                      {row || <span className="text-slate-400 italic font-normal">(Chưa nhập phát biểu)</span>}
                                    </td>
                                    {/* Options on the right */}
                                    {matrixCols.map((col, cIdx) => {
                                      const isCorrect = selectedCol === col && col !== '';

                                      return (
                                        <td key={`col-${cIdx}`} className="p-3 border-b border-l border-slate-200 text-center">
                                          <button
                                            type="button"
                                            disabled={!row || !col}
                                            onClick={() => {
                                              if (!row || !col) return;
                                              setMatrixCorrect({
                                                ...matrixCorrect,
                                                [row]: col,
                                              });
                                            }}
                                            className={`w-5 h-5 rounded-full border flex items-center justify-center mx-auto transition-all shadow-sm ${
                                              !row || !col
                                                ? 'border-slate-200 bg-slate-100 cursor-not-allowed opacity-50'
                                                : 'border-slate-400 bg-white cursor-pointer hover:border-[#0066cc] hover:scale-110 active:scale-95'
                                            }`}
                                            title={row && col ? `Chọn "${col}" cho hàng "${row}"` : ''}
                                          >
                                            <div
                                              className={`w-3 h-3 rounded-full transition-all ${
                                                isCorrect ? 'bg-[#0066cc] scale-100' : 'bg-transparent scale-0'
                                              }`}
                                            />
                                          </button>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50">
                          Vui lòng nhập đầy đủ các Hàng và Cột để hiển thị ma trận thiết lập.
                        </div>
                      )}
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
                className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md shadow-blue-200 flex items-center justify-center gap-1 font-bold"
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
