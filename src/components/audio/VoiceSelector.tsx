'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ElevenLabsService } from '@/services/elevenLabsService';

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
      const elevenLabsService = new ElevenLabsService();
      const availableVoices = await elevenLabsService.getVoices();
      setVoices(availableVoices);
      
      // Auto-select the first voice if none is selected
      if (!selectedVoiceId && availableVoices.length > 0) {
        onVoiceSelect(availableVoices[0].voice_id);
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
        <CardTitle>Select Voice</CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={selectedVoiceId} onValueChange={onVoiceSelect}>
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