import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InterviewSession } from '@/components/interview/InterviewSession';
import { useSearchParams } from 'react-router-dom';

export default function Interview() {
  const [searchParams] = useSearchParams();
  const isTestMode = searchParams.get('mode') === 'test';

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

      <InterviewSession isTestMode={isTestMode} />
    </div>
  );
} 