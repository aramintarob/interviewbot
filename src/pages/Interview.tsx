import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InterviewSession } from '@/components/interview/InterviewSession';
import { ElevenLabsService } from '@/services/elevenLabsService';
import { useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Interview() {
  const [searchParams] = useSearchParams();
  const isTestMode = searchParams.get('mode') === 'test';
  const [elevenLabsService, setElevenLabsService] = useState<ElevenLabsService>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    try {
      const service = new ElevenLabsService();
      setElevenLabsService(service);
    } catch (err) {
      console.error('Failed to initialize ElevenLabs service:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize voice service');
    }
  }, []);

  if (error) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center min-h-[200px] py-6">
            <div className="text-center text-red-500 space-y-4">
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!elevenLabsService) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center min-h-[200px] py-6">
            <LoadingSpinner className="h-8 w-8 mb-4" />
            <p className="text-sm text-muted-foreground">Initializing voice service...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      {isTestMode && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Practice Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You're in practice mode. This session will use sample questions to help you get comfortable with the interview format.
              Your responses will be recorded but not evaluated.
            </p>
          </CardContent>
        </Card>
      )}

      <InterviewSession 
        elevenLabsService={elevenLabsService}
        isTestMode={isTestMode}
      />
    </div>
  );
} 