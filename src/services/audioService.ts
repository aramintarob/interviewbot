export interface AudioVisualizationData {
  volume: number;  // Range 0-1
  frequency: Float32Array;
}

export type AudioFormat = 'audio/webm' | 'audio/mp3' | 'audio/wav';

export class AudioService {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private visualizationCallback: ((data: AudioVisualizationData) => void) | null = null;
  private animationFrame: number | null = null;
  private readonly fftSize = 2048;

  async initializeAudio(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize Web Audio API components
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.mediaStreamSource.connect(this.analyser);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw new Error('Failed to access microphone');
    }
  }

  startRecording(format: AudioFormat = 'audio/webm'): void {
    if (!this.stream) {
      throw new Error('Audio not initialized');
    }

    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: format });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recording not started'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        this.audioChunks = [];
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  pauseRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  startVisualization(callback: (data: AudioVisualizationData) => void): void {
    if (!this.analyser) {
      throw new Error('Audio not initialized');
    }

    this.visualizationCallback = callback;
    this.updateVisualization();
  }

  private updateVisualization = (): void => {
    if (!this.analyser || !this.visualizationCallback) {
      return;
    }

    const frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    const timeData = new Float32Array(this.analyser.frequencyBinCount);

    this.analyser.getFloatFrequencyData(frequencyData);
    this.analyser.getFloatTimeDomainData(timeData);

    // Calculate RMS volume
    const sum = timeData.reduce((acc, val) => acc + val * val, 0);
    const rms = Math.sqrt(sum / timeData.length);
    const volume = Math.min(1, Math.max(0, rms));

    this.visualizationCallback({
      volume,
      frequency: frequencyData
    });

    this.animationFrame = requestAnimationFrame(this.updateVisualization);
  };

  stopVisualization(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.visualizationCallback = null;
  }

  async convertFormat(blob: Blob, targetFormat: AudioFormat): Promise<Blob> {
    const audioContext = new AudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Create offline context for rendering
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();

    const renderedBuffer = await offlineContext.startRendering();

    // Convert AudioBuffer to WAV/MP3
    const format = targetFormat === 'audio/mp3' ? 'mp3' : 'wav';
    return await this.audioBufferToBlob(renderedBuffer, format);
  }

  private async audioBufferToBlob(buffer: AudioBuffer, format: 'wav' | 'mp3'): Promise<Blob> {
    // This is a simplified version - in production you'd want to use a proper encoder library
    const channels = buffer.numberOfChannels;
    const length = buffer.length * channels * 2; // 16-bit samples
    const data = new DataView(new ArrayBuffer(44 + length));

    // Write WAV header
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(data, 0, 'RIFF');
    data.setUint32(4, 36 + length, true);
    writeString(data, 8, 'WAVE');
    writeString(data, 12, 'fmt ');
    data.setUint32(16, 16, true);
    data.setUint16(20, 1, true);
    data.setUint16(22, channels, true);
    data.setUint32(24, buffer.sampleRate, true);
    data.setUint32(28, buffer.sampleRate * channels * 2, true);
    data.setUint16(32, channels * 2, true);
    data.setUint16(34, 16, true);
    writeString(data, 36, 'data');
    data.setUint32(40, length, true);

    // Write audio data
    const offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < channels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        data.setInt16(offset + (i * channels + channel) * 2, value, true);
      }
    }

    return new Blob([data], { type: `audio/${format}` });
  }

  cleanup(): void {
    this.stopVisualization();

    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
      this.mediaStreamSource = null;
    }

    this.audioChunks = [];
  }

  // Testing utilities
  getAudioState(): {
    isInitialized: boolean;
    isRecording: boolean;
    isPaused: boolean;
    hasVisualization: boolean;
  } {
    return {
      isInitialized: !!this.stream,
      isRecording: this.mediaRecorder?.state === 'recording',
      isPaused: this.mediaRecorder?.state === 'paused',
      hasVisualization: !!this.visualizationCallback
    };
  }

  async testMicrophone(): Promise<{
    connected: boolean;
    volume: number;
  }> {
    if (!this.analyser) {
      throw new Error('Audio not initialized');
    }

    return new Promise((resolve) => {
      const timeData = new Float32Array(this.analyser!.frequencyBinCount);
      this.analyser!.getFloatTimeDomainData(timeData);

      const sum = timeData.reduce((acc, val) => acc + val * val, 0);
      const rms = Math.sqrt(sum / timeData.length);

      resolve({
        connected: !!this.stream,
        volume: Math.min(1, Math.max(0, rms))
      });
    });
  }
} 