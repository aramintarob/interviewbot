import { useEffect, useRef } from 'react';
import type { AudioVisualizationData } from '../../services/audioService';

interface VolumeVisualizerProps {
  data: AudioVisualizationData;
  width?: number;
  height?: number;
}

export function VolumeVisualizer({ 
  data, 
  width = 300, 
  height = 60 
}: VolumeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw volume bar
    const barWidth = width * 0.8; // 80% of canvas width
    const barHeight = height * 0.4; // 40% of canvas height
    const x = (width - barWidth) / 2;
    const y = (height - barHeight) / 2;

    // Background bar
    ctx.fillStyle = '#e5e7eb'; // gray-200
    ctx.fillRect(x, y, barWidth, barHeight);

    // Volume level
    ctx.fillStyle = '#3b82f6'; // blue-500
    ctx.fillRect(x, y, barWidth * data.volume, barHeight);

    // Draw frequency visualization
    if (data.frequency) {
      const frequencyWidth = width * 0.8;
      const frequencyHeight = height * 0.2;
      const frequencyX = (width - frequencyWidth) / 2;
      const frequencyY = height * 0.8;

      // Normalize and sample frequency data
      const frequencyData = Array.from(data.frequency);
      const samples = 20; // Number of frequency bars to show
      const sampledData = [];
      const sampleSize = Math.floor(frequencyData.length / samples);

      for (let i = 0; i < samples; i++) {
        const start = i * sampleSize;
        const end = start + sampleSize;
        const sampleAvg = frequencyData
          .slice(start, end)
          .reduce((a, b) => a + b, 0) / sampleSize;
        sampledData.push(Math.min(1, Math.max(0, (sampleAvg + 140) / 70))); // Normalize from dB to 0-1
      }

      // Draw frequency bars
      const barSpacing = 2;
      const barW = (frequencyWidth - (samples - 1) * barSpacing) / samples;

      ctx.fillStyle = '#60a5fa'; // blue-400
      sampledData.forEach((value, i) => {
        const barH = value * frequencyHeight;
        const barX = frequencyX + i * (barW + barSpacing);
        const barY = frequencyY + frequencyHeight - barH;
        ctx.fillRect(barX, barY, barW, barH);
      });
    }
  }, [data, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg bg-white shadow-sm"
    />
  );
} 