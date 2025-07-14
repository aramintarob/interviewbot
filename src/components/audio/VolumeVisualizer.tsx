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
        const centerX = WIDTH / 2;
        const centerY = HEIGHT / 2;
        const radius = Math.min(WIDTH, HEIGHT) / 2.5;
        
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        // Clear the canvas
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        
        // Draw circular visualizer
        const barCount = 180;
        const angleStep = (2 * Math.PI) / barCount;
        
        for (let i = 0; i < barCount; i++) {
          const angle = i * angleStep;
          
          // Get frequency value and normalize it
          const frequencyIndex = Math.floor((i / barCount) * dataArrayRef.current.length);
          const value = dataArrayRef.current[frequencyIndex];
          const normalizedValue = value / 255.0;
          
          // Calculate bar height based on frequency value
          const minHeight = radius * 0.75;
          const maxHeight = radius * 1.25;
          const barHeight = minHeight + (maxHeight - minHeight) * normalizedValue;
          
          // Calculate start and end points
          const startX = centerX + Math.cos(angle) * radius;
          const startY = centerY + Math.sin(angle) * radius;
          const endX = centerX + Math.cos(angle) * (radius + barHeight * 0.5);
          const endY = centerY + Math.sin(angle) * (radius + barHeight * 0.5);
          
          // Draw the bar
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          
          // Create gradient color based on frequency
          const hue = (i / barCount) * 360;
          ctx.strokeStyle = isRecording 
            ? `hsla(${hue}, 80%, 60%, ${normalizedValue})`
            : `hsla(200, 20%, 50%, 0.1)`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        
        // Draw inner circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.7, 0, 2 * Math.PI);
        ctx.strokeStyle = isRecording ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
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
      width={400}
      height={400}
      className="rounded-full bg-transparent"
    />
  );
} 