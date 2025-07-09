import { useState, useEffect, useRef } from 'react';
import { ElevenLabsService } from '@/services/elevenLabsService';
import { StorageService } from '@/services/storageService';
import { AudioService } from '@/services/audioService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface InterviewSessionProps {
  elevenLabsService: ElevenLabsService;
  selectedVoiceId: string;
}

export function InterviewSession({
  elevenLabsService,
  selectedVoiceId,
}: InterviewSessionProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioService = useRef(new AudioService());
  const storageService = useRef(new StorageService());

  // Mock questions for now - will be replaced with actual API integration
  const questions = [
    "Tell me about your experience with React.",
    "What are your thoughts on TypeScript?",
    "How do you handle state management in your applications?",
  ];

  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await audioService.current.initializeAudio();
      } catch (err) {
        console.error('Failed to initialize audio:', err);
        setError('Failed to initialize audio. Please check your microphone permissions.');
      }
    };

    initializeAudio();
    return () => {
      audioService.current.cleanup();
    };
  }, []);

  const startInterview = async () => {
    try {
      setIsStarted(true);
      await speakQuestion(questions[0]);
      startRecording();
    } catch (err) {
      setError('Failed to start interview');
      console.error('Error starting interview:', err);
    }
  };

  const startRecording = async () => {
    try {
      await audioService.current.startRecording();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = async () => {
    try {
      const audioBlob = await audioService.current.stopRecording();
      setIsRecording(false);

      // Upload the recording
      // Note: In a real app, you'd get the userId from your auth system
      const tempUserId = 'test-user';
      const metadata = {
        questionIndex: currentQuestion,
        questionText: questions[currentQuestion],
        timestamp: new Date().toISOString(),
      };

      await storageService.current.uploadRecording(audioBlob, tempUserId, metadata);
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError('Failed to save recording');
    }
  };

  const speakQuestion = async (text: string) => {
    try {
      setIsProcessing(true);
      const audioStream = await elevenLabsService.textToSpeech(text);
      await ElevenLabsService.playAudioStream(
        audioStream,
        () => setIsProcessing(false),
        () => {
          console.log('Question finished playing');
        },
        (error) => {
          console.error('Error playing question:', error);
          setError('Failed to play question audio');
          setIsProcessing(false);
        }
      );
    } catch (err) {
      console.error('Error speaking question:', err);
      setError('Failed to speak question');
      setIsProcessing(false);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestion < questions.length - 1) {
      // Stop current recording
      await stopRecording();

      // Move to next question
      const nextQuestion = currentQuestion + 1;
      setCurrentQuestion(nextQuestion);

      // Speak next question and start new recording
      await speakQuestion(questions[nextQuestion]);
      startRecording();
    } else {
      // Interview complete
      await stopRecording();
      setIsStarted(false);
      // You might want to redirect or show a completion screen here
    }
  };

  if (!isStarted) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Begin</h2>
        <p className="mb-6">
          The interview will consist of {questions.length} questions. Your responses will be recorded.
        </p>
        <button
          onClick={startInterview}
          disabled={isProcessing}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isProcessing ? 'Starting...' : 'Start Interview'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Question {currentQuestion + 1}</h3>
        <p className="text-gray-700">{questions[currentQuestion]}</p>
        
        {isRecording && (
          <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
            <LoadingSpinner className="w-4 h-4 mr-2" />
            Recording in progress...
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={handleNextQuestion}
          disabled={currentQuestion >= questions.length - 1 || isProcessing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {currentQuestion >= questions.length - 1 ? 'Complete Interview' : 'Next Question'}
        </button>
      </div>
    </div>
  );
} 