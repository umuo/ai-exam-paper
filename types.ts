// Enums for selection
export enum EducationLevel {
  PRIMARY = '小学',
  MIDDLE = '初中',
  HIGH = '高中',
}

export enum ExamType {
  QUIZ = '随堂测验',
  UNIT = '单元测试',
  MIDTERM = '期中考试',
  FINAL = '期末考试',
}

// Data structures for the Exam content
export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  FILL_IN_BLANK = 'fill_in_blank',
  SHORT_ANSWER = 'short_answer',
  CALCULATION = 'calculation',
  ESSAY = 'essay',
  JUDGMENT = 'judgment', // Added judgment type
}

export interface Question {
  id: number;
  number: number;
  text: string;
  type: QuestionType;
  score: number;
  options?: string[]; // For multiple choice
  answerSpaceLines?: number; // How many lines of space to leave
  imagePrompt?: string; // Prompt for generating an image
  imageUrl?: string; // The generated base64 image URL
}

export interface Section {
  title: string;
  description?: string;
  questions: Question[];
  totalScore: number;
}

export interface ExamData {
  title: string;
  subtitle?: string;
  subject: string;
  grade: string;
  durationMinutes: number;
  totalScore: number;
  sections: Section[];
}

// Form Input Type
export interface ExamRequest {
  level: EducationLevel;
  gradeSpec: string; // e.g., "三年级", "高一"
  subject: string;
  topicDescription: string;
  difficulty: 'easy' | 'medium' | 'hard';
}