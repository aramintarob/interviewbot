import axios from 'axios';

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = import.meta.env.VITE_ELEVEN_LABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const AGENT_ID = import.meta.env.VITE_ELEVEN_LABS_AGENT_ID;

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

export class ElevenLabsService {
  private apiKey: string;
  private messages: Message[] = [];
  private ws: WebSocket | null = null;
  private currentResolve: ((value: ArrayBuffer) => void) | null = null;
  private currentReject: ((reason: any) => void) | null = null;

  constructor() {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key is not configured. Please add VITE_ELEVEN_LABS_API_KEY to your .env file.');
    }
    if (!AGENT_ID) {
      throw new Error('ElevenLabs Agent ID is not configured. Please add VITE_ELEVEN_LABS_AGENT_ID to your .env file.');
    }
    this.apiKey = ELEVENLABS_API_KEY;
  }

  private setupWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket(`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`);

      this.ws.onopen = () => {
        // Send initial configuration
        if (this.ws) {
          this.ws.send(JSON.stringify({
            type: 'conversation_initiation_client_data',
            conversation_config_override: {
              agent: {
                language: 'en'
              },
              tts: {
                voice_id: DEFAULT_VOICE_ID
              }
            }
          }));
        }
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'audio':
            if (this.currentResolve) {
              // Convert base64 to ArrayBuffer
              const binaryString = atob(data.audio_event.audio_base_64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              this.currentResolve(bytes.buffer);
              this.currentResolve = null;
              this.currentReject = null;
            }
            break;
          
          case 'agent_response':
            // Store the assistant's response
            this.messages.push({
              role: 'assistant',
              content: data.agent_response_event.agent_response
            });
            break;

          case 'error':
            if (this.currentReject) {
              this.currentReject(new Error(data.error));
              this.currentResolve = null;
              this.currentReject = null;
            }
            break;
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
      };
    });
  }

  async textToSpeech(text: string): Promise<ArrayBuffer> {
    try {
      const response = await axios.post(
        `${ELEVENLABS_API_URL}/text-to-speech/${DEFAULT_VOICE_ID}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in textToSpeech:', error);
      throw new Error('Failed to convert text to speech');
    }
  }

  async sendMessage(message: string): Promise<ArrayBuffer> {
    try {
      await this.setupWebSocket();
      
      // Add user message to history
      this.messages.push({ role: 'user', content: message });

      return new Promise((resolve, reject) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection is not open'));
          return;
        }

        this.currentResolve = resolve;
        this.currentReject = reject;

        // Send the user message
        this.ws.send(JSON.stringify({
          type: 'user_message',
          text: message
        }));
      });
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw new Error('Failed to get chat response');
    }
  }

  clearConversation() {
    this.messages = [];
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.ws = null;
  }

  static async playAudioBuffer(
    audioBuffer: ArrayBuffer,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      const audioContext = new AudioContext();
      const audioBufferSource = audioContext.createBufferSource();

      const decodedData = await audioContext.decodeAudioData(audioBuffer);
      audioBufferSource.buffer = decodedData;
      audioBufferSource.connect(audioContext.destination);

      if (onStart) {
        audioBufferSource.addEventListener('start', onStart);
      }

      if (onEnd) {
        audioBufferSource.addEventListener('ended', () => {
          onEnd();
          audioContext.close();
        });
      }

      audioBufferSource.start(0);
    } catch (error) {
      console.error('Error playing audio buffer:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to play audio'));
      }
    }
  }
} 