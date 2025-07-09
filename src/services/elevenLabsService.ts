import axios, { AxiosError } from 'axios';

const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1';

interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  category: string;
}

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

interface TextToSpeechRequest {
  text: string;
  model_id: string;
  voice_settings: VoiceSettings;
}

interface ElevenLabsError extends Error {
  status?: number;
  details?: string;
}

export class ElevenLabsService {
  private readonly apiKey: string;
  private voiceId: string;
  private retryCount: number = 3;
  private retryDelay: number = 1000; // ms
  private modelId: string = 'eleven_multilingual_v2';
  private defaultVoiceSettings: VoiceSettings = {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.5,
    use_speaker_boost: true
  };

  constructor(apiKey = import.meta.env.VITE_ELEVEN_LABS_API_KEY, voiceId = import.meta.env.VITE_ELEVEN_LABS_VOICE_ID) {
    if (!apiKey) throw new Error('ElevenLabs API key is required');
    this.apiKey = apiKey;
    this.voiceId = voiceId;
  }

  private get headers() {
    return {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async handleError(error: unknown): Promise<never> {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const details = error.response?.data?.detail || error.message;
      
      const elevenlabsError = new Error(
        `ElevenLabs API Error: ${details}`
      ) as ElevenLabsError;
      
      elevenlabsError.status = status;
      elevenlabsError.details = details;
      
      throw elevenlabsError;
    }
    throw error;
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (axios.isAxiosError(error)) {
          // Don't retry on client errors (4xx)
          if (error.response?.status && error.response.status < 500) {
            throw await this.handleError(error);
          }
        }
        
        if (attempt < this.retryCount) {
          await new Promise(resolve => 
            setTimeout(resolve, this.retryDelay * attempt)
          );
          continue;
        }
      }
    }
    
    throw await this.handleError(lastError);
  }

  async getVoices(): Promise<Voice[]> {
    return this.retryOperation(async () => {
      const response = await axios.get(`${ELEVEN_LABS_API_URL}/voices`, {
        headers: this.headers,
      });
      return response.data.voices;
    });
  }

  async getDefaultVoice(): Promise<Voice> {
    const voices = await this.getVoices();
    if (!this.voiceId) {
      // If no voice ID is set, use the first available voice
      const defaultVoice = voices[0];
      this.voiceId = defaultVoice.voice_id;
      return defaultVoice;
    }
    
    const voice = voices.find(v => v.voice_id === this.voiceId);
    if (!voice) {
      throw new Error('Configured voice ID not found');
    }
    return voice;
  }

  setVoice(voiceId: string) {
    this.voiceId = voiceId;
  }

  async previewVoice(voiceId: string): Promise<ArrayBuffer> {
    return this.retryOperation(async () => {
      const response = await axios.get(
        `${ELEVEN_LABS_API_URL}/voices/${voiceId}/preview`,
        {
          headers: this.headers,
          responseType: 'arraybuffer',
        }
      );
      return response.data;
    });
  }

  async textToSpeech(
    text: string,
    voiceSettings?: Partial<VoiceSettings>
  ): Promise<ReadableStream<Uint8Array>> {
    if (!this.voiceId) {
      await this.getDefaultVoice();
    }

    const payload: TextToSpeechRequest = {
      text,
      model_id: this.modelId,
      voice_settings: {
        ...this.defaultVoiceSettings,
        ...voiceSettings,
      },
    };

    return this.retryOperation(async () => {
      const response = await axios.post(
        `${ELEVEN_LABS_API_URL}/text-to-speech/${this.voiceId}/stream`,
        payload,
        {
          headers: this.headers,
          responseType: 'stream',
        }
      );
      return response.data;
    });
  }

  // Helper method to play audio from stream
  static async playAudioStream(
    audioStream: ReadableStream<Uint8Array>,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      const audioContext = new AudioContext();
      const chunks: Uint8Array[] = [];
      
      // Read the stream
      const reader = audioStream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      // Combine chunks into a single ArrayBuffer
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const audioData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        audioData.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Decode and play the audio
      const audioBuffer = await audioContext.decodeAudioData(audioData.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      if (onStart) {
        source.addEventListener('start', onStart);
      }
      if (onEnd) {
        source.addEventListener('ended', onEnd);
      }
      
      source.start(0);
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
      throw error;
    }
  }

  // Helper method to play audio from ArrayBuffer
  static async playAudioBuffer(
    audioData: ArrayBuffer,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      if (onStart) {
        source.addEventListener('start', onStart);
      }
      if (onEnd) {
        source.addEventListener('ended', onEnd);
      }
      
      source.start(0);
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
      throw error;
    }
  }
} 