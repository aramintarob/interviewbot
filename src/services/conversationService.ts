import { Conversation } from '@elevenlabs/client';
import { Question } from '@/types/questions';

interface ConversationCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: string) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: 'connected' | 'connecting' | 'disconnected') => void;
  onModeChange?: (mode: 'speaking' | 'listening') => void;
  onVisualizationData?: (data: { inputVolume: number; outputVolume: number; inputFrequency: Uint8Array; outputFrequency: Uint8Array }) => void;
  onTranscriptUpdate?: (transcript: string) => void;
}

export class ConversationService {
  private conversation: Conversation | null = null;
  private visualizationInterval: NodeJS.Timeout | null = null;
  private callbacks: ConversationCallbacks = {};
  private volume: number = 1.0;
  private isInitializing: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private transcriptBuffer: string = '';

  constructor(callbacks?: ConversationCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitializing) {
      console.log('Already initializing, skipping...');
      return;
    }

    if (this.conversation) {
      console.log('Cleaning up existing conversation...');
      await this.endConversation();
    }

    try {
      this.isInitializing = true;
      this.reconnectAttempts = 0;
      console.log('Starting initialization...');

      // Request microphone access first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Initialize conversation with ElevenLabs
      this.conversation = await Conversation.startSession({
        agentId: import.meta.env.VITE_ELEVEN_LABS_AGENT_ID,
        onConnect: () => {
          console.log('Connected to ElevenLabs');
          this.reconnectAttempts = 0;
          this.callbacks.onConnect?.();
          this.callbacks.onStatusChange?.('connected');
          this.startVisualizationUpdates();
        },
        onDisconnect: () => {
          console.log('Disconnected from ElevenLabs');
          this.stopVisualizationUpdates();
          
          // Attempt to reconnect if we haven't exceeded max attempts
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log(`Attempting to reconnect (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
            this.reconnectAttempts++;
            this.initialize().catch(console.error);
          } else {
            console.log('Max reconnection attempts reached');
            this.conversation = null;
            this.callbacks.onDisconnect?.();
            this.callbacks.onStatusChange?.('disconnected');
          }
        },
        onMessage: (message: any) => {
          console.log('Received message:', message);
          
          // Handle different message types from the SDK
          let text = '';
          if (typeof message === 'string') {
            text = message;
          } else if (message.message) {
            text = message.message;
          }

          if (text) {
            // Update transcript buffer
            if (this.transcriptBuffer) {
              this.transcriptBuffer += '\n';
            }
            this.transcriptBuffer += text;
            
            // Notify callbacks
            this.callbacks.onMessage?.(text);
            this.callbacks.onTranscriptUpdate?.(this.transcriptBuffer);
          }
        },
        onError: (error: any) => {
          console.error('ElevenLabs error:', error);
          // Only end conversation on fatal errors
          if (error instanceof Error && error.message.includes('fatal')) {
            this.endConversation().catch(console.error);
          }
          this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
        },
        onModeChange: (modeData: any) => {
          console.log('Mode changed:', modeData);
          // Convert SDK mode to our mode type
          const mode = typeof modeData === 'string' ? modeData : modeData.mode;
          if (mode === 'speaking' || mode === 'listening') {
            this.callbacks.onModeChange?.(mode);
          }
        }
      });

      // Set initial volume
      await this.setVolume(this.volume);
      console.log('Initialization complete');
    } catch (error) {
      console.error('Initialization error:', error);
      await this.endConversation();
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async endConversation(): Promise<void> {
    console.log('Ending conversation...');
    this.stopVisualizationUpdates();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection attempts
    this.transcriptBuffer = '';
    
    if (this.conversation) {
      try {
        await this.conversation.endSession();
      } catch (error) {
        console.error('Error ending conversation:', error);
      }
      this.conversation = null;
    }
  }

  private startVisualizationUpdates(): void {
    if (this.visualizationInterval) {
      clearInterval(this.visualizationInterval);
    }

    this.visualizationInterval = setInterval(async () => {
      if (!this.conversation) {
        this.stopVisualizationUpdates();
        return;
      }

      try {
        const inputVolume = await this.conversation.getInputVolume();
        const outputVolume = await this.conversation.getOutputVolume();
        const inputFrequency = await this.conversation.getInputByteFrequencyData();
        const outputFrequency = await this.conversation.getOutputByteFrequencyData();

        this.callbacks.onVisualizationData?.({
          inputVolume,
          outputVolume,
          inputFrequency,
          outputFrequency
        });
      } catch (error) {
        console.error('Error getting visualization data:', error);
        this.stopVisualizationUpdates();
      }
    }, 100); // Update every 100ms
  }

  private stopVisualizationUpdates(): void {
    if (this.visualizationInterval) {
      clearInterval(this.visualizationInterval);
      this.visualizationInterval = null;
    }
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.conversation) {
      throw new Error('Conversation not initialized');
    }

    this.volume = Math.max(0, Math.min(1, volume));
    await this.conversation.setVolume({ volume: this.volume });
  }

  getVolume(): number {
    return this.volume;
  }

  getId(): string | null {
    return this.conversation?.getId() ?? null;
  }
} 