import { Conversation } from '@elevenlabs/client';

interface ConversationCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: string) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: 'connected' | 'connecting' | 'disconnected') => void;
  onModeChange?: (mode: 'speaking' | 'listening') => void;
  onVisualizationData?: (data: { inputVolume: number; outputVolume: number; inputFrequency: Uint8Array; outputFrequency: Uint8Array }) => void;
}

export class ConversationService {
  private conversation: Conversation | null = null;
  private visualizationInterval: NodeJS.Timeout | null = null;
  private callbacks: ConversationCallbacks = {};
  private volume: number = 1.0;

  constructor(callbacks?: ConversationCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  async initialize(): Promise<void> {
    try {
      // Request microphone access first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Initialize conversation with ElevenLabs
      this.conversation = await Conversation.startSession({
        agentId: import.meta.env.VITE_ELEVEN_LABS_AGENT_ID,
        onConnect: () => {
          this.callbacks.onConnect?.();
          this.callbacks.onStatusChange?.('connected');
          this.startVisualizationUpdates();
        },
        onDisconnect: () => {
          this.callbacks.onDisconnect?.();
          this.callbacks.onStatusChange?.('disconnected');
          this.stopVisualizationUpdates();
        },
        onMessage: (message: any) => {
          // Handle different message types from the SDK
          if (typeof message === 'string') {
            this.callbacks.onMessage?.(message);
          } else if (message.message) {
            this.callbacks.onMessage?.(message.message);
          }
        },
        onError: (error: any) => {
          this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
        },
        onModeChange: (modeData: any) => {
          // Convert SDK mode to our mode type
          const mode = typeof modeData === 'string' ? modeData : modeData.mode;
          if (mode === 'speaking' || mode === 'listening') {
            this.callbacks.onModeChange?.(mode);
          }
        }
      });

      // Set initial volume
      await this.setVolume(this.volume);
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error : new Error('Failed to initialize conversation'));
      throw error;
    }
  }

  private startVisualizationUpdates(): void {
    if (this.visualizationInterval) {
      clearInterval(this.visualizationInterval);
    }

    this.visualizationInterval = setInterval(async () => {
      if (!this.conversation) return;

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

  async endConversation(): Promise<void> {
    if (this.conversation) {
      await this.conversation.endSession();
      this.conversation = null;
    }
    this.stopVisualizationUpdates();
  }

  getId(): string | null {
    return this.conversation?.getId() ?? null;
  }
} 