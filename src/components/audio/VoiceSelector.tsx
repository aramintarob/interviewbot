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
      console.log('Available voices:', availableVoices.map(v => ({
        name: v.name,
        id: v.voice_id,
        category: v.category
      })));
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
      console.log('Fetching preview for voice:', selectedVoice);
      const previewAudio = await elevenLabsService.previewVoice(selectedVoice);
      console.log('Preview audio received, length:', previewAudio.byteLength);
      
      await ElevenLabsService.playAudioBuffer(
        previewAudio,
        () => {
          console.log('Audio playback started');
          setIsPlaying(true);
        },
        () => {
          console.log('Audio playback completed');
          setIsPlaying(false);
        },
        (error: Error) => {
          console.error('Detailed playback error:', error);
          setError(`Failed to play voice preview: ${error.message}`);
          setIsPlaying(false);
        }
      );
    } catch (err) {
      console.error('Error in playVoicePreview:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to play voice preview';
      // Make error message more user-friendly
      const userMessage = errorMessage.includes('not available for your subscription tier')
        ? 'This voice is not available on your current subscription plan. Please choose a different voice or upgrade your plan.'
        : errorMessage;
      setError(userMessage);
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