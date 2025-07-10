export type QuestionType = 'open_ended' | 'multiple_choice' | 'behavioral' | 'technical';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  category: string;
  expectedDuration: number; // in seconds
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionSequence {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
  totalDuration: number; // in seconds
  difficulty: QuestionDifficulty;
  categories: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionResponse {
  questionId: string;
  response: string;
  timestamp: number;
  duration: number; // how long the candidate took to answer
  score?: number; // optional score if we implement scoring
  feedback?: string; // interviewer feedback
}

export interface InterviewSession {
  id: string;
  candidateName: string;
  startTime: number;
  endTime?: number;
  currentQuestionIndex: number;
  sequence: QuestionSequence;
  responses: QuestionResponse[];
  status: 'in_progress' | 'completed' | 'paused';
} 