import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TranscriptDisplayProps {
  transcript: string;
  className?: string;
}

export function TranscriptDisplay({ transcript, className = '' }: TranscriptDisplayProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <Card className={`${className} bg-white/90 backdrop-blur-sm`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Interview Transcript</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={transcriptRef}
          className="h-[200px] overflow-y-auto space-y-2 text-sm"
        >
          {transcript.split('\n').map((line, index) => (
            <p key={index} className="leading-relaxed">
              {line || <br />}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 