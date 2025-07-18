import { useState, useRef, useEffect } from 'react';
import { Mic, PauseCircle, PlayCircle, StopCircle } from 'lucide-react';
import { TranscriptDisplay } from './TranscriptDisplay';
import { InterviewStorageService } from '@/services/interviewStorageService';
import { ConversationService } from '@/services/conversationService';
import { v4 as uuidv4 } from 'uuid';
import { QuestionSequence, InterviewSession as IInterviewSession, Question } from '@/types/questions';

interface InterviewSessionProps {
  isTestMode?: boolean;
}

export function InterviewSession({ isTestMode = false }: InterviewSessionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [pastQuestions, setPastQuestions] = useState<string[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [visualizationData, setVisualizationData] = useState({
    volume: 0,
    frequency: new Uint8Array()
  });
  const [reconnecting, setReconnecting] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());

  const conversationRef = useRef<ConversationService | null>(null);
  const messageBufferRef = useRef<string>('');
  const storageServiceRef = useRef<InterviewStorageService | null>(null);

  // Initialize storage service
  useEffect(() => {
    storageServiceRef.current = new InterviewStorageService();
  }, []);

  // Add question to history when it changes
  useEffect(() => {
    if (currentQuestion && !pastQuestions.includes(currentQuestion)) {
      setPastQuestions(prev => [...prev, currentQuestion]);
    }
  }, [currentQuestion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endConversation().catch(console.error);
        conversationRef.current = null;
      }
    };
  }, []);

  async function handleStartSession() {
    try {
      setIsLoading(true);
      setError(undefined);
      messageBufferRef.current = '';
      setSessionStartTime(Date.now());

      // Clean up any existing conversation
      if (conversationRef.current) {
        await conversationRef.current.endConversation();
        conversationRef.current = null;
      }

      // Initialize new conversation
      const conversation = new ConversationService({
        onConnect: () => {
          setIsSessionActive(true);
          setIsLoading(false);
        },
        onError: (error) => {
          console.error('Session error:', error);
          const errorMessage = typeof error === 'string' ? error : error.message;
          // Only show error and reset if it's fatal
          if (errorMessage.includes('fatal') || errorMessage.includes('timeout')) {
            setError(errorMessage);
            setIsSessionActive(false);
            setIsLoading(false);
            setCurrentQuestion('');
            setReconnecting(false);
            if (conversationRef.current) {
              conversationRef.current.endConversation().catch(console.error);
              conversationRef.current = null;
            }
          }
        },
        onMessage: (message) => {
          console.log('Message received in InterviewSession:', message);
          // Process messages for questions when the agent is speaking
          if (isAsking) {
            processMessage(message.message);
          }
        },
        onModeChange: (mode) => {
          console.log('Mode change in InterviewSession:', mode);
          const isSpeaking = mode.mode === 'speaking';
          setIsAsking(isSpeaking);
          
          // Clear message buffer when agent stops speaking
          if (!isSpeaking) {
            messageBufferRef.current = '';
          }
        },
        onVisualizationData: (data) => {
          setVisualizationData({
            volume: data.inputVolume,
            frequency: data.inputFrequency
          });
        }
      });

      await conversation.initialize();
      conversationRef.current = conversation;
      
      console.log('Conversation initialized successfully');
    } catch (error) {
      console.error('Error starting session:', error);
      setError('Failed to start session');
      setIsLoading(false);
    }
  }

  async function handleEndSession() {
    try {
      setIsLoading(true);

      // End the conversation and get the audio blob
      if (conversationRef.current) {
        const result = await conversationRef.current.endConversation();

        // Save interview assets if we have audio
        if (result && storageServiceRef.current) {
          const timestamp = new Date().toISOString();
          const questions: Question[] = pastQuestions.map(q => ({
            id: uuidv4(),
            text: q,
            created_at: timestamp,
            updated_at: timestamp
          }));

          const sequence: QuestionSequence = {
            id: uuidv4(),
            name: 'Interview Questions',
            created_at: timestamp,
            updated_at: timestamp,
            questions
          };

          const session: IInterviewSession = {
            id: uuidv4(),
            candidateName: 'Test Candidate',
            startTime: sessionStartTime,
            endTime: Date.now(),
            currentQuestionIndex: pastQuestions.length,
            sequence,
            responses: [],
            status: 'completed'
          };

          await storageServiceRef.current.saveInterviewAssets(
            session,
            result.audio,
            result.transcript
          );
        }

        conversationRef.current = null;
      }

      // Reset state
      setIsSessionActive(false);
      setCurrentQuestion('');
      setPastQuestions([]);
      setIsAsking(false);
    } catch (error) {
      console.error('Error ending session:', error);
      setError('Failed to end session');
    } finally {
      setIsLoading(false);
    }
}

  async function handlePauseResume() {
    try {
      if (!conversationRef.current) return;

      if (isPaused) {
        await conversationRef.current.resume();
      } else {
        await conversationRef.current.pause();
      }
      setIsPaused(!isPaused);
    } catch (error) {
      console.error('Error toggling pause/resume:', error);
      setError('Failed to pause/resume the interview');
    }
  }

  function processMessage(message: string) {
    messageBufferRef.current += message;
    setCurrentQuestion(messageBufferRef.current);
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Interview Session</h2>
        <div className="flex gap-2">
          {!isSessionActive ? (
            <button
              onClick={handleStartSession}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              <Mic className="w-5 h-5" />
              Start
            </button>
          ) : (
            <>
              <button
                onClick={handlePauseResume}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
              >
                {isPaused ? (
                  <PlayCircle className="w-5 h-5" />
                ) : (
                  <PauseCircle className="w-5 h-5" />
                )}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={handleEndSession}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                <StopCircle className="w-5 h-5" />
                End
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Status</h3>
          <div className="flex flex-col gap-1">
            <p>Connection: {isSessionActive ? 'Active' : 'Inactive'}</p>
            <p>Mode: {isAsking ? 'Speaking' : 'Listening'}</p>
            {reconnecting && <p className="text-yellow-600">Reconnecting...</p>}
          </div>
        </div>

        <TranscriptDisplay
          currentQuestion={currentQuestion}
        />
      </div>
    </div>
  );
} 