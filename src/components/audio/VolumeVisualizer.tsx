import { useEffect, useRef } from 'react';

export interface VolumeVisualizerProps {
  isRecording: boolean;
}

export function VolumeVisualizer({ isRecording }: VolumeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function setupAudioContext() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 256;
        source.connect(analyser);
        
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        
        if (isRecording) {
          startVisualization();
        }
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    }

    function startVisualization() {
      if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      function draw() {
        if (!analyserRef.current || !dataArrayRef.current || !ctx) return;
        
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
        
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        ctx.fillStyle = 'rgb(20, 20, 20)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        const barWidth = (WIDTH / dataArrayRef.current.length) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          barHeight = (dataArrayRef.current[i] / 255) * HEIGHT;
          
          const hue = (i / dataArrayRef.current.length) * 360;
          ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
          ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
          
          x += barWidth + 1;
        }
        
        animationFrameRef.current = requestAnimationFrame(draw);
      }

      draw();
    }

    function stopVisualization() {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    if (isRecording) {
      setupAudioContext();
    } else {
      stopVisualization();
    }

    return () => {
      stopVisualization();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={100}
      className="rounded-lg bg-background border"
    />
  );
} 