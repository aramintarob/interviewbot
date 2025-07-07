import axios from 'axios';

const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1';
const API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY;
const VOICE_ID = import.meta.env.VITE_ELEVEN_LABS_VOICE_ID;

interface TextToSpeechRequest {
  text: string;
  modelId?: string;
  voiceSettings?: {
    stability: number;
    similarityBoost: number;
  };
}

export class ElevenLabsService {
  private readonly apiKey: string;
  private readonly voiceId: string;

  constructor(apiKey = API_KEY, voiceId = VOICE_ID) {
    if (!apiKey) throw new Error('ElevenLabs API key is required');
    if (!voiceId) throw new Error('ElevenLabs Voice ID is required');
    
    this.apiKey = apiKey;
    this.voiceId = voiceId;
  }

  private get headers() {
    return {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async textToSpeech(text: string): Promise<ArrayBuffer> {
    try {
      const payload: TextToSpeechRequest = {
        text,
        modelId: 'eleven_monolingual_v1',
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
        },
      };

      const response = await axios.post(
        `${ELEVEN_LABS_API_URL}/text-to-speech/${this.voiceId}`,
        payload,
        {
          headers: this.headers,
          responseType: 'arraybuffer',
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in text-to-speech:', error);
      throw new Error('Failed to convert text to speech');
    }
  }

  async getVoices() {
    try {
      const response = await axios.get(`${ELEVEN_LABS_API_URL}/voices`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching voices:', error);
      throw new Error('Failed to fetch voices');
    }
  }

  // Helper method to play audio from ArrayBuffer
  static async playAudio(audioData: ArrayBuffer): Promise<void> {
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  }
} 