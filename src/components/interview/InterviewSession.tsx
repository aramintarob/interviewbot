import { useState, useEffect, useRef } from 'react';
import { ConversationService } from '@/services/conversationService';
import { questionService } from '@/services/questionService';
import { Question } from '@/types/questions';
import { Button } from '@/components/ui/button';
import { VolumeVisualizer } from '@/components/audio/VolumeVisualizer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Mic, PauseCircle, PlayCircle, StopCircle } from 'lucide-react';
import { TranscriptDisplay } from './TranscriptDisplay';

interface InterviewSessionProps {
  isTestMode?: boolean;
}

function QuestionsList({ questions, currentIndex }: { questions: Question[]; currentIndex: number }) {
  return (
    <div className="space-y-4 p-4">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{currentIndex + 1} of {questions.length}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-300" 
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions list */}
      {questions.map((question, index) => (
        <div 
          key={question.id} 
          className={`
            bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-sm
            transition-all duration-300
            ${index === currentIndex ? 'border-2 border-blue-500 bg-blue-50/80' : ''}
            ${index < currentIndex ? 'opacity-50' : ''}
          `}
        >
          <div className="flex items-start gap-4">
            <span className={`
              text-sm font-medium rounded-full w-6 h-6 flex items-center justify-center
              ${index === currentIndex ? 'bg-blue-500 text-white' : 
                index < currentIndex ? 'bg-green-500 text-white' : 
                'text-muted-foreground'}
            `}>
              {index + 1}
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
  const [transcript, setTranscript] = useState('');

  const conversationRef = useRef<ConversationService | null>(null);
  const messageBufferRef = useRef<string>('');

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

  // Function to process messages and identify questions
  const processMessage = (message: string) => {
    console.log('Processing message:', message);
    
    // Append to buffer
    messageBufferRef.current += message;

    // Look for question patterns
    if (messageBufferRef.current.includes('?') || 
        messageBufferRef.current.includes('.') || 
        messageBufferRef.current.includes('!')) {
      
      // Split by common sentence endings
      const sentences = messageBufferRef.current
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim());

      // Process all complete sentences
      if (sentences.length > 0) {
        const lastSentence = sentences[sentences.length - 1];
        const isLastComplete = /[.!?]$/.test(messageBufferRef.current.trim());

        // Update questions list with complete sentences
        sentences.forEach((sentence, index) => {
          // Skip the last sentence if it's incomplete
          if (index === sentences.length - 1 && !isLastComplete) {
            messageBufferRef.current = sentence;
            return;
          }

          // Add to questions if it looks like a question or statement
          if (sentence.includes('?') || sentence.length > 30) {
            setCurrentQuestion(sentence.trim());
          }
        });

        // Clear buffer if last sentence was complete
        if (isLastComplete) {
          messageBufferRef.current = '';
        }
      }
    }
  };

  async function handleStartSession() {
    // Prevent multiple starts
    if (isLoading || isSessionActive) {
      console.log('Session already starting or active');
      return;
    }

    try {
      setIsLoading(true);
      setError(undefined);
      setCurrentQuestion('');
      setReconnecting(false);
      setPastQuestions([]);
      setTranscript('');
      messageBufferRef.current = '';

      // Clean up any existing conversation
      if (conversationRef.current) {
        await conversationRef.current.endConversation();
        conversationRef.current = null;
      }

      // Initialize the conversation service with callbacks
      const conversation = new ConversationService({
        onConnect: () => {
          console.log('Session connected');
          setIsSessionActive(true);
          setIsPaused(false);
          setIsLoading(false);
          setReconnecting(false);
        },
        onDisconnect: () => {
          console.log('Session disconnected');
          if (!isSessionActive) return; // Ignore if we're not active
          
          setReconnecting(true);
          // Keep session active during reconnection attempts
          setTimeout(() => {
            // If still reconnecting after 10 seconds, show error
            if (reconnecting) {
              setError('Lost connection to interview session. Please try again.');
              setIsSessionActive(false);
              setIsPaused(false);
              setCurrentQuestion('');
              if (conversationRef.current) {
                conversationRef.current = null;
              }
            }
          }, 10000);
        },
        onError: (error) => {
          console.error('Session error:', error);
          // Only show error and reset if it's fatal
          if (error.message.includes('fatal') || error.message.includes('timeout')) {
            setError(error.message);
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
          console.log('Received message:', message);
          // Process messages for questions when the agent is speaking
          if (isAsking) {
            processMessage(message);
          }
          // Always update transcript regardless of who is speaking
          setTranscript(prev => {
            const speaker = isAsking ? 'Interviewer' : 'You';
            const newTranscript = prev ? `${prev}\n${speaker}: ${message}` : `${speaker}: ${message}`;
            console.log('Updated transcript:', newTranscript);
            return newTranscript;
          });
        },
        onModeChange: (mode) => {
          console.log('Mode changed:', mode);
          const isSpeaking = mode === 'speaking';
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

      conversationRef.current = conversation;
      
      console.log('Initializing conversation...');
      await conversation.initialize();
      console.log('Conversation initialized');
    } catch (error) {
      console.error('Error starting session:', error);
      setError(error instanceof Error ? error.message : 'Failed to start session. Please check your microphone permissions and try again.');
      setIsSessionActive(false);
      setIsLoading(false);
      setCurrentQuestion('');
      setReconnecting(false);
      if (conversationRef.current) {
        conversationRef.current = null;
      }
    }
  }

  async function handlePauseSession() {
    if (!conversationRef.current) return;

    try {
      if (isPaused) {
        setIsPaused(false);
        messageBufferRef.current = ''; // Clear buffer on resume
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
        conversationRef.current = null;
      }
      setIsSessionActive(false);
      setIsPaused(false);
      setCurrentQuestion('');
      messageBufferRef.current = '';
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
        <Button onClick={handleStartSession} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  function QuestionsList() {
    if (!isSessionActive && pastQuestions.length === 0) {
      return (
        <div className="text-center text-gray-500 mt-4">
          Questions will appear here during the interview
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {pastQuestions.map((question, index) => (
          <div
            key={index}
            className={`
              bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-sm
              transition-all duration-300
              ${question === currentQuestion ? 'border-2 border-blue-500 bg-blue-50/80' : ''}
              ${index < pastQuestions.length - 1 ? 'opacity-50' : ''}
            `}
          >
            <div className="flex items-start gap-4">
              <span className={`
                text-sm font-medium rounded-full w-6 h-6 flex items-center justify-center
                ${question === currentQuestion ? 'bg-blue-500 text-white' : 
                  index < pastQuestions.length - 1 ? 'bg-green-500 text-white' : 
                  'text-muted-foreground'}
              `}>
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium">{question}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] relative">
      {/* Circular Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-teal-100 rounded-full transform -rotate-45 opacity-50 pointer-events-none" />
      
      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto p-8">
        <div className="relative mb-8">
          {/* Audio Visualizer */}
          <div className="flex items-center justify-center">
            <VolumeVisualizer data={visualizationData} />
          </div>

          {/* Connection Status */}
          {reconnecting && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium">
              Reconnecting...
            </div>
          )}

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

        {/* Main Content Grid */}
        <div className="w-full mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Questions Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Interview Questions</h3>
            <QuestionsList />
          </div>

          {/* Transcript Section */}
          <TranscriptDisplay 
            transcript={transcript} 
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
} 