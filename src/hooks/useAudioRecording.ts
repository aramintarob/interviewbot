import { useState, useEffect, useCallback } from 'react';
import { AudioService } from '../services/audioService';
import type { AudioVisualizationData, AudioFormat } from '../services/audioService';

interface UseAudioRecordingOptions {
  onVisualizationData?: (data: AudioVisualizationData) => void;
  format?: AudioFormat;
}

interface UseAudioRecordingReturn {
  isInitialized: boolean;
  isRecording: boolean;
  isPaused: boolean;
  error: string | null;
  volume: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  testMicrophone: () => Promise<{ connected: boolean; volume: number }>;
  convertFormat: (blob: Blob, targetFormat: AudioFormat) => Promise<Blob>;
}

export function useAudioRecording({
  onVisualizationData,
  format = 'audio/webm'
}: UseAudioRecordingOptions = {}): UseAudioRecordingReturn {
  const [audioService] = useState(() => new AudioService());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  // Initialize audio on mount
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        await audioService.initializeAudio();
        if (mounted) {
          setIsInitialized(true);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize audio');
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      audioService.cleanup();
    };
  }, [audioService]);

  // Start visualization if callback is provided
  useEffect(() => {
    if (isInitialized && onVisualizationData) {
      audioService.startVisualization((data) => {
        setVolume(data.volume);
        onVisualizationData(data);
      });

      return () => audioService.stopVisualization();
    }
  }, [isInitialized, onVisualizationData, audioService]);

  const startRecording = useCallback(async () => {
    try {
      audioService.startRecording(format);
      setIsRecording(true);
      setIsPaused(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      throw err;
    }
  }, [audioService, format]);

  const stopRecording = useCallback(async () => {
    try {
      const blob = await audioService.stopRecording();
      setIsRecording(false);
      setIsPaused(false);
      setError(null);
      return blob;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      throw err;
    }
  }, [audioService]);

  const pauseRecording = useCallback(() => {
    try {
      audioService.pauseRecording();
      setIsPaused(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause recording');
      throw err;
    }
  }, [audioService]);

  const resumeRecording = useCallback(() => {
    try {
      audioService.resumeRecording();
      setIsPaused(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume recording');
      throw err;
    }
  }, [audioService]);

  const testMicrophone = useCallback(() => {
    return audioService.testMicrophone();
  }, [audioService]);

  const convertFormat = useCallback((blob: Blob, targetFormat: AudioFormat) => {
    return audioService.convertFormat(blob, targetFormat);
  }, [audioService]);

  return {
    isInitialized,
    isRecording,
    isPaused,
    error,
    volume,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    testMicrophone,
    convertFormat
  };
} 