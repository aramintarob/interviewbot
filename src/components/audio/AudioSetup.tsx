import { useState, useEffect, useRef } from 'react';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { VolumeVisualizer } from './VolumeVisualizer';
import type { AudioVisualizationData } from '../../services/audioService';

interface AudioSetupProps {
  onComplete: () => void;
}

export function AudioSetup({ onComplete }: AudioSetupProps) {
  // Audio recording state
  const [testRecording, setTestRecording] = useState<Blob | null>(null);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [setupStep, setSetupStep] = useState<'testing' | 'recording' | 'playback' | 'complete'>('testing');
  const [visualizationData, setVisualizationData] = useState<AudioVisualizationData>({
    volume: 0,
    frequency: new Float32Array()
  });

  // Audio element for playback
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initialize audio recording hook
  const {
    isInitialized,
    isRecording,
    isPaused,
    error,
    volume,
    startRecording,
    stopRecording,
    testMicrophone
  } = useAudioRecording({
    onVisualizationData: setVisualizationData
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      // onError(error); // This line was removed as per the new_code
    }
  }, [error]); // Removed onError from dependency array

  // Microphone test effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (setupStep === 'testing' && isInitialized) {
      intervalId = setInterval(async () => {
        const result = await testMicrophone();
        if (result.volume > 0.01) {
          // If we detect sound, move to recording step
          setSetupStep('recording');
        }
      }, 100);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [setupStep, isInitialized, testMicrophone]);

  // Handle test recording
  const handleStartTestRecording = async () => {
    try {
      await startRecording();
    } catch (err) {
      // onError(err instanceof Error ? err.message : 'Failed to start recording'); // This line was removed as per the new_code
    }
  };

  const handleStopTestRecording = async () => {
    try {
      const blob = await stopRecording();
      setTestRecording(blob);
      setSetupStep('playback');
    } catch (err) {
      // onError(err instanceof Error ? err.message : 'Failed to stop recording'); // This line was removed as per the new_code
    }
  };

  // Handle playback
  const handlePlayRecording = () => {
    if (audioRef.current && testRecording) {
      const url = URL.createObjectURL(testRecording);
      audioRef.current.src = url;
      audioRef.current.play();
      setIsPlayingBack(true);
    }
  };

  const handlePlaybackEnded = () => {
    setIsPlayingBack(false);
    if (audioRef.current) {
      URL.revokeObjectURL(audioRef.current.src);
    }
  };

  const handleConfirmAudio = () => {
    setSetupStep('complete');
    onComplete();
  };

  const handleRetryRecording = () => {
    setTestRecording(null);
    setSetupStep('recording');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex justify-between mb-8">
        {['testing', 'recording', 'playback', 'complete'].map((step) => (
          <div
            key={step}
            className={`flex items-center ${
              setupStep === step ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                setupStep === step
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300'
              }`}
            >
              {setupStep === step ? '✓' : ''}
            </div>
            <span className="ml-2 capitalize">{step}</span>
          </div>
        ))}
      </div>

      {/* Microphone Testing */}
      {setupStep === 'testing' && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Testing Microphone</h3>
          <p className="text-gray-600 mb-4">
            Please speak into your microphone. We'll detect when it's working.
          </p>
          <VolumeVisualizer data={visualizationData} />
          <div className="mt-4 text-sm text-gray-500">
            {isInitialized ? 'Listening for audio...' : 'Initializing microphone...'}
          </div>
        </div>
      )}

      {/* Recording Test */}
      {setupStep === 'recording' && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Test Recording</h3>
          <p className="text-gray-600 mb-4">
            Let's record a quick test to verify everything is working properly.
          </p>
          <VolumeVisualizer data={visualizationData} />
          <div className="mt-6 flex justify-center">
            {!isRecording ? (
              <button
                onClick={handleStartTestRecording}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Start Test Recording
              </button>
            ) : (
              <button
                onClick={handleStopTestRecording}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Stop Recording
              </button>
            )}
          </div>
        </div>
      )}

      {/* Playback Verification */}
      {setupStep === 'playback' && testRecording && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Verify Recording</h3>
          <p className="text-gray-600 mb-4">
            Listen to your test recording to make sure everything sounds correct.
          </p>
          <audio ref={audioRef} onEnded={handlePlaybackEnded} className="hidden" />
          <div className="flex justify-center space-x-4">
            <button
              onClick={handlePlayRecording}
              disabled={isPlayingBack}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {isPlayingBack ? 'Playing...' : 'Play Recording'}
            </button>
            <button
              onClick={handleRetryRecording}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Record Again
            </button>
            <button
              onClick={handleConfirmAudio}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              Sounds Good
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 