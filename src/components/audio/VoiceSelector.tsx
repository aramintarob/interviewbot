'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConversationService } from '@/services/conversationService';

interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  category: string;
}

export interface VoiceSelectorProps {
  selectedVoiceId: string;
  onVoiceSelect: (voiceId: string) => void;
}

export function VoiceSelector({ selectedVoiceId, onVoiceSelect }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadVoices();
  }, []);

  async function loadVoices() {
    try {
      setIsLoading(true);
      setError(undefined);
      
      // Note: The new SDK doesn't provide voice selection yet
      // We'll use the default voice for now
      const defaultVoice = {
        voice_id: import.meta.env.VITE_ELEVEN_LABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
        name: 'Default Voice',
        preview_url: '',
        category: 'default'
      };
      
      setVoices([defaultVoice]);
      
      // Auto-select the default voice
      if (!selectedVoiceId) {
        onVoiceSelect(defaultVoice.voice_id);
      }
    } catch (error) {
      console.error('Error loading voices:', error);
      setError('Failed to load available voices. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-red-500">
            <p>{error}</p>
            <button
              onClick={loadVoices}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Using default voice for the interview. Voice selection will be available in a future update.
        </p>
        <Select value={selectedVoiceId} onValueChange={onVoiceSelect} disabled>
          <SelectTrigger>
            <SelectValue placeholder="Select a voice" />
          </SelectTrigger>
          <SelectContent>
            {voices.map(voice => (
              <SelectItem key={voice.voice_id} value={voice.voice_id}>
                {voice.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
} 