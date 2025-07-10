import axios, { AxiosError } from 'axios';

const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1';

interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  category: string;
  available_for_tiers?: string[];
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
    console.log('Environment check:', {
      VITE_ELEVEN_LABS_API_KEY_exists: !!import.meta.env.VITE_ELEVEN_LABS_API_KEY,
      VITE_ELEVEN_LABS_API_KEY_type: typeof import.meta.env.VITE_ELEVEN_LABS_API_KEY,
      VITE_ELEVEN_LABS_API_KEY_length: import.meta.env.VITE_ELEVEN_LABS_API_KEY?.length,
      apiKey_exists: !!apiKey,
      apiKey_type: typeof apiKey,
      apiKey_length: apiKey?.length
    });

    if (!apiKey) {
      throw new Error('ElevenLabs API key is required');
    }

    // Validate API key format
    if (typeof apiKey !== 'string' || !apiKey.startsWith('sk_') || apiKey.length < 32) {
      throw new Error('Invalid ElevenLabs API key format. It should start with "sk_" and be at least 32 characters long.');
    }

    this.apiKey = apiKey;
    this.voiceId = voiceId;
    
    // Test the API key immediately
    this.testApiKey();
  }

  private getHeaders(contentType = 'application/json') {
    const headers = {
      'xi-api-key': this.apiKey,
      'Content-Type': contentType,
      'Accept': contentType
    };
    console.log('Generated headers:', {
      ...headers,
      'xi-api-key': headers['xi-api-key'] ? `${headers['xi-api-key'].substring(0, 5)}...` : 'not set'
    });
    return headers;
  }

  private async testApiKey() {
    console.log('Starting API key test...');
    try {
      // Try user endpoint
      console.log('Testing user endpoint...');
      const userResponse = await axios.get(`${ELEVEN_LABS_API_URL}/user`, {
        headers: this.getHeaders(),
      });
      console.log('User endpoint test successful:', userResponse.data);

      // Try voices endpoint
      console.log('Testing voices endpoint...');
      const voicesResponse = await axios.get(`${ELEVEN_LABS_API_URL}/voices`, {
        headers: this.getHeaders(),
      });
      console.log('Voices endpoint test successful:', {
        voiceCount: voicesResponse.data.voices?.length
      });

    } catch (error) {
      console.error('API Key test failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: axios.isAxiosError(error) ? {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        } : null,
        requestConfig: axios.isAxiosError(error) ? {
          url: error.config?.url,
          method: error.config?.method,
          headers: {
            ...error.config?.headers,
            'xi-api-key': 'REDACTED'
          }
        } : null
      });
    }
  }

  private async handleError(error: unknown): Promise<never> {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const details = error.response?.data?.detail || error.message;
      
      // Log the full request configuration
      console.log('Full request details:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: {
          ...error.config?.headers,
          'xi-api-key': error.config?.headers?.['xi-api-key'] ? 
            `${error.config.headers['xi-api-key'].substring(0, 5)}...` : 'not set'
        }
      });

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
      // First get user info to determine subscription tier
      console.log('Getting user info with headers:', {
        'xi-api-key': this.apiKey ? `${this.apiKey.substring(0, 5)}...` : 'not set'
      });
      const userResponse = await axios.get(`${ELEVEN_LABS_API_URL}/user`, {
        headers: this.getHeaders(),
      });
      const userTier = userResponse.data.subscription?.tier || 'free';
      console.log('User tier:', userTier);

      // Then get voices
      console.log('Getting voices with headers:', {
        'xi-api-key': this.apiKey ? `${this.apiKey.substring(0, 5)}...` : 'not set'
      });
      const voicesResponse = await axios.get(`${ELEVEN_LABS_API_URL}/voices`, {
        headers: this.getHeaders(),
      });

      console.log('All voices:', voicesResponse.data.voices.map((v: Voice) => ({
        id: v.voice_id,
        name: v.name,
        tiers: v.available_for_tiers
      })));

      // Filter voices based on availability for user's tier
      const filteredVoices = voicesResponse.data.voices.filter((voice: Voice & { available_for_tiers?: string[] }) => {
        const isAvailable = !voice.available_for_tiers || 
                          voice.available_for_tiers.length === 0 || 
                          voice.available_for_tiers.includes(userTier);
        
        console.log(`Voice ${voice.name} (${voice.voice_id}):`, {
          tiers: voice.available_for_tiers,
          userTier,
          isAvailable
        });
        
        return isAvailable;
      });

      console.log('Filtered voices:', filteredVoices.map((v: Voice) => ({
        id: v.voice_id,
        name: v.name
      })));

      return filteredVoices;
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
      // First verify the voice is available for our tier
      const voices = await this.getVoices();
      const voice = voices.find(v => v.voice_id === voiceId);
      if (!voice) {
        throw new Error(`Voice ${voiceId} is not available for your subscription tier`);
      }

      console.log('Attempting to fetch preview for voice:', {
        id: voice.voice_id,
        name: voice.name,
        apiKey: this.apiKey ? `${this.apiKey.substring(0, 5)}...` : 'not set'
      });

      // Use the ElevenLabs API endpoint with minimal headers
      const response = await axios.get(
        `${ELEVEN_LABS_API_URL}/voices/${voiceId}/preview`,
        {
          headers: {
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );

      console.log('Preview fetch successful, response size:', response.data.byteLength);
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
          headers: this.getHeaders(),
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
      
      // Resume audio context if it's suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        console.log('Resuming audio context...');
        await audioContext.resume();
      }
      
      console.log('Decoding audio data...');
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      console.log('Audio data decoded, duration:', audioBuffer.duration);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      if (onStart) {
        source.addEventListener('start', onStart);
      }
      if (onEnd) {
        source.addEventListener('ended', onEnd);
      }
      
      console.log('Starting audio playback...');
      source.start(0);
    } catch (error) {
      console.error('Audio playback error:', error);
      if (onError && error instanceof Error) {
        onError(new Error(`Audio playback failed: ${error.message}`));
      }
      throw error;
    }
  }
} 