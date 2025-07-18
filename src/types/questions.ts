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
  created_at: string;
  updated_at: string;
  questions?: Question[];
}

export interface QuestionResponse {
  questionId: string;
  response: string;
  timestamp: number;
  duration: number;
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