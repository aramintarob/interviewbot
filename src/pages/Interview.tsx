import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InterviewSession } from '@/components/interview/InterviewSession';
import { QuestionManager } from '@/components/interview/QuestionManager';
import { ElevenLabsService } from '@/services/elevenLabsService';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Interview() {
  const [searchParams] = useSearchParams();
  const isTestMode = searchParams.get('mode') === 'test';
  const elevenLabsService = new ElevenLabsService();

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

      <Tabs defaultValue="session" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="session">Interview Session</TabsTrigger>
          <TabsTrigger value="questions">Question Manager</TabsTrigger>
        </TabsList>

        <TabsContent value="session" className="mt-6">
          <InterviewSession 
            elevenLabsService={elevenLabsService}
            isTestMode={isTestMode}
          />
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <QuestionManager />
        </TabsContent>
      </Tabs>
    </div>
  );
} 