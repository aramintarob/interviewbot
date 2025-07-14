export type QuestionType = 'open_ended' | 'multiple_choice' | 'behavioral' | 'technical';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface BranchingCondition {
  type: 'keyword' | 'sentiment' | 'duration';
  value: string | number;
  nextQuestionId: string;
}

export interface Question {
  id: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export type NewQuestion = Omit<Question, 'id' | 'created_at' | 'updated_at'>;

export interface QuestionSequence {
  id: string;
  name: string;
  description?: string;
  difficulty: QuestionDifficulty;
  created_at: string;
  updated_at: string;
  // These will be populated by the service
  questions?: Question[];
  total_duration?: number;
  categories?: string[];
  tags?: string[];
}

export type NewQuestionSequence = {
  name: string;
  description?: string;
  difficulty: QuestionDifficulty;
  questionIds: string[]; // Array of question IDs to create sequence items
};

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