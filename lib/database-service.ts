import { Question, Student, Admin, ScoreRecord, Exam, SyncConfig, IC3QuestionType } from './types';
import { initialQuestions, initialStudents, initialAdmins, initialScores, initialExams } from './mock-data';

// Helper to initialize local storage
const isClient = typeof window !== 'undefined';

function getLocalStorage<T>(key: string, initialValue: T): T {
  if (!isClient) return initialValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error('Error reading localStorage', error);
    return initialValue;
  }
}

function setLocalStorage<T>(key: string, value: T): void {
  if (!isClient) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing localStorage', error);
  }
}

export class DatabaseService {
  // Key state store keys
  private static KEY_QUESTIONS = 'ic3_questions';
  private static KEY_STUDENTS = 'ic3_students';
  private static KEY_ADMINS = 'ic3_admins';
  private static KEY_SCORES = 'ic3_scores';
  private static KEY_EXAMS = 'ic3_exams';
  private static KEY_SYNC_CONFIG = 'ic3_sync_config';

  // Static initialization of Local Storage if empty
  public static initLocalStorage(force = false) {
    if (!isClient) return;
    if (force || !localStorage.getItem(this.KEY_QUESTIONS)) {
      setLocalStorage(this.KEY_QUESTIONS, initialQuestions);
    }
    if (force || !localStorage.getItem(this.KEY_STUDENTS)) {
      setLocalStorage(this.KEY_STUDENTS, initialStudents);
    }
    if (force || !localStorage.getItem(this.KEY_ADMINS)) {
      setLocalStorage(this.KEY_ADMINS, initialAdmins);
    }
    if (force || !localStorage.getItem(this.KEY_SCORES)) {
      setLocalStorage(this.KEY_SCORES, initialScores);
    }
    if (force || !localStorage.getItem(this.KEY_EXAMS)) {
      setLocalStorage(this.KEY_EXAMS, initialExams);
    }
  }

  // Get active Sync Configuration
  public static getSyncConfig(): SyncConfig {
    const envUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
    if (envUrl) {
      const sanitizedEnv = envUrl.replace(/^["']|["']$/g, '').trim();
      const localConfig = getLocalStorage<SyncConfig>(this.KEY_SYNC_CONFIG, { appsScriptUrl: '' });
      return {
        appsScriptUrl: sanitizedEnv,
        lastSynced: localConfig.lastSynced || new Date().toISOString(),
      };
    }
    const localConfig = getLocalStorage<SyncConfig>(this.KEY_SYNC_CONFIG, { appsScriptUrl: '' });
    return {
      ...localConfig,
      appsScriptUrl: (localConfig.appsScriptUrl || '').replace(/^["']|["']$/g, '').trim(),
    };
  }

  // Save active Sync Configuration
  public static saveSyncConfig(url: string): void {
    const sanitizedUrl = (url || '').replace(/^["']|["']$/g, '').trim();
    setLocalStorage<SyncConfig>(this.KEY_SYNC_CONFIG, {
      appsScriptUrl: sanitizedUrl,
      lastSynced: new Date().toISOString(),
    });
  }

  // Helper: call Google Apps Script Web App
  private static async callAppsScript(action: string, params: Record<string, string> = {}, body?: any): Promise<any> {
    const config = this.getSyncConfig();
    if (!config.appsScriptUrl) {
      throw new Error('Google Apps Script URL is not configured.');
    }

    let proxyUrl = `/api/proxy?url=${encodeURIComponent(config.appsScriptUrl)}&action=${encodeURIComponent(action)}`;
    for (const [key, val] of Object.entries(params)) {
      proxyUrl += `&${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
    }

    const options: RequestInit = {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'text/plain',
      },
    };

    if (body) {
      options.body = JSON.stringify({ action, ...body });
    }

    const response = await fetch(proxyUrl, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // Verify Google Sheets connection
  public static async testConnection(url: string): Promise<{ success: boolean; message?: string }> {
    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}&action=getExams`;
      const response = await fetch(proxyUrl, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        if (data.success === true) {
          return { success: true };
        } else {
          return { success: false, message: data.message || 'Yêu cầu không thành công từ Apps Script.' };
        }
      }
      return { success: false, message: `Lỗi máy chủ proxy: HTTP ${response.status}` };
    } catch (e: any) {
      console.error('Connection test failed', e);
      return { success: false, message: e.message || 'Không thể kết nối đến máy chủ.' };
    }
  }

  // Pull all data from Google Sheets and overwrite local state
  public static async pullFromGoogleSheets(): Promise<{ success: boolean; message: string }> {
    const config = this.getSyncConfig();
    if (!config.appsScriptUrl) {
      return { success: false, message: 'Chưa cấu hình URL Google Sheets.' };
    }

    try {
      let examRes: any = null;
      let questionsRes: any = null;
      let studentsRes: any = null;
      let scoresRes: any = null;
      let adminRes: any = null;

      // First try to fetch all data in a single unified request (massive 5x speed boost)
      try {
        const unifiedRes = await this.callAppsScript('getAllData');
        if (unifiedRes && unifiedRes.success && unifiedRes.exams) {
          examRes = { success: true, data: unifiedRes.exams };
          questionsRes = { success: true, data: unifiedRes.questions };
          studentsRes = { success: true, data: unifiedRes.students };
          scoresRes = { success: true, data: unifiedRes.scores };
          adminRes = { success: true, data: unifiedRes.admins };
          console.log('Unified sync with Google Sheets completed successfully.');
        }
      } catch (err) {
        console.warn('getAllData action failed or not supported yet. Falling back to individual tables parallel fetch.', err);
      }

      // If unified fetch did not succeed, fall back to individual parallel fetches
      if (!examRes || !questionsRes) {
        console.log('Initiating parallel fallback sync...');
        const [eRes, qRes, sRes, scRes, aRes] = await Promise.all([
          this.callAppsScript('getExams').catch(e => { console.error('Error fetching exams', e); return null; }),
          this.callAppsScript('getTable', { table: 'Questions' }).catch(e => { console.error('Error fetching Questions table', e); return null; }),
          this.callAppsScript('getTable', { table: 'Student' }).catch(e => { console.error('Error fetching Student table', e); return null; }),
          this.callAppsScript('getTable', { table: 'Score' }).catch(e => { console.error('Error fetching Score table', e); return null; }),
          this.callAppsScript('getTable', { table: 'Admin' }).catch(e => { console.error('Error fetching Admin table', e); return null; }),
        ]);
        examRes = eRes;
        questionsRes = qRes;
        studentsRes = sRes;
        scoresRes = scRes;
        adminRes = aRes;
      }

      if (examRes && examRes.success && examRes.data) {
        const localExams = getLocalStorage<Exam[]>(this.KEY_EXAMS, initialExams);
        const mergedExams = examRes.data.map((incoming: any) => {
          const match = localExams.find((e) => e.ExamID === incoming.ExamID && e.Level === incoming.Level);
          return {
            ...incoming,
            Duration: match && match.Duration !== undefined ? match.Duration : incoming.Duration,
          };
        });
        setLocalStorage(this.KEY_EXAMS, mergedExams);
      }

      if (questionsRes && questionsRes.success && questionsRes.data) {
        // Correct dates and fields
        const formattedQuestions = questionsRes.data.map((q: any) => ({
          ...q,
          Score: Number(q.Score || 10),
        }));
        setLocalStorage(this.KEY_QUESTIONS, formattedQuestions);
      }

      if (studentsRes && studentsRes.success && studentsRes.data) {
        setLocalStorage(this.KEY_STUDENTS, studentsRes.data);
      }

      if (scoresRes && scoresRes.success && scoresRes.data) {
        const formattedScores = scoresRes.data.map((s: any) => ({
          ...s,
          Score: Number(s.Score),
          Correct: Number(s.Correct),
          Wrong: Number(s.Wrong),
          Time: Number(s.Time),
        }));
        setLocalStorage(this.KEY_SCORES, formattedScores);
      }

      if (adminRes && adminRes.success && adminRes.data) {
        setLocalStorage(this.KEY_ADMINS, adminRes.data);
      }

      this.saveSyncConfig(config.appsScriptUrl); // update lastSynced
      return { success: true, message: 'Đồng bộ dữ liệu từ Google Sheets thành công!' };
    } catch (error: any) {
      console.error('Pull from Google Sheets failed', error);
      return { success: false, message: `Thất bại: ${error.message || error}` };
    }
  }

  // Authenticate user (Supports both Google Sheets API and local fallback)
  public static async login(
    username: string, 
    password: string, 
    role: 'Admin' | 'Student',
    studentDetails?: { schoolName: string; classGroup: string; fullName: string }
  ): Promise<{ success: boolean; user?: any; message?: string }> {
    const config = this.getSyncConfig();
    if (config.appsScriptUrl) {
      try {
        const params: Record<string, string> = { username, password, role };
        if (role === 'Student' && studentDetails) {
          params.schoolName = studentDetails.schoolName;
          params.classGroup = studentDetails.classGroup;
          params.fullName = studentDetails.fullName;
        }
        const res = await this.callAppsScript('login', params);
        return res;
      } catch (e) {
        console.warn('Apps Script login failed, falling back to local storage', e);
      }
    }

    // Local Fallback
    if (role === 'Admin') {
      const admins = getLocalStorage<Admin[]>(this.KEY_ADMINS, initialAdmins);
      const admin = admins.find(a => 
        String(a.Username).trim() === String(username).trim() && 
        String(a.Password).trim() === String(password).trim()
      );
      if (admin) {
        return { success: true, user: admin };
      }
    } else {
      const students = getLocalStorage<Student[]>(this.KEY_STUDENTS, initialStudents);
      if (studentDetails) {
        const student = students.find(s => 
          String(s.SchoolName).trim() === String(studentDetails.schoolName).trim() && 
          String(s.ClassGroup).trim() === String(studentDetails.classGroup).trim() && 
          String(s.FullName).trim() === String(studentDetails.fullName).trim() && 
          String(s.Password).trim() === String(password).trim()
        );
        if (student) {
          return { success: true, user: student };
        }
      } else {
        const student = students.find(s => 
          String(s.Username).trim() === String(username).trim() && 
          String(s.Password).trim() === String(password).trim()
        );
        if (student) {
          return { success: true, user: student };
        }
      }
    }
    return { success: false, message: 'Thông tin đăng nhập hoặc mật khẩu không chính xác.' };
  }

  // =======================================================
  // 1. QUESTION API (with LAZY LOADING / PAGINATION and SEARCH)
  // =======================================================

  public static async getQuestions(filters?: {
    examId?: string;
    level?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ questions: Question[]; total: number }> {
    this.initLocalStorage();
    const allQuestions = getLocalStorage<Question[]>(this.KEY_QUESTIONS, initialQuestions);

    let filtered = [...allQuestions];

    if (filters) {
      if (filters.level) {
        filtered = filtered.filter(q => q.Level === filters.level);
      }
      if (filters.examId) {
        filtered = filtered.filter(q => q.ExamID === filters.examId);
      }
      if (filters.type) {
        filtered = filtered.filter(q => q.QuestionType === filters.type);
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        filtered = filtered.filter(
          q =>
            q.QuestionID.toLowerCase().includes(s) ||
            q.QuestionContent.toLowerCase().includes(s) ||
            q.Explanation.toLowerCase().includes(s)
        );
      }
    }

    const total = filtered.length;

    // Apply offset & limit for lazy loading
    if (filters && filters.offset !== undefined && filters.limit !== undefined) {
      filtered = filtered.slice(filters.offset, filters.offset + filters.limit);
    }

    return { questions: filtered, total };
  }

  public static async saveQuestion(question: Question): Promise<boolean> {
    this.initLocalStorage();
    const config = this.getSyncConfig();

    // Save locally FIRST (Optimistic)
    const questions = getLocalStorage<Question[]>(this.KEY_QUESTIONS, initialQuestions);
    const idx = questions.findIndex(q => q.QuestionID === question.QuestionID);
    if (idx !== -1) {
      questions[idx] = { ...question, CreatedAt: new Date().toISOString() };
    } else {
      questions.push({ ...question, CreatedAt: new Date().toISOString() });
    }
    setLocalStorage(this.KEY_QUESTIONS, questions);

    // Also update associated exam sheet local pointer
    const exams = getLocalStorage<Exam[]>(this.KEY_EXAMS, initialExams);
    const examIdx = exams.findIndex(e => e.ExamID === question.ExamID && e.Level === question.Level);
    if (examIdx !== -1) {
      if (!exams[examIdx].QuestionIDs.includes(question.QuestionID)) {
        exams[examIdx].QuestionIDs.push(question.QuestionID);
        setLocalStorage(this.KEY_EXAMS, exams);
      }
    } else {
      // create exam local structure if missing
      exams.push({
        ExamID: question.ExamID,
        Level: question.Level,
        QuestionIDs: [question.QuestionID],
      });
      setLocalStorage(this.KEY_EXAMS, exams);
    }

    // Call Google Sheets API in background (fire-and-forget)
    if (config.appsScriptUrl) {
      this.callAppsScript('saveQuestion', {}, { question })
        .then(() => {
          console.log('Successfully synced saved question to Google Sheets in background');
        })
        .catch(e => {
          console.error('Failed to sync saved question to Google Sheets in background', e);
        });
    }

    return true;
  }

  public static async deleteQuestion(questionId: string): Promise<boolean> {
    this.initLocalStorage();
    const config = this.getSyncConfig();

    // Delete locally FIRST (Optimistic)
    let questions = getLocalStorage<Question[]>(this.KEY_QUESTIONS, initialQuestions);
    const question = questions.find(q => q.QuestionID === questionId);
    questions = questions.filter(q => q.QuestionID !== questionId);
    setLocalStorage(this.KEY_QUESTIONS, questions);

    if (question) {
      // Remove from associated local exam sheet list
      const exams = getLocalStorage<Exam[]>(this.KEY_EXAMS, initialExams);
      const examIdx = exams.findIndex(e => e.ExamID === question.ExamID && e.Level === question.Level);
      if (examIdx !== -1) {
        exams[examIdx].QuestionIDs = exams[examIdx].QuestionIDs.filter(id => id !== questionId);
        setLocalStorage(this.KEY_EXAMS, exams);
      }
    }

    // Call Google Sheets in background (fire-and-forget)
    if (config.appsScriptUrl) {
      this.callAppsScript('deleteQuestion', {}, { questionId })
        .then(() => {
          console.log('Successfully synced deleted question to Google Sheets in background');
        })
        .catch(e => {
          console.error('Failed to delete question from Google Sheets in background', e);
        });
    }

    return true;
  }

  // =======================================================
  // 2. EXAM CONTROLS (TWO-WAY SYNC EXAM SHEETS)
  // =======================================================

  public static async getExams(): Promise<Exam[]> {
    this.initLocalStorage();
    return getLocalStorage<Exam[]>(this.KEY_EXAMS, initialExams);
  }

  public static async createExam(level: 'LV1' | 'LV2' | 'LV3', examId: string): Promise<boolean> {
    this.initLocalStorage();
    const config = this.getSyncConfig();

    if (config.appsScriptUrl) {
      try {
        await this.callAppsScript('createExam', {}, { level, examId });
      } catch (e) {
        console.error('Failed to create sheet on Google Sheets', e);
      }
    }

    // Create locally
    const exams = getLocalStorage<Exam[]>(this.KEY_EXAMS, initialExams);
    if (!exams.some(e => e.ExamID === examId && e.Level === level)) {
      exams.push({ ExamID: examId, Level: level, QuestionIDs: [] });
      setLocalStorage(this.KEY_EXAMS, exams);
    }
    return true;
  }

  public static async renameExam(level: 'LV1' | 'LV2' | 'LV3', oldExamId: string, newExamId: string): Promise<boolean> {
    this.initLocalStorage();
    const config = this.getSyncConfig();

    if (config.appsScriptUrl) {
      try {
        await this.callAppsScript('renameExam', {}, { oldLevel: level, oldExamId, newExamId, currentLevel: level });
      } catch (e) {
        console.error('Failed to rename exam on Google Sheets', e);
      }
    }

    // Rename locally
    const exams = getLocalStorage<Exam[]>(this.KEY_EXAMS, initialExams);
    const idx = exams.findIndex(e => e.ExamID === oldExamId && e.Level === level);
    if (idx !== -1) {
      exams[idx].ExamID = newExamId;
      setLocalStorage(this.KEY_EXAMS, exams);
    }

    // Update questions linked
    const questions = getLocalStorage<Question[]>(this.KEY_QUESTIONS, initialQuestions);
    questions.forEach(q => {
      if (q.ExamID === oldExamId && q.Level === level) {
        q.ExamID = newExamId;
      }
    });
    setLocalStorage(this.KEY_QUESTIONS, questions);

    return true;
  }

  public static async moveExam(examId: string, oldLevel: 'LV1' | 'LV2' | 'LV3', newLevel: 'LV1' | 'LV2' | 'LV3'): Promise<boolean> {
    this.initLocalStorage();
    const config = this.getSyncConfig();

    if (config.appsScriptUrl) {
      try {
        await this.callAppsScript('moveExam', {}, { examId, oldLevel, newLevel });
      } catch (e) {
        console.error('Failed to move exam on Google Sheets', e);
      }
    }

    // Move locally
    const exams = getLocalStorage<Exam[]>(this.KEY_EXAMS, initialExams);
    const idx = exams.findIndex(e => e.ExamID === examId && e.Level === oldLevel);
    if (idx !== -1) {
      exams[idx].Level = newLevel;
      setLocalStorage(this.KEY_EXAMS, exams);
    }

    // Update questions
    const questions = getLocalStorage<Question[]>(this.KEY_QUESTIONS, initialQuestions);
    questions.forEach(q => {
      if (q.ExamID === examId && q.Level === oldLevel) {
        q.Level = newLevel;
      }
    });
    setLocalStorage(this.KEY_QUESTIONS, questions);

    return true;
  }

  public static async copyExam(sourceLevel: 'LV1' | 'LV2' | 'LV3', sourceExamId: string, targetLevel: 'LV1' | 'LV2' | 'LV3', targetExamId: string): Promise<boolean> {
    this.initLocalStorage();
    const config = this.getSyncConfig();

    if (config.appsScriptUrl) {
      try {
        await this.callAppsScript('copyExam', {}, { sourceLevel, sourceExamId, targetLevel, targetExamId });
      } catch (e) {
        console.error('Failed to copy exam on Google Sheets', e);
      }
    }

    // Copy locally
    const exams = getLocalStorage<Exam[]>(this.KEY_EXAMS, initialExams);
    const sourceExam = exams.find(e => e.ExamID === sourceExamId && e.Level === sourceLevel);
    if (!sourceExam) return false;

    const questions = getLocalStorage<Question[]>(this.KEY_QUESTIONS, initialQuestions);
    const newQuestionIDs: string[] = [];

    // Clone linked questions
    sourceExam.QuestionIDs.forEach(qId => {
      const q = questions.find(item => item.QuestionID === qId);
      if (q) {
        const nextQId = `Q${String(questions.length + 1).padStart(3, '0')}`;
        newQuestionIDs.push(nextQId);
        questions.push({
          ...q,
          QuestionID: nextQId,
          ExamID: targetExamId,
          Level: targetLevel,
          CreatedAt: new Date().toISOString(),
        });
      }
    });

    exams.push({
      ExamID: targetExamId,
      Level: targetLevel,
      QuestionIDs: newQuestionIDs,
    });

    setLocalStorage(this.KEY_EXAMS, exams);
    setLocalStorage(this.KEY_QUESTIONS, questions);

    return true;
  }

  public static async deleteExam(level: 'LV1' | 'LV2' | 'LV3', examId: string): Promise<boolean> {
    this.initLocalStorage();
    const config = this.getSyncConfig();

    if (config.appsScriptUrl) {
      try {
        await this.callAppsScript('deleteExam', {}, { level, examId });
      } catch (e) {
        console.error('Failed to delete exam on Google Sheets', e);
      }
    }

    // Delete locally
    let exams = getLocalStorage<Exam[]>(this.KEY_EXAMS, initialExams);
    exams = exams.filter(e => !(e.ExamID === examId && e.Level === level));
    setLocalStorage(this.KEY_EXAMS, exams);

    // Delete associated questions locally to free up trash
    let questions = getLocalStorage<Question[]>(this.KEY_QUESTIONS, initialQuestions);
    questions = questions.filter(q => !(q.ExamID === examId && q.Level === level));
    setLocalStorage(this.KEY_QUESTIONS, questions);

    return true;
  }

  public static async updateExamDuration(level: 'LV1' | 'LV2' | 'LV3', examId: string, duration: number): Promise<boolean> {
    this.initLocalStorage();
    const exams = getLocalStorage<Exam[]>(this.KEY_EXAMS, initialExams);
    const idx = exams.findIndex(e => e.ExamID === examId && e.Level === level);
    if (idx !== -1) {
      exams[idx].Duration = duration;
      setLocalStorage(this.KEY_EXAMS, exams);
      return true;
    }
    return false;
  }

  // =======================================================
  // 3. STUDENT PORTAL (CRUD AND LAZY LISTING)
  // =======================================================

  public static async getStudents(filters?: { search?: string; limit?: number; offset?: number }): Promise<{ students: Student[]; total: number }> {
    this.initLocalStorage();
    const allStudents = getLocalStorage<Student[]>(this.KEY_STUDENTS, initialStudents);

    let filtered = [...allStudents];
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(
        st =>
          st.StudentID.toLowerCase().includes(s) ||
          st.FullName.toLowerCase().includes(s) ||
          st.Username.toLowerCase().includes(s) ||
          st.ClassGroup.toLowerCase().includes(s)
      );
    }

    const total = filtered.length;

    if (filters && filters.offset !== undefined && filters.limit !== undefined) {
      filtered = filtered.slice(filters.offset, filters.offset + filters.limit);
    }

    return { students: filtered, total };
  }

  public static async saveStudent(student: Student): Promise<boolean> {
    this.initLocalStorage();
    const config = this.getSyncConfig();

    // Save locally FIRST (Optimistic)
    const students = getLocalStorage<Student[]>(this.KEY_STUDENTS, initialStudents);
    const idx = students.findIndex(s => s.StudentID === student.StudentID);
    if (idx !== -1) {
      students[idx] = { ...student };
    } else {
      students.push({ ...student, CreatedAt: new Date().toISOString() });
    }
    setLocalStorage(this.KEY_STUDENTS, students);

    // Call Google Sheets API in background (fire-and-forget)
    if (config.appsScriptUrl) {
      this.callAppsScript('saveStudent', {}, { student })
        .then(() => {
          console.log('Successfully synced student to Google Sheets in background');
        })
        .catch(e => {
          console.error('Failed to sync student to Google Sheets in background', e);
        });
    }

    return true;
  }

  public static async deleteStudent(studentId: string): Promise<boolean> {
    this.initLocalStorage();
    const config = this.getSyncConfig();

    // Delete locally FIRST (Optimistic)
    let students = getLocalStorage<Student[]>(this.KEY_STUDENTS, initialStudents);
    students = students.filter(s => s.StudentID !== studentId);
    setLocalStorage(this.KEY_STUDENTS, students);

    // Also delete score records locally (Optimistic)
    let scores = getLocalStorage<ScoreRecord[]>(this.KEY_SCORES, initialScores);
    scores = scores.filter(sc => sc.StudentID !== studentId);
    setLocalStorage(this.KEY_SCORES, scores);

    // Call Google Sheets in background (fire-and-forget)
    if (config.appsScriptUrl) {
      this.callAppsScript('deleteStudent', {}, { studentId })
        .then(() => {
          console.log('Successfully synced deleted student to Google Sheets in background');
        })
        .catch(e => {
          console.error('Failed to delete student from Google Sheets in background', e);
        });
    }

    return true;
  }

  // =======================================================
  // 4. SCORE SUBMISSIONS (HISTORICAL DATA)
  // =======================================================

  public static async getScores(filters?: { studentId?: string; level?: 'LV1' | 'LV2' | 'LV3'; examId?: string }): Promise<ScoreRecord[]> {
    this.initLocalStorage();
    let scores = getLocalStorage<ScoreRecord[]>(this.KEY_SCORES, initialScores);

    if (filters) {
      if (filters.studentId) {
        scores = scores.filter(s => s.StudentID === filters.studentId);
      }
      if (filters.level) {
        scores = scores.filter(s => s.Level === filters.level);
      }
      if (filters.examId) {
        scores = scores.filter(s => s.ExamID === filters.examId);
      }
    }

    // Add student names if missing
    const students = getLocalStorage<Student[]>(this.KEY_STUDENTS, initialStudents);
    return scores.map(s => {
      const found = students.find(st => st.StudentID === s.StudentID);
      return {
        ...s,
        StudentName: found ? found.FullName : s.StudentName || 'Học sinh ẩn danh',
      };
    });
  }

  public static async submitScore(scoreRecord: ScoreRecord): Promise<boolean> {
    this.initLocalStorage();
    const config = this.getSyncConfig();

    if (config.appsScriptUrl) {
      try {
        await this.callAppsScript('submitScore', {}, { scoreRecord });
      } catch (e) {
        console.error('Failed to submit score to Google Sheets', e);
      }
    }

    // Save locally
    const scores = getLocalStorage<ScoreRecord[]>(this.KEY_SCORES, initialScores);
    scores.unshift(scoreRecord); // Add to beginning of records
    setLocalStorage(this.KEY_SCORES, scores);
    return true;
  }

  // Reset all local storage values
  public static clearAllData(): void {
    if (!isClient) return;
    this.initLocalStorage(true);
  }
}
