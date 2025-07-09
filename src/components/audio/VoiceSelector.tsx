'use client';

import { useState, useEffect } from 'react';
import { ElevenLabsService } from '../../services/elevenLabsService';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  category: string;
}

interface VoiceSelectorProps {
  elevenLabsService: ElevenLabsService;
  onVoiceSelected: (voiceId: string) => void;
  className?: string;
}

export function VoiceSelector({
  elevenLabsService,
  onVoiceSelected,
  className = '',
}: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadVoices();
  }, []);

  async function loadVoices() {
    try {
      setIsLoading(true);
      setError('');
      const availableVoices = await elevenLabsService.getVoices();
      setVoices(availableVoices);
      
      // Set default voice
      const defaultVoice = await elevenLabsService.getDefaultVoice();
      setSelectedVoice(defaultVoice.voice_id);
      onVoiceSelected(defaultVoice.voice_id);
    } catch (err) {
      setError('Failed to load voices. Please check your API key and try again.');
      console.error('Error loading voices:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVoiceChange(voiceId: string) {
    setSelectedVoice(voiceId);
    onVoiceSelected(voiceId);
  }

  async function playVoicePreview() {
    if (!selectedVoice || isPlaying) return;

    try {
      setIsPlaying(true);
      setError('');
      const previewAudio = await elevenLabsService.previewVoice(selectedVoice);
      
      await ElevenLabsService.playAudioBuffer(
        previewAudio,
        () => setIsPlaying(true),
        () => setIsPlaying(false),
        (error: Error) => {
          console.error('Error playing preview:', error);
          setError('Failed to play voice preview');
          setIsPlaying(false);
        }
      );
    } catch (err) {
      console.error('Error playing voice preview:', err);
      setError('Failed to play voice preview');
      setIsPlaying(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <h3 className="text-lg font-medium">Voice Selection</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label htmlFor="voice-select" className="text-sm font-medium">
            Select Voice
          </label>
          <Select
            value={selectedVoice}
            onValueChange={handleVoiceChange}
          >
            <SelectTrigger id="voice-select">
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.voice_id} value={voice.voice_id}>
                  {voice.name} ({voice.category})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-between items-center">
          <Button
            onClick={playVoicePreview}
            disabled={!selectedVoice || isPlaying}
            className={cn(
              "bg-secondary hover:bg-secondary/90",
              isPlaying && "opacity-50 cursor-not-allowed"
            )}
          >
            {isPlaying ? (
              <LoadingSpinner className="w-4 h-4 mr-2" />
            ) : (
              <span className="mr-2">🔊</span>
            )}
            Preview Voice
          </Button>
        </div>

        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
      </CardContent>
    </Card>
  );
} 