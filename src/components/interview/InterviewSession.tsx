import { useState, useEffect } from 'react';
import { ElevenLabsService } from '@/services/elevenLabsService';
import { questionService } from '@/services/questionService';
import { Question } from '@/types/questions';
import { Button } from '@/components/ui/button';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { VolumeVisualizer } from '@/components/audio/VolumeVisualizer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Mic, PauseCircle, PlayCircle, StopCircle } from 'lucide-react';

interface InterviewSessionProps {
  elevenLabsService: ElevenLabsService;
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

export function InterviewSession({ elevenLabsService, isTestMode = false }: InterviewSessionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [questions, setQuestions] = useState<Question[]>([]);
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
    if (!questions.length) return;
    
    const question = questions[currentQuestionIndex];
    setIsAsking(true);
    
    try {
      console.log('Asking question:', question.text);
      const audioBuffer = await elevenLabsService.sendMessage(question.text);
      console.log('Received audio buffer, playing...');
      
      await ElevenLabsService.playAudioBuffer(
        audioBuffer,
        () => {
          console.log('Started speaking question');
          setIsAsking(true);
        },
        () => {
          console.log('Finished speaking question');
          setIsAsking(false);
        },
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
    if (!questions.length) return;
    
    if (isRecording) {
      await stopRecording();
    }
    
    if (currentQuestionIndex < (questions.length - 1)) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeout(askCurrentQuestion, 1000);
    } else if (isSessionActive) {
      await handleEndSession();
    }
  }

  async function handleStartSession() {
    try {
      // Initialize audio context by playing a silent audio buffer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
      
      setIsSessionActive(true);
      setIsPaused(false);
      await startRecording();
      
      // Add a small delay to ensure audio context is properly initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
            <VolumeVisualizer isRecording={isRecording && !isPaused} />
          </div>

          {/* Center Button or Controls */}
          <div className="absolute inset-0 flex items-center justify-center">
            {!isSessionActive ? (
              <div className="flex flex-col items-center gap-8">
                <Button
                  onClick={handleStartSession}
                  className="bg-black text-white hover:bg-black/90 rounded-full px-8 py-6 text-lg font-medium flex items-center gap-2"
                  size="lg"
                  disabled={isAsking}
                >
                  <Mic className="h-5 w-5" />
                  Start Interview
                </Button>
                <p className="text-sm text-muted-foreground">
                  Powered by{' '}
                  <a
                    href="https://elevenlabs.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    ElevenLabs Conversational AI
                  </a>
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Button
                  onClick={handlePauseSession}
                  variant="outline"
                  size="lg"
                  className="rounded-full"
                  disabled={isAsking}
                >
                  {isPaused ? (
                    <PlayCircle className="h-6 w-6" />
                  ) : (
                    <PauseCircle className="h-6 w-6" />
                  )}
                </Button>
                <Button
                  onClick={handleEndSession}
                  variant="destructive"
                  size="lg"
                  className="rounded-full"
                  disabled={isAsking}
                >
                  <StopCircle className="h-6 w-6" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Question Display */}
        {questions.length > 0 && (
          <div className="mt-8 w-full">
            <div className="text-left mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-sm">
              <p className="text-lg font-medium">{questions[currentQuestionIndex].text}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 