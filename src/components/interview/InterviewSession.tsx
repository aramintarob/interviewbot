import { useState, useEffect, useRef } from 'react';
import { ConversationService } from '@/services/conversationService';
import { questionService } from '@/services/questionService';
import { Question } from '@/types/questions';
import { Button } from '@/components/ui/button';
import { VolumeVisualizer } from '@/components/audio/VolumeVisualizer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Mic, PauseCircle, PlayCircle, StopCircle } from 'lucide-react';

interface InterviewSessionProps {
  isTestMode?: boolean;
}

function QuestionsList({ questions }: { questions: Question[] }) {
  return (
    <div className="space-y-4 p-4">
      {questions.map((question, index) => (
        <div key={question.id} className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-sm">
          <div className="flex items-start gap-4">
            <span className="text-sm font-medium text-muted-foreground">
              {index + 1}.
            </span>
            <div className="flex-1">
              <p className="font-medium">{question.text}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InterviewSession({ isTestMode = false }: InterviewSessionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [visualizationData, setVisualizationData] = useState({
    volume: 0,
    frequency: new Uint8Array()
  });

  const conversationRef = useRef<ConversationService | null>(null);

  useEffect(() => {
    initializeSession();
    return () => {
      conversationRef.current?.endConversation().catch(console.error);
    };
  }, []);

  async function createSampleQuestions() {
    const sampleQuestions = [
      { text: 'Tell me about yourself and your background in software development.' },
      { text: 'What is your experience with React and TypeScript?' },
      { text: 'Describe a challenging project you worked on and how you overcame obstacles.' }
    ];

    const createdQuestions: Question[] = [];
    for (const question of sampleQuestions) {
      try {
        const newQuestion = await questionService.addQuestion(question);
        createdQuestions.push(newQuestion);
      } catch (error) {
        console.error('Error adding sample question:', error);
      }
    }

    if (createdQuestions.length === 0) {
      throw new Error('Failed to create sample questions. Please try again.');
    }

    return createdQuestions;
  }

  async function initializeSession() {
    try {
      setIsLoading(true);
      setError(undefined);
      
      let loadedQuestions: Question[] = [];
      
      if (isTestMode) {
        // In test mode, always use sample questions
        loadedQuestions = await createSampleQuestions();
      } else {
        // In regular mode, try to get existing questions first
        loadedQuestions = await questionService.getAllQuestions();
        
        // If no questions exist, create samples
        if (loadedQuestions.length === 0) {
          loadedQuestions = await createSampleQuestions();
        }
      }

      setQuestions(loadedQuestions);
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error('Error initializing session:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize interview session');
    } finally {
      setIsLoading(false);
    }
  }

  async function askCurrentQuestion() {
    if (!questions.length || !conversationRef.current) return;
    
    const question = questions[currentQuestionIndex];
    setIsAsking(true);
    
    try {
      console.log('Asking question:', question.text);
      // The SDK will handle audio playback internally
      await conversationRef.current.initialize();
    } catch (error) {
      console.error('Error asking question:', error);
      setError('Failed to ask question. Please try again.');
      setIsAsking(false);
    }
  }

  async function handleNextQuestion() {
    if (!questions.length) return;
    
    if (currentQuestionIndex < (questions.length - 1)) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeout(askCurrentQuestion, 1000);
    } else if (isSessionActive) {
      await handleEndSession();
    }
  }

  async function handleStartSession() {
    try {
      // Initialize the conversation service with callbacks
      const conversation = new ConversationService({
        onConnect: () => {
          setIsSessionActive(true);
          setIsPaused(false);
        },
        onDisconnect: () => {
          setIsSessionActive(false);
          setIsPaused(false);
        },
        onError: (error) => {
          setError(error.message);
          setIsSessionActive(false);
        },
        onMessage: (message) => {
          console.log('Received message:', message);
        },
        onModeChange: (mode) => {
          setIsAsking(mode === 'speaking');
        },
        onVisualizationData: (data) => {
          setVisualizationData({
            volume: data.inputVolume,
            frequency: data.inputFrequency
          });
        }
      });

      conversationRef.current = conversation;
      await askCurrentQuestion();
    } catch (error) {
      console.error('Error starting session:', error);
      setError('Failed to start session. Please check your microphone permissions and try again.');
      setIsSessionActive(false);
    }
  }

  async function handlePauseSession() {
    if (!conversationRef.current) return;

    try {
      if (isPaused) {
        setIsPaused(false);
        await conversationRef.current.initialize();
      } else {
        setIsPaused(true);
        await conversationRef.current.endConversation();
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
      setError('Failed to pause/resume session');
    }
  }

  async function handleEndSession() {
    try {
      if (conversationRef.current) {
        await conversationRef.current.endConversation();
      }
      setIsSessionActive(false);
      setIsPaused(false);
    } catch (error) {
      console.error('Error ending session:', error);
      setError('Failed to end session properly.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={initializeSession} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center">
        <p className="mb-4">No questions available. Please add some questions first.</p>
        <Button onClick={initializeSession} size="sm">
          Create Sample Questions
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] relative">
      {/* Circular Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-teal-100 rounded-full transform -rotate-45 opacity-50 pointer-events-none" />
      
      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto p-8">
        <div className="relative">
          {/* Audio Visualizer */}
          <div className="flex items-center justify-center">
            <VolumeVisualizer data={visualizationData} />
          </div>

          {/* Center Button or Controls */}
          <div className="absolute inset-0 flex items-center justify-center">
            {!isSessionActive ? (
              <Button
                onClick={handleStartSession}
                size="lg"
                className="rounded-full w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              >
                <Mic className="h-6 w-6" />
              </Button>
            ) : (
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handlePauseSession}
                  size="lg"
                  className="rounded-full w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                >
                  {isPaused ? <PlayCircle className="h-6 w-6" /> : <PauseCircle className="h-6 w-6" />}
                </Button>
                <Button
                  onClick={handleEndSession}
                  size="lg"
                  className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700 text-white shadow-lg"
                >
                  <StopCircle className="h-6 w-6" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Current Question Display */}
        <div className="mt-8 w-full">
          <h3 className="text-lg font-semibold mb-2">Current Question</h3>
          {questions[currentQuestionIndex] && (
            <p className="text-gray-700">{questions[currentQuestionIndex].text}</p>
          )}
        </div>

        {/* Questions List */}
        <div className="mt-8 w-full">
          <h3 className="text-lg font-semibold mb-2">All Questions</h3>
          <QuestionsList questions={questions} />
        </div>
      </div>
    </div>
  );
} 