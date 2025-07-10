import { useState, useEffect } from 'react';
import { ElevenLabsService } from '@/services/elevenLabsService';
import { questionService } from '@/services/questionService';
import { Question, QuestionSequence } from '@/types/questions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface InterviewSessionProps {
  elevenLabsService: ElevenLabsService;
  selectedVoiceId: string;
}

export function InterviewSession({ elevenLabsService, selectedVoiceId }: InterviewSessionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [currentSequence, setCurrentSequence] = useState<QuestionSequence>();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);

  useEffect(() => {
    initializeSession();
  }, []);

  async function createSampleQuestions() {
    const sampleQuestions = [
      {
        text: 'Tell me about yourself and your background in software development.',
        type: 'behavioral' as const,
        difficulty: 'easy' as const,
        category: 'introduction',
        expectedDuration: 180,
        tags: ['introduction', 'background'],
      },
      {
        text: 'What is your experience with React and TypeScript?',
        type: 'technical' as const,
        difficulty: 'medium' as const,
        category: 'technical',
        expectedDuration: 240,
        tags: ['react', 'typescript', 'frontend'],
      },
      {
        text: 'Describe a challenging project you worked on and how you overcame obstacles.',
        type: 'behavioral' as const,
        difficulty: 'medium' as const,
        category: 'experience',
        expectedDuration: 300,
        tags: ['problem-solving', 'teamwork'],
      },
    ];

    const questions: Question[] = [];
    for (const question of sampleQuestions) {
      try {
        const newQuestion = await questionService.addQuestion(question);
        questions.push(newQuestion);
      } catch (error) {
        console.error('Error adding sample question:', error);
      }
    }
    return questions;
  }

  async function initializeSession() {
    try {
      setIsLoading(true);
      setError(undefined);

      // First, get all available questions
      let questions = await questionService.getAllQuestions();
      
      // If no questions exist, create some sample questions
      if (questions.length === 0) {
        questions = await createSampleQuestions();
        if (questions.length === 0) {
          throw new Error('Failed to create sample questions. Please try again or add questions manually.');
        }
      }

      // Create a default sequence with all questions
      const sequence = await questionService.createSequence({
        name: 'Default Interview Session',
        description: 'A default interview session with all available questions',
        questions,
        difficulty: 'medium', // Default difficulty
        totalDuration: questions.reduce((total, q) => total + q.expectedDuration, 0),
        categories: Array.from(new Set(questions.map(q => q.category))),
        tags: Array.from(new Set(questions.flatMap(q => q.tags))),
      });

      setCurrentSequence(sequence);
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error('Error initializing session:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize interview session');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNextQuestion() {
    if (!currentSequence) return;
    
    if (currentQuestionIndex < currentSequence.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }

  async function handleStartAnswering() {
    setIsAnswering(true);
    // TODO: Start recording
  }

  async function handleStopAnswering() {
    setIsAnswering(false);
    // TODO: Stop recording and process answer
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-red-500">
            <p>{error}</p>
            <Button onClick={initializeSession} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentSequence || currentSequence.questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center">
            <p>No questions available. Please add some questions first.</p>
            <Button onClick={initializeSession} className="mt-4">
              Create Sample Questions
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = currentSequence.questions[currentQuestionIndex];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Question {currentQuestionIndex + 1} of {currentSequence.questions.length}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-lg">{currentQuestion.text}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{currentQuestion.type}</span>
              <span>•</span>
              <span>{currentQuestion.category}</span>
              <span>•</span>
              <span>{Math.round(currentQuestion.expectedDuration / 60)} min</span>
            </div>
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === currentSequence.questions.length - 1}
              >
                Next Question
              </Button>
              <Button
                onClick={isAnswering ? handleStopAnswering : handleStartAnswering}
                variant={isAnswering ? "destructive" : "default"}
              >
                {isAnswering ? "Stop Recording" : "Start Recording"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 