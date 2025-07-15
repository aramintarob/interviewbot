import { useState, useEffect, useRef } from 'react';
import { ConversationService } from '../../services/conversationService';
import { VolumeVisualizer } from './VolumeVisualizer';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface AudioSetupProps {
  onComplete: () => void;
}

export function AudioSetup({ onComplete }: AudioSetupProps) {
  const [setupStep, setSetupStep] = useState<'testing' | 'recording' | 'playback' | 'complete'>('testing');
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [visualizationData, setVisualizationData] = useState({
    volume: 0,
    frequency: new Uint8Array()
  });
  const [volume, setVolume] = useState(1.0);

  const conversationRef = useRef<ConversationService | null>(null);

  useEffect(() => {
    // Initialize the conversation service
    const conversation = new ConversationService({
      onConnect: () => {
        setIsInitialized(true);
      },
      onError: (error) => {
        setError(error);
      },
      onVisualizationData: (data) => {
        setVisualizationData({
          volume: data.inputVolume,
          frequency: data.inputFrequency
        });
      }
    });

    conversationRef.current = conversation;

    // Initialize the service
    conversation.initialize().catch(setError);

    return () => {
      conversation.endConversation().catch(console.error);
    };
  }, []);

  // Handle volume changes
  const handleVolumeChange = async (value: number) => {
    if (!conversationRef.current) return;
    
    try {
      await conversationRef.current.setVolume(value);
      setVolume(value);
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  };

  // Microphone test effect
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (setupStep === 'testing' && isInitialized) {
      timeoutId = setTimeout(() => {
        // If we've detected sound (volume > threshold), move to complete
        if (visualizationData.volume > 0.01) {
          setSetupStep('complete');
          onComplete();
        }
      }, 1000); // Give a second to verify the microphone is working
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [setupStep, isInitialized, visualizationData.volume, onComplete]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex justify-between mb-8">
        {['testing', 'complete'].map((step) => (
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error.message}</span>
        </div>
      )}

      {/* Microphone Testing */}
      {setupStep === 'testing' && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Testing Microphone</h3>
          <p className="text-gray-600 mb-4">
            Please speak into your microphone. We'll detect when it's working.
          </p>
          <VolumeVisualizer data={visualizationData} />
          
          {/* Volume Control */}
          <div className="mt-6">
            <Label htmlFor="volume" className="text-sm font-medium text-gray-700">
              Volume: {Math.round(volume * 100)}%
            </Label>
            <Slider
              id="volume"
              min={0}
              max={1}
              step={0.01}
              value={[volume]}
              onValueChange={(values: number[]) => handleVolumeChange(values[0])}
              className="mt-2"
            />
          </div>

          <div className="mt-4 text-sm text-gray-500">
            {isInitialized ? 'Listening for audio...' : 'Initializing microphone...'}
          </div>
        </div>
      )}
    </div>
  );
} 