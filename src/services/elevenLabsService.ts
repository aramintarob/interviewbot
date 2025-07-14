import axios from 'axios';

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = import.meta.env.VITE_ELEVEN_LABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const AGENT_ID = import.meta.env.VITE_ELEVEN_LABS_AGENT_ID;

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface WebSocketEvent {
  type: string;
  [key: string]: any;
}

interface AudioEvent {
  type: 'audio';
  audio_event: {
    audio_base_64: string;
    event_id: number;
  };
}

interface AgentResponseEvent {
  type: 'agent_response';
  agent_response_event: {
    agent_response: string;
  };
}

interface PingEvent {
  type: 'ping';
  ping_event: {
    event_id: number;
    ping_ms?: number;
  };
}

interface UserTranscriptEvent {
  type: 'user_transcript';
  user_transcription_event: {
    user_transcript: string;
  };
}

interface InterruptionEvent {
  type: 'interruption';
  interruption_event: {
    reason: string;
  };
}

interface AudioChunk {
  buffer: ArrayBuffer;
  eventId: number;
}

export class ElevenLabsService {
  private apiKey: string;
  private messages: Message[] = [];
  private ws: WebSocket | null = null;
  private currentResolve: ((value: ArrayBuffer) => void) | null = null;
  private currentReject: ((reason: any) => void) | null = null;
  private isInitialized = false;
  private useConversationalAI = true;  // Will be set to false if agent fails
  private audioChunks: AudioChunk[] = [];
  private lastEventId = -1;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private lastChunkTime: number = 0;
  private chunkTimeout: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<void> | null = null;
  private messageTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key is not configured. Please add VITE_ELEVEN_LABS_API_KEY to your .env file.');
    }
    this.apiKey = ELEVENLABS_API_KEY;
   
    // Don't throw error for missing agent ID - we'll fall back to regular TTS
    if (!AGENT_ID) {
      console.warn('ElevenLabs Agent ID not configured. Falling back to regular text-to-speech.');
      this.useConversationalAI = false;
    }
  }

  private async setupWebSocket(): Promise<void> {
    // If we already have a connection promise in progress, return it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // If we already have an open connection, return immediately
    if (this.ws?.readyState === WebSocket.OPEN && this.isInitialized) {
      return Promise.resolve();
    }

    if (!AGENT_ID) {
      throw new Error('Agent ID is required for conversational AI');
    }

    // Create a new connection promise
    this.connectionPromise = new Promise((resolve, reject) => {
      console.log('Opening new WebSocket connection...');
      
      // Pass API key in the URL since WebSocket doesn't support custom headers in browser
      this.ws = new WebSocket(`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}&xi-api-key=${this.apiKey}`);

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error('WebSocket connection timeout after 10 seconds');
        reject(new Error('WebSocket connection timeout'));
        this.connectionPromise = null;
      }, 10000); // 10 second timeout

      this.ws.onopen = () => {
        console.log('WebSocket connection opened');
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        
        // Send initial configuration
        if (this.ws) {
          try {
            const initConfig = {
              type: 'conversation_initiation_client_data'
            };
            console.log('Sending initialization config:', initConfig);
            this.ws.send(JSON.stringify(initConfig));
          } catch (error) {
            console.error('Error sending initialization config:', error);
            reject(error);
          }
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.ws = null;
        this.isInitialized = false;
        this.connectionPromise = null;
        
        // Don't attempt to reconnect if it was a normal closure
        if (event.code !== 1000 && !this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log('Attempting to reconnect...');
          this.reconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Only reject if we haven't initialized yet
        if (!this.isInitialized) {
          reject(error);
          this.connectionPromise = null;
        }
        if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log('Attempting to reconnect after error...');
          this.reconnect();
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          console.log('Received WebSocket message:', data.type);

          switch (data.type) {
            case 'conversation_initiation_metadata': {
              console.log('Received conversation_initiation_metadata');
              this.isInitialized = true;
              clearTimeout(connectionTimeout);
              resolve();
              this.connectionPromise = null;
              break;
            }
            case 'audio': {
              // Clear message timeout since we're receiving audio
              if (this.messageTimeout) {
                clearTimeout(this.messageTimeout);
                this.messageTimeout = null;
              }

              const audioEvent = data as AudioEvent;
              if (!audioEvent.audio_event?.audio_base_64) {
                console.error('Invalid audio event received:', audioEvent);
                break;
              }

              const base64Audio = audioEvent.audio_event.audio_base_64;
              const eventId = audioEvent.audio_event.event_id;
              
              console.log(`Received audio chunk with event ID: ${eventId}`);
              
              try {
                // Store the chunk
                const audioBuffer = this.base64ToArrayBuffer(base64Audio);
                if (audioBuffer.byteLength === 0) {
                  console.warn(`Received empty audio chunk for event ID: ${eventId}`);
                  break;
                }

                this.audioChunks.push({
                  buffer: audioBuffer,
                  eventId
                });
                
                this.lastEventId = eventId;
                this.lastChunkTime = Date.now();
                
                // Check if we should concatenate and play
                this.checkAndPlayAudioChunks();
              } catch (error) {
                console.error('Error processing audio chunk:', error);
              }
              break;
            }
            case 'agent_response': {
              const responseEvent = data as AgentResponseEvent;
              if (responseEvent.agent_response_event?.agent_response) {
                console.log('Agent response:', responseEvent.agent_response_event.agent_response);
              } else {
                console.warn('Received empty agent response');
              }
              break;
            }
            case 'user_transcript': {
              const transcriptEvent = data as UserTranscriptEvent;
              if (transcriptEvent.user_transcription_event?.user_transcript) {
                console.log('User transcript:', transcriptEvent.user_transcription_event.user_transcript);
              }
              break;
            }
            case 'interruption': {
              const interruptionEvent = data as InterruptionEvent;
              const reason = interruptionEvent.interruption_event?.reason || 'Unknown reason';
              console.error('Interruption:', reason);
              if (this.currentReject) {
                // Don't reject if we've already received some audio
                if (this.audioChunks.length === 0) {
                  this.currentReject(new Error(`Interview interrupted: ${reason}`));
                } else {
                  console.log('Ignoring interruption as audio chunks were already received');
                  // Try to play what we have
                  this.checkAndPlayAudioChunks();
                }
              }
              break;
            }
            case 'ping': {
              const pingEvent = data as PingEvent;
              if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                try {
                  this.ws.send(JSON.stringify({
                    type: 'pong',
                    pong_event: {
                      event_id: pingEvent.ping_event?.event_id || 0
                    }
                  }));
                } catch (error) {
                  console.error('Error sending pong:', error);
                }
              }
              break;
            }
            default: {
              console.warn('Unhandled message type:', data.type);
            }
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          // Only reject if we haven't received any audio chunks
          if (this.currentReject && this.audioChunks.length === 0) {
            this.currentReject(error);
          }
        }
      };
    });

    return this.connectionPromise;
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private async checkAndPlayAudioChunks() {
    // Clear any existing timeout
    if (this.chunkTimeout) {
      clearTimeout(this.chunkTimeout);
      this.chunkTimeout = null;
    }

    // If we have chunks and haven't received a new one in 500ms, consider it complete
    const timeSinceLastChunk = Date.now() - this.lastChunkTime;
    if (this.audioChunks.length > 0 && timeSinceLastChunk >= 500) {
      console.log('Audio sequence complete, concatenating and playing...');
      
      try {
        // Sort and concatenate chunks
        const audioBuffer = await this.concatenateAudioChunks(this.audioChunks);
        
        // Only resolve if we actually have audio data
        if (audioBuffer.byteLength > 0) {
          console.log(`Playing audio buffer of size: ${audioBuffer.byteLength} bytes`);
          this.currentResolve?.(audioBuffer);
        } else {
          console.error('Empty audio buffer received');
          this.currentReject?.(new Error('Empty audio buffer received'));
        }
        
        // Clear the chunks
        this.audioChunks = [];
        this.lastEventId = -1;
      } catch (error) {
        console.error('Error processing audio chunks:', error);
        this.currentReject?.(error);
      }
    } else {
      // Set a timeout to check again
      this.chunkTimeout = setTimeout(() => this.checkAndPlayAudioChunks(), 100);
    }
  }

  private async concatenateAudioChunks(chunks: AudioChunk[]): Promise<ArrayBuffer> {
    // Sort chunks by event ID
    chunks.sort((a, b) => a.eventId - b.eventId);
    
    // Calculate total length
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.buffer.byteLength, 0);
    
    // Create a new buffer and copy all chunks into it
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      const view = new Uint8Array(chunk.buffer);
      result.set(view, offset);
      offset += view.length;
    }
    
    return result.buffer;
  }

  static async playAudioBuffer(
    buffer: ArrayBuffer,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      // Create a blob URL from the buffer
      const blob = new Blob([buffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      // Create and play audio element
      const audio = new Audio(url);
      
      if (onStart) {
        audio.addEventListener('playing', onStart);
        onStart(); // Also call immediately since 'playing' might not fire
      }
      
      if (onEnd) {
        audio.addEventListener('ended', () => {
          onEnd();
          URL.revokeObjectURL(url);
        });
      }

      // Start playback
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio buffer:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to play audio'));
      }
    }
  }

  async sendMessage(message: string): Promise<ArrayBuffer> {
    try {
      if (this.useConversationalAI && AGENT_ID) {
        // Try conversational AI first
        await this.setupWebSocket();
        
        return new Promise((resolve, reject) => {
          this.currentResolve = resolve;
          this.currentReject = reject;
          
          if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isInitialized) {
            try {
              const request = {
                type: 'user_message',
                text: message
              };
              
              console.log('Sending message to ElevenLabs:', request);
              this.ws.send(JSON.stringify(request));
              
              // Set a timeout for the response
              const messageTimeout = setTimeout(() => {
                console.error('Message response timeout after 30 seconds');
                reject(new Error('Message response timeout'));
                this.currentResolve = null;
                this.currentReject = null;
              }, 30000);
              
              // Store the timeout so we can clear it when we get a response
              this.messageTimeout = messageTimeout;
              
            } catch (error) {
              console.error('Error sending message:', error);
              reject(error);
            }
          } else {
            const error = new Error('WebSocket is not connected or not initialized');
            console.error(error);
            reject(error);
          }
        });
      } else {
        // Fall back to regular text-to-speech
        console.log('Using regular text-to-speech');
        return this.textToSpeech(message);
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      // If conversational AI fails, fall back to regular text-to-speech
      this.useConversationalAI = false;
      return this.textToSpeech(message);
    }
  }

  async textToSpeech(text: string): Promise<ArrayBuffer> {
    try {
      const response = await axios.post(
        `${ELEVENLABS_API_URL}/text-to-speech/${DEFAULT_VOICE_ID}`,
        { text },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error in text-to-speech:', error);
      throw error;
    }
  }

  private async reconnect(): Promise<void> {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;

    try {
      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        throw new Error('Max reconnection attempts reached');
      }

      // Add exponential backoff
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));

      await this.setupWebSocket();
    } catch (error) {
      console.error('Reconnection failed:', error);
      throw error;
    } finally {
      this.isReconnecting = false;
    }
  }

  clearConversation() {
    this.messages = [];
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
} 