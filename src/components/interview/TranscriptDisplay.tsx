import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TranscriptDisplayProps {
  currentQuestion?: string;
  className?: string;
}

export function TranscriptDisplay({ 
  currentQuestion = '',
  className = '' 
}: TranscriptDisplayProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Handle manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!transcriptRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = transcriptRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    setShouldAutoScroll(isAtBottom);
  };

  return (
    <Card className={`${className} bg-white/90 backdrop-blur-sm`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Current Question</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={transcriptRef}
          onScroll={handleScroll}
          className="h-[400px] overflow-y-auto space-y-2 text-sm font-mono"
        >
          {/* Current question */}
          {currentQuestion ? (
            <p className="text-blue-600 font-medium border-l-4 border-blue-600 pl-2">
              Interviewer: {currentQuestion}
            </p>
          ) : (
            <p className="text-gray-400 text-center">
              Questions will appear here during the interview
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 