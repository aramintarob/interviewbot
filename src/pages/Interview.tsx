import { useState } from 'react';
import { AudioSetup } from '@/components/audio/AudioSetup';
import { VoiceSelector } from '@/components/audio/VoiceSelector';
import { ElevenLabsService } from '@/services/elevenLabsService';
import { InterviewSession } from '@/components/interview/InterviewSession';

export function Interview() {
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

  if (!isAudioSetupComplete) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Interview Setup</h1>
        <div className="grid gap-6">
          <AudioSetup onComplete={handleAudioSetupComplete} />
          <VoiceSelector
            elevenLabsService={elevenLabsService}
            onVoiceSelected={handleVoiceSelected}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <InterviewSession
        elevenLabsService={elevenLabsService}
        selectedVoiceId={selectedVoiceId}
      />
    </div>
  );
} 