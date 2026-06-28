export type IC3QuestionType =
  | 'Multiple Choice'
  | 'Multiple Response'
  | 'True / False'
  | 'Matching'
  | 'Sequence Ordering'
  | 'True/False Multiple'
  | 'Video Based'
  | 'Categorization'
  | 'Hotspot'
  | 'Match Image To Text'
  | 'Matrix Selection';

export interface QuestionAnswers {
  options?: string[]; // Multiple choice/response, True/False, Match Text, etc.
  leftOptions?: string[]; // For Matching: Left items
  rightOptions?: string[]; // For Matching: Right items
  sequenceItems?: string[]; // For Sequence Ordering
  statements?: string[]; // For True/False Multiple
  categories?: string[]; // For Categorization: Category Names
  categoryItems?: string[]; // For Categorization: Items to categorize
  hotspots?: { id: string; name: string; x: number; y: number; width: number; height: number }[]; // For Hotspot
  imageOptions?: string[]; // For Match Image To Text (URLs or placeholders)
  textTargets?: string[]; // For Match Image To Text
  matrixRows?: string[]; // For Matrix Selection
  matrixCols?: string[]; // For Matrix Selection
}

export interface Question {
  QuestionID: string;
  ExamID: string; // e.g. "OT1"
  Level: 'LV1' | 'LV2' | 'LV3';
  QuestionType: IC3QuestionType;
  QuestionContent: string;
  Answers: string; // JSON string of QuestionAnswers
  CorrectAnswer: string; // JSON string or string of correct answers
  Explanation: string;
  Image?: string; // Image URL (if any)
  Video?: string; // Video URL or path (if any)
  Audio?: string; // Audio URL or path (if any)
  Score: number;
  CreatedAt: string;
}

export interface Student {
  StudentID: string;
  SchoolName: string;
  Username: string;
  Password?: string;
  FullName: string;
  ClassGroup: string; // "Lớp" (e.g., "10A1", "11B2")
  CreatedAt: string;
}

export interface Admin {
  AdminID: string;
  Username: string;
  Password?: string;
  Role: 'Admin' | 'Editor';
}

export interface ScoreRecord {
  StudentID: string;
  StudentName?: string;
  ExamID: string;
  Level: 'LV1' | 'LV2' | 'LV3';
  Score: number;
  Correct: number;
  Wrong: number;
  Time: number; // in seconds
  SubmitTime: string;
}

export interface Exam {
  ExamID: string; // "OT1", "OT2"
  Level: 'LV1' | 'LV2' | 'LV3';
  QuestionIDs: string[]; // parsed from the separate Sheet e.g. "LV1_OT1"
}

// Global Sync Config
export interface SyncConfig {
  appsScriptUrl: string;
  lastSynced?: string;
}
