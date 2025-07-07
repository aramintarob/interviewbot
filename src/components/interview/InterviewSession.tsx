import { useState, useEffect, useRef } from 'react';
import { AudioService } from '../../services/audioService';
import { ElevenLabsService } from '../../services/elevenLabsService';

interface Question {
  id: string;
  text: string;
  type: 'main' | 'followup' | 'branch';
}

interface InterviewSessionProps {
  questions: Question[];
  onComplete: (audioBlob: Blob) => void;
}

export const InterviewSession: React.FC<InterviewSessionProps> = ({
  questions,
  onComplete,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioService = useRef(new AudioService());
  const elevenLabsService = useRef(new ElevenLabsService());

  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await audioService.current.initializeAudio();
      } catch (err) {
        setError('Failed to initialize audio. Please check your microphone permissions.');
      }
    };

    initializeAudio();

    return () => {
      audioService.current.cleanup();
    };
  }, []);

  const askQuestion = async (question: Question) => {
    try {
      const audioData = await elevenLabsService.current.textToSpeech(question.text);
      await ElevenLabsService.playAudio(audioData);
    } catch (err) {
      setError('Failed to synthesize speech');
    }
  };

  const handleStartRecording = async () => {
    try {
      audioService.current.startRecording();
      setIsRecording(true);
      await askQuestion(questions[currentQuestionIndex]);
    } catch (err) {
      setError('Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      const audioBlob = await audioService.current.stopRecording();
      setIsRecording(false);
      onComplete(audioBlob);
    } catch (err) {
      setError('Failed to stop recording');
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      audioService.current.resumeRecording();
    } else {
      audioService.current.pauseRecording();
    }
    setIsPaused(!isPaused);
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      await askQuestion(questions[currentQuestionIndex + 1]);
    }
  };

  if (error) {
    return (
      <div className="text-red-500 p-4 rounded-md bg-red-50">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">
          Question {currentQuestionIndex + 1} of {questions.length}
        </h2>
        <p className="text-gray-700 mb-4">{questions[currentQuestionIndex].text}</p>
        
        <div className="flex space-x-4">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className="btn btn-primary"
            >
              Start Recording
            </button>
          ) : (
            <>
              <button
                onClick={handlePauseResume}
                className="btn btn-secondary"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={handleStopRecording}
                className="btn btn-primary"
              >
                Stop Recording
              </button>
              <button
                onClick={handleNextQuestion}
                className="btn btn-secondary"
                disabled={currentQuestionIndex === questions.length - 1}
              >
                Next Question
              </button>
            </>
          )}
        </div>
      </div>

      {isRecording && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="h-2 bg-primary-100 rounded-full">
            <div className="h-2 bg-primary-500 rounded-full animate-pulse w-full" />
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            {isPaused ? 'Recording paused' : 'Recording in progress...'}
          </p>
        </div>
      )}
    </div>
  );
}; 