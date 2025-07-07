import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { InterviewSession } from '../components/interview/InterviewSession';

interface Question {
  id: string;
  text: string;
  type: 'main' | 'followup' | 'branch';
}

const Interview = () => {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    // TODO: Replace with actual API call
    const fetchQuestions = async () => {
      try {
        // Simulated API response
        const mockQuestions: Question[] = [
          {
            id: '1',
            text: 'Tell me about your experience with React.',
            type: 'main',
          },
          {
            id: '2',
            text: 'What are your thoughts on TypeScript?',
            type: 'main',
          },
          {
            id: '3',
            text: 'How do you handle state management in your applications?',
            type: 'main',
          },
        ];

        setQuestions(mockQuestions);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load interview questions');
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [id]);

  const handleInterviewComplete = async (audioBlob: Blob) => {
    try {
      // TODO: Implement actual upload logic
      console.log('Interview completed, audio blob:', audioBlob);
      
      // Create a temporary download link for testing
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview-${id}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to save interview recording');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse-slow text-xl">Loading interview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Interview Session</h1>
      <InterviewSession
        questions={questions}
        onComplete={handleInterviewComplete}
      />
    </div>
  );
};

export default Interview; 