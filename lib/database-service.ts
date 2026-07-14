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

  // Helper to parse dynamic-column score row-objects into individual ScoreRecord[]
  public static parseRawScoresToRecords(rawScores: any[]): ScoreRecord[] {
    const records: ScoreRecord[] = [];
    const baseKeys = ['studentid', 'studentname', 'schoolname', 'classgroup', 'level'];

    for (const row of rawScores) {
      const studentId = row.StudentID || row.studentId || '';
      const level = row.Level || row.level || '';
      if (!studentId || !level) continue;

      const studentName = row.StudentName || row.studentName || 'Học sinh ẩn danh';
      const schoolName = row.SchoolName || row.schoolName || 'Trường chưa xác định';
      const classGroup = row.ClassGroup || row.classGroup || 'Lớp chưa xác định';

      for (const [key, value] of Object.entries(row)) {
        const lowerKey = key.toLowerCase();
        if (!baseKeys.includes(lowerKey) && value !== null && value !== undefined && value !== '') {
          records.push({
            StudentID: studentId,
            StudentName: studentName,
            SchoolName: schoolName,
            ClassGroup: classGroup,
            ExamID: key,
            Level: level as 'LV1' | 'LV2' | 'LV3',
            Score: Number(value),
            Correct: 0,
            Wrong: 0,
            Time: 0,
            SubmitTime: new Date().toISOString()
          });
        }
      }
    }
    return records;
  }

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

  // Pull login data (Student, Admin) from Google Sheets and update local state in background
  public static async pullLoginData(): Promise<{ success: boolean; message: string }> {
    const config = this.getSyncConfig();
    if (!config.appsScriptUrl) {
      return { success: false, message: 'Chưa cấu hình URL Google Sheets.' };
    }

    try {
      const [studentsRes, adminRes] = await Promise.all([
        this.callAppsScript('getTable', { table: 'Student' }).catch((e) => {
          console.warn('Error fetching Student table in background', e);
          return null;
        }),
        this.callAppsScript('getTable', { table: 'Admin' }).catch((e) => {
          console.warn('Error fetching Admin table in background', e);
          return null;
        }),
      ]);

      if (studentsRes && studentsRes.success && studentsRes.data) {
        setLocalStorage(this.KEY_STUDENTS, studentsRes.data);
      }
      if (adminRes && adminRes.success && adminRes.data) {
        setLocalStorage(this.KEY_ADMINS, adminRes.data);
      }

      return { success: true, message: 'Đồng bộ dữ liệu tài khoản thành công!' };
    } catch (error: any) {
      console.warn('Pull login data failed', error);
      return { success: false, message: `Thất bại: ${error.message || error}` };
    }
  }

  // Pull dashboard data (Exams, Scores) from Google Sheets and update local state in background
  public static async pullDashboardData(): Promise<{ success: boolean; message: string }> {
    const config = this.getSyncConfig();
    if (!config.appsScriptUrl) {
      return { success: false, message: 'Chưa cấu hình URL Google Sheets.' };
    }

    try {
      const [examRes, scoresRes] = await Promise.all([
        this.callAppsScript('getExams').catch((e) => {
          console.warn('Error fetching Exams list in background', e);
          return null;
        }),
        this.callAppsScript('getTable', { table: 'Score' }).catch((e) => {
          console.warn('Error fetching Score table in background', e);
          return null;
        }),
      ]);

      if (examRes && examRes.success && examRes.data) {
        const localExams = getLocalStorage<Exam[]>(this.KEY_EXAMS, initialExams);
        const mergedExams = examRes.data.map((incoming: any) => {
          const match = localExams.find((e) => e.ExamID?.trim().toUpperCase() === incoming.ExamID?.trim().toUpperCase() && e.Level === incoming.Level);
          return {
            ...incoming,
            ExamID: incoming.ExamID?.trim().toUpperCase(),
            Duration: match && match.Duration !== undefined ? match.Duration : incoming.Duration,
          };
        });
        setLocalStorage(this.KEY_EXAMS, mergedExams);
      }

      if (scoresRes && scoresRes.success && scoresRes.data) {
        const formattedScores = this.parseRawScoresToRecords(scoresRes.data);
        setLocalStorage(this.KEY_SCORES, formattedScores);
      }

      return { success: true, message: 'Đồng bộ dữ liệu đề thi và điểm số thành công!' };
    } catch (error: any) {
      console.warn('Pull dashboard data failed', error);
      return { success: false, message: `Thất bại: ${error.message || error}` };
    }
  }

  // Pull questions data (Questions) from Google Sheets and update local state in background
  public static async pullQuestionsData(): Promise<{ success: boolean; message: string }> {
    const config = this.getSyncConfig();
    if (!config.appsScriptUrl) {
      return { success: false, message: 'Chưa cấu hình URL Google Sheets.' };
    }

    try {
      const questionsRes = await this.callAppsScript('getTable', { table: 'Questions' }).catch((e) => {
        console.warn('Error fetching Questions table in background', e);
        return null;
      });

      if (questionsRes && questionsRes.success && questionsRes.data) {
        const formattedQuestions = questionsRes.data.map((q: any) => ({
          ...q,
          ExamID: q.ExamID?.trim().toUpperCase(),
          QuestionID: q.QuestionID?.trim().toUpperCase(),
          Score: Number(q.Score || 10),
        }));
        setLocalStorage(this.KEY_QUESTIONS, formattedQuestions);
        return { success: true, message: 'Đồng bộ ngân hàng câu hỏi thành công!' };
      }

      return { success: false, message: 'Không lấy được ngân hàng câu hỏi hoặc dữ liệu trống.' };
    } catch (error: any) {
      console.warn('Pull questions data failed', error);
      return { success: false, message: `Thất bại: ${error.message || error}` };
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
          this.callAppsScript('getExams').catch(e => { console.warn('Error fetching exams', e); return null; }),
          this.callAppsScript('getTable', { table: 'Questions' }).catch(e => { console.warn('Error fetching Questions table', e); return null; }),
          this.callAppsScript('getTable', { table: 'Student' }).catch(e => { console.warn('Error fetching Student table', e); return null; }),
          this.callAppsScript('getTable', { table: 'Score' }).catch(e => { console.warn('Error fetching Score table', e); return null; }),
          this.callAppsScript('getTable', { table: 'Admin' }).catch(e => { console.warn('Error fetching Admin table', e); return null; }),
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
          const match = localExams.find((e) => e.ExamID?.trim().toUpperCase() === incoming.ExamID?.trim().toUpperCase() && e.Level === incoming.Level);
          return {
            ...incoming,
            ExamID: incoming.ExamID?.trim().toUpperCase(),
            Duration: match && match.Duration !== undefined ? match.Duration : incoming.Duration,
          };
        });
        setLocalStorage(this.KEY_EXAMS, mergedExams);
      }

      if (questionsRes && questionsRes.success && questionsRes.data) {
        // Correct dates and fields
        const formattedQuestions = questionsRes.data.map((q: any) => ({
          ...q,
          ExamID: q.ExamID?.trim().toUpperCase(),
          QuestionID: q.QuestionID?.trim().toUpperCase(),
          Score: Number(q.Score || 10),
        }));
        setLocalStorage(this.KEY_QUESTIONS, formattedQuestions);
      }

      if (studentsRes && studentsRes.success && studentsRes.data) {
        setLocalStorage(this.KEY_STUDENTS, studentsRes.data);
      }

      if (scoresRes && scoresRes.success && scoresRes.data) {
        const formattedScores = this.parseRawScoresToRecords(scoresRes.data);
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
  // Local-first optimization: authenticates in 0ms if cached, with seamless online fallback
  public static async login(
    username: string, 
    password: string, 
    role: 'Admin' | 'Student',
    studentDetails?: { schoolName: string; classGroup: string; fullName: string }
  ): Promise<{ success: boolean; user?: any; message?: string }> {
    this.initLocalStorage();

    // 1. LOCAL-FIRST CHECK (0ms instant check)
    if (role === 'Admin') {
      const admins = getLocalStorage<Admin[]>(this.KEY_ADMINS, initialAdmins);
      const admin = admins.find(a => 
        String(a.Username).trim() === String(username).trim() && 
        String(a.Password).trim() === String(password).trim()
      );
      if (admin) {
        console.log('Instant local-first login succeeded for Admin:', username);
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
          console.log('Instant local-first login succeeded for Student via dropdown:', studentDetails.fullName);
          return { success: true, user: student };
        }
      } else {
        const student = students.find(s => 
          String(s.Username).trim() === String(username).trim() && 
          String(s.Password).trim() === String(password).trim()
        );
        if (student) {
          console.log('Instant local-first login succeeded for Student:', username);
          return { success: true, user: student };
        }
      }
    }

    // 2. REMOTE FALLBACK (only if local check fails)
    const config = this.getSyncConfig();
    if (config.appsScriptUrl) {
      console.log('Local check failed or user not synced yet. Trying remote fallback authentication...');
      try {
        const params: Record<string, string> = { username, password, role };
        if (role === 'Student' && studentDetails) {
          params.schoolName = studentDetails.schoolName;
          params.classGroup = studentDetails.classGroup;
          params.fullName = studentDetails.fullName;
        }
        const res = await this.callAppsScript('login', params);
        
        // Optimistic saving of the newly found remote user to local storage for future instant logins
        if (res.success && res.user) {
          if (role === 'Admin') {
            const admins = getLocalStorage<Admin[]>(this.KEY_ADMINS, initialAdmins);
            if (!admins.some(a => a.Username === res.user.Username)) {
              admins.push(res.user);
              setLocalStorage(this.KEY_ADMINS, admins);
            }
          } else {
            const students = getLocalStorage<Student[]>(this.KEY_STUDENTS, initialStudents);
            if (!students.some(s => s.StudentID === res.user.StudentID)) {
              students.push(res.user);
              setLocalStorage(this.KEY_STUDENTS, students);
            }
          }
        }
        return res;
      } catch (e) {
        console.warn('Apps Script login failed, falling back to local storage', e);
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
        const targetExamId = filters.examId.trim().toUpperCase();
        filtered = filtered.filter(q => q.ExamID?.trim().toUpperCase() === targetExamId);
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

    const cleanQuestion: Question = {
      ...question,
      ExamID: question.ExamID?.trim().toUpperCase(),
      QuestionID: question.QuestionID?.trim().toUpperCase(),
    };

    // Save locally FIRST (Optimistic)
    const questions = getLocalStorage<Question[]>(this.KEY_QUESTIONS, initialQuestions);
    const idx = questions.findIndex(q => q.QuestionID === cleanQuestion.QuestionID);
    if (idx !== -1) {
      questions[idx] = { ...cleanQuestion, CreatedAt: new Date().toISOString() };
    } else {
      questions.push({ ...cleanQuestion, CreatedAt: new Date().toISOString() });
    }
    setLocalStorage(this.KEY_QUESTIONS, questions);

    // Also update associated exam sheet local pointer
    const exams = getLocalStorage<Exam[]>(this.KEY_EXAMS, initialExams);
    const examIdx = exams.findIndex(e => e.ExamID?.trim().toUpperCase() === cleanQuestion.ExamID && e.Level === cleanQuestion.Level);
    if (examIdx !== -1) {
      if (!exams[examIdx].QuestionIDs.includes(cleanQuestion.QuestionID)) {
        exams[examIdx].QuestionIDs.push(cleanQuestion.QuestionID);
        setLocalStorage(this.KEY_EXAMS, exams);
      }
    } else {
      // create exam local structure if missing
      exams.push({
        ExamID: cleanQuestion.ExamID,
        Level: cleanQuestion.Level,
        QuestionIDs: [cleanQuestion.QuestionID],
      });
      setLocalStorage(this.KEY_EXAMS, exams);
    }

    // Call Google Sheets API in background (fire-and-forget)
    if (config.appsScriptUrl) {
      this.callAppsScript('saveQuestion', {}, { question: cleanQuestion })
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

    const targetQuestionId = questionId?.trim().toUpperCase();

    // Delete locally FIRST (Optimistic)
    let questions = getLocalStorage<Question[]>(this.KEY_QUESTIONS, initialQuestions);
    const question = questions.find(q => q.QuestionID?.trim().toUpperCase() === targetQuestionId);
    questions = questions.filter(q => q.QuestionID?.trim().toUpperCase() !== targetQuestionId);
    setLocalStorage(this.KEY_QUESTIONS, questions);

    if (question) {
      // Remove from associated local exam sheet list
      const exams = getLocalStorage<Exam[]>(this.KEY_EXAMS, initialExams);
      const examIdx = exams.findIndex(e => e.ExamID?.trim().toUpperCase() === question.ExamID?.trim().toUpperCase() && e.Level === question.Level);
      if (examIdx !== -1) {
        exams[examIdx].QuestionIDs = exams[examIdx].QuestionIDs.filter(id => id?.trim().toUpperCase() !== targetQuestionId);
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

    // Add student names and schools if missing
    const students = getLocalStorage<Student[]>(this.KEY_STUDENTS, initialStudents);
    return scores.map(s => {
      const found = students.find(st => st.StudentID === s.StudentID);
      return {
        ...s,
        StudentName: found ? found.FullName : s.StudentName || 'Học sinh ẩn danh',
        SchoolName: found ? found.SchoolName : s.SchoolName || 'Trường chưa xác định',
        ClassGroup: found ? found.ClassGroup : s.ClassGroup || 'Lớp chưa xác định',
      };
    });
  }

  public static async submitScore(scoreRecord: ScoreRecord): Promise<boolean> {
    this.initLocalStorage();
    const config = this.getSyncConfig();

    if (config.appsScriptUrl) {
      try {
        const payloadRecord = {
          // PascalCase fields
          StudentID: scoreRecord.StudentID,
          StudentName: scoreRecord.StudentName || 'Học sinh ẩn danh',
          SchoolName: scoreRecord.SchoolName || 'Trường chưa xác định',
          ClassGroup: scoreRecord.ClassGroup || 'Lớp chưa xác định',
          ExamID: scoreRecord.ExamID,
          Level: scoreRecord.Level,
          Score: scoreRecord.Score,
          Correct: scoreRecord.Correct,
          Wrong: scoreRecord.Wrong,
          Time: scoreRecord.Time,
          SubmitTime: scoreRecord.SubmitTime || new Date().toISOString(),

          // camelCase fields (as requested by requirement 2)
          studentId: scoreRecord.StudentID,
          studentName: scoreRecord.StudentName || 'Học sinh ẩn danh',
          schoolName: scoreRecord.SchoolName || 'Trường chưa xác định',
          classGroup: scoreRecord.ClassGroup || 'Lớp chưa xác định',
          examId: scoreRecord.ExamID,
          level: scoreRecord.Level,
          score: scoreRecord.Score,
          correct: scoreRecord.Correct,
          wrong: scoreRecord.Wrong,
          time: scoreRecord.Time,
          submitTime: scoreRecord.SubmitTime || new Date().toISOString()
        };
        await this.callAppsScript('submitScore', {}, { scoreRecord: payloadRecord });
      } catch (e) {
        console.error('Failed to submit score to Google Sheets', e);
      }
    }

    // Save locally (Overwrites score for same StudentID + Level + ExamID)
    const scores = getLocalStorage<ScoreRecord[]>(this.KEY_SCORES, initialScores);
    const idx = scores.findIndex(
      s => s.StudentID === scoreRecord.StudentID && 
           s.Level === scoreRecord.Level && 
           s.ExamID === scoreRecord.ExamID
    );
    if (idx !== -1) {
      scores[idx] = { ...scoreRecord };
    } else {
      scores.unshift(scoreRecord);
    }
    setLocalStorage(this.KEY_SCORES, scores);
    return true;
  }

  // Reset all local storage values
  public static clearAllData(): void {
    if (!isClient) return;
    this.initLocalStorage(true);
  }
}
