import { useEffect, useRef } from 'react';

export interface VolumeVisualizerProps {
  data: {
    volume: number;
    frequency: Uint8Array;
  };
}

export function VolumeVisualizer({ data }: VolumeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;
      const centerX = WIDTH / 2;
      const centerY = HEIGHT / 2;
      const radius = Math.min(WIDTH, HEIGHT) / 2.5;
      
      // Clear the canvas
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      
      // Draw circular visualizer
      const barCount = 180;
      const angleStep = (2 * Math.PI) / barCount;
      
      for (let i = 0; i < barCount; i++) {
        const angle = i * angleStep;
        
        // Get frequency value and normalize it
        const frequencyIndex = Math.floor((i / barCount) * data.frequency.length);
        const value = data.frequency[frequencyIndex];
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
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${normalizedValue})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Draw inner circle with volume indicator
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.7, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(255, 255, 255, ${data.volume})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      animationFrameRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="rounded-full bg-transparent"
    />
  );
} 