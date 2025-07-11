import { useState, useEffect } from 'react';
import { ElevenLabsService } from '@/services/elevenLabsService';
import { questionService } from '@/services/questionService';
import { Question, QuestionSequence, NewQuestion, NewQuestionSequence } from '@/types/questions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { VolumeVisualizer } from '@/components/audio/VolumeVisualizer';
import { Badge } from '@/components/ui/badge';

interface InterviewSessionProps {
  elevenLabsService: ElevenLabsService;
  isTestMode?: boolean;
}

export function InterviewSession({ elevenLabsService, isTestMode = false }: InterviewSessionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [currentSequence, setCurrentSequence] = useState<QuestionSequence>();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const { startRecording, stopRecording, pauseRecording, resumeRecording, isRecording } = useAudioRecording();

  useEffect(() => {
    initializeSession();
    return () => {
      elevenLabsService.clearConversation();
    };
  }, []);

  async function createSampleQuestions() {
    const sampleQuestions: NewQuestion[] = [
      {
        text: 'Tell me about yourself and your background in software development.',
        type: 'behavioral' as const,
        difficulty: 'easy' as const,
        category: 'introduction',
        expected_duration: 180,
        tags: ['introduction', 'background'],
      },
      {
        text: 'What is your experience with React and TypeScript?',
        type: 'technical' as const,
        difficulty: 'medium' as const,
        category: 'technical',
        expected_duration: 240,
        tags: ['react', 'typescript', 'frontend'],
      },
      {
        text: 'Describe a challenging project you worked on and how you overcame obstacles.',
        type: 'behavioral' as const,
        difficulty: 'medium' as const,
        category: 'experience',
        expected_duration: 300,
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

      let questions: Question[] = [];
      
      if (isTestMode) {
        // In test mode, always use sample questions
        questions = await createSampleQuestions();
        if (questions.length === 0) {
          throw new Error('Failed to create sample questions. Please try again.');
        }
      } else {
        // In regular mode, try to get existing questions first
        questions = await questionService.getAllQuestions();
        
        // If no questions exist, create samples
        if (questions.length === 0) {
          questions = await createSampleQuestions();
          if (questions.length === 0) {
            throw new Error('Failed to create sample questions. Please try again or add questions manually.');
          }
        }
      }

      // Create a sequence with the questions
      const newSequence: NewQuestionSequence = {
        name: isTestMode ? 'Practice Interview Session' : 'Interview Session',
        description: isTestMode 
          ? 'A practice session with sample interview questions'
          : 'A default interview session with all available questions',
        questions,
        difficulty: 'medium',
        total_duration: questions.reduce((total, q) => total + q.expected_duration, 0),
        categories: Array.from(new Set(questions.map(q => q.category))),
        tags: Array.from(new Set(questions.flatMap(q => q.tags))),
      };

      const sequence = await questionService.createSequence(newSequence);
      setCurrentSequence(sequence);
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error('Error initializing session:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize interview session');
    } finally {
      setIsLoading(false);
    }
  }

  async function askCurrentQuestion() {
    if (!currentSequence) return;
    
    const question = currentSequence.questions[currentQuestionIndex];
    setIsAsking(true);
    
    try {
      // Use the chat endpoint instead of direct text-to-speech
      const audioBuffer = await elevenLabsService.sendMessage(question.text);
      await ElevenLabsService.playAudioBuffer(
        audioBuffer,
        () => console.log('Started speaking question'),
        () => setIsAsking(false),
        (error) => {
          console.error('Error playing audio:', error);
          setError('Failed to speak question. Please try again.');
          setIsAsking(false);
        }
      );
    } catch (error) {
      console.error('Error asking question:', error);
      setError('Failed to ask question. Please try again.');
      setIsAsking(false);
    }
  }

  async function handleNextQuestion() {
    if (!currentSequence) return;
    
    // Get the current question
    const currentQuestion = currentSequence.questions[currentQuestionIndex];
    
    // Check for branching logic based on the last response
    let nextQuestion = undefined;
    if (isRecording) {
      const lastResponse = await stopRecording();
      // Convert audio blob to text using your transcription service
      // For now, we'll use a placeholder response
      const responseText = "Yes, I have experience with that"; // TODO: Replace with actual transcription
      nextQuestion = await questionService.getNextQuestion(currentQuestion.id, responseText);
    }
    
    if (nextQuestion) {
      // Find the index of the next question in the sequence
      const nextIndex = currentSequence.questions.findIndex(q => q.id === nextQuestion?.id);
      if (nextIndex !== -1) {
        setCurrentQuestionIndex(nextIndex);
      } else {
        // If the next question isn't in the sequence, add it
        const updatedSequence = {
          ...currentSequence,
          questions: [...currentSequence.questions, nextQuestion],
        };
        setCurrentSequence(updatedSequence);
        setCurrentQuestionIndex(currentSequence.questions.length);
      }
    } else if (currentQuestionIndex < currentSequence.questions.length - 1) {
      // No branching or no conditions met, proceed to next question in sequence
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (isSessionActive) {
      // End the session if we're on the last question
      await handleEndSession();
    }

    // Ask the next question after a short delay
    setTimeout(askCurrentQuestion, 1000);
  }

  async function handleStartSession() {
    try {
      setIsSessionActive(true);
      setIsPaused(false);
      await startRecording();
      await askCurrentQuestion();
    } catch (error) {
      console.error('Error starting session:', error);
      setError('Failed to start session. Please check your microphone permissions and try again.');
      setIsSessionActive(false);
    }
  }

  async function handlePauseSession() {
    if (isPaused) {
      setIsPaused(false);
      await resumeRecording();
    } else {
      setIsPaused(true);
      await pauseRecording();
    }
  }

  async function handleEndSession() {
    try {
      setIsSessionActive(false);
      setIsPaused(false);
      const audioBlob = await stopRecording();
      // Clear the conversation history when the session ends
      elevenLabsService.clearConversation();
      // TODO: Process the recorded audio (save to storage, transcribe, etc.)
      console.log('Session recording completed:', audioBlob);
    } catch (error) {
      console.error('Error ending session:', error);
      setError('Failed to end session properly. Your recording might not be saved.');
    }
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
  const isLastQuestion = currentQuestionIndex === currentSequence.questions.length - 1;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isTestMode ? 'Practice Interview' : 'Interview Session'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {isSessionActive && (
              <>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-lg font-medium mb-2">Current Question:</p>
                  <p>{currentQuestion.text}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Badge variant={
                      currentQuestion.difficulty === 'hard' ? 'destructive' :
                      currentQuestion.difficulty === 'medium' ? 'default' :
                      'secondary'
                    }>
                      {currentQuestion.difficulty}
                    </Badge>
                    <span>•</span>
                    <span>{Math.round(currentQuestion.expected_duration / 60)} min</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <VolumeVisualizer isRecording={isRecording && !isPaused} />
                </div>

                <div className="flex justify-between items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={handleNextQuestion}
                    disabled={isAsking || isLastQuestion}
                  >
                    {isLastQuestion ? 'Last Question' : 'Next Question'}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handlePauseSession}
                      variant="outline"
                    >
                      {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button
                      onClick={handleEndSession}
                      variant="destructive"
                    >
                      End Session
                    </Button>
                  </div>
                </div>
              </>
            )}

            {!isSessionActive && (
              <div className="text-center">
                <Button
                  onClick={handleStartSession}
                  className="w-full"
                  disabled={isAsking}
                  size="lg"
                >
                  Start {isTestMode ? 'Practice' : ''} Session
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  {isTestMode 
                    ? "Click to begin your practice interview. This is a safe space to get comfortable with the format."
                    : "Click to begin your interview. The AI interviewer will ask you questions, and your responses will be recorded."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 