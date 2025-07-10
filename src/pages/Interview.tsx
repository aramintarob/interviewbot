import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InterviewSession } from '@/components/interview/InterviewSession';
import { QuestionManager } from '@/components/interview/QuestionManager';
import { AudioSetup } from '@/components/audio/AudioSetup';
import { VoiceSelector } from '@/components/audio/VoiceSelector';
import { ElevenLabsService } from '@/services/elevenLabsService';

export function Interview() {
  const [activeTab, setActiveTab] = useState('session');
  const [isAudioSetupComplete, setIsAudioSetupComplete] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [elevenLabsService] = useState(() => new ElevenLabsService());

  const handleAudioSetupComplete = () => {
    setIsAudioSetupComplete(true);
  };

  const handleVoiceSelected = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    elevenLabsService.setVoice(voiceId);
  };

  return (
    <div className="container mx-auto py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="session">Interview Session</TabsTrigger>
          <TabsTrigger value="questions">Question Manager</TabsTrigger>
        </TabsList>
        <TabsContent value="session" className="mt-6">
          {!isAudioSetupComplete ? (
            <div className="grid gap-6">
              <AudioSetup onComplete={handleAudioSetupComplete} />
              <VoiceSelector
                elevenLabsService={elevenLabsService}
                onVoiceSelected={handleVoiceSelected}
              />
            </div>
          ) : (
            <InterviewSession
              elevenLabsService={elevenLabsService}
              selectedVoiceId={selectedVoiceId}
            />
          )}
        </TabsContent>
        <TabsContent value="questions" className="mt-6">
          <QuestionManager />
        </TabsContent>
      </Tabs>
    </div>
  );
} 