import { useState, useEffect, useRef } from 'react';
import { AudioService } from '../../services/audioService';

interface AudioSetupProps {
  onReady: () => void;
}

export const AudioSetup: React.FC<AudioSetupProps> = ({ onReady }) => {
  const [isTestRecording, setIsTestRecording] = useState(false);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  
  const audioService = useRef(new AudioService());
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const dataArray = useRef<Uint8Array | null>(null);
  const animationFrame = useRef<number>();

  useEffect(() => {
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      audioService.current.cleanup();
      if (testAudioUrl) {
        URL.revokeObjectURL(testAudioUrl);
      }
    };
  }, [testAudioUrl]);

  const initializeAudioAnalyser = async () => {
    try {
      await audioService.current.initializeAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContext.current = new AudioContext();
      analyser.current = audioContext.current.createAnalyser();
      const source = audioContext.current.createMediaStreamSource(stream);
      source.connect(analyser.current);
      
      analyser.current.fftSize = 256;
      const bufferLength = analyser.current.frequencyBinCount;
      dataArray.current = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (analyser.current && dataArray.current) {
          analyser.current.getByteFrequencyData(dataArray.current);
          const average = dataArray.current.reduce((a, b) => a + b) / dataArray.current.length;
          setVolume(average);
          animationFrame.current = requestAnimationFrame(updateVolume);
        }
      };
      
      updateVolume();
    } catch (err) {
      setError('Failed to initialize audio. Please check your microphone permissions.');
    }
  };

  const startTestRecording = async () => {
    try {
      setIsTestRecording(true);
      audioService.current.startRecording();
    } catch (err) {
      setError('Failed to start recording');
    }
  };

  const stopTestRecording = async () => {
    try {
      const audioBlob = await audioService.current.stopRecording();
      setIsTestRecording(false);
      const url = URL.createObjectURL(audioBlob);
      if (testAudioUrl) {
        URL.revokeObjectURL(testAudioUrl);
      }
      setTestAudioUrl(url);
    } catch (err) {
      setError('Failed to stop recording');
    }
  };

  if (error) {
    return (
      <div className="text-red-500 p-4 rounded-md bg-red-50">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold">Audio Setup</h2>
      
      <div className="space-y-4">
        <button
          onClick={initializeAudioAnalyser}
          className="btn btn-primary"
        >
          Initialize Microphone
        </button>

        {volume > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Microphone Level:</p>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-primary-500 rounded-full transition-all duration-100"
                style={{ width: `${Math.min(100, (volume / 256) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {volume > 0 && !testAudioUrl && (
          <div className="space-x-4">
            <button
              onClick={startTestRecording}
              className="btn btn-secondary"
              disabled={isTestRecording}
            >
              Record Test
            </button>
            {isTestRecording && (
              <button
                onClick={stopTestRecording}
                className="btn btn-primary"
              >
                Stop Test
              </button>
            )}
          </div>
        )}

        {testAudioUrl && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Test Recording:</p>
            <audio controls src={testAudioUrl} className="w-full" />
            <div className="space-x-4">
              <button
                onClick={() => setTestAudioUrl(null)}
                className="btn btn-secondary"
              >
                Record Again
              </button>
              <button
                onClick={onReady}
                className="btn btn-primary"
              >
                Start Interview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 