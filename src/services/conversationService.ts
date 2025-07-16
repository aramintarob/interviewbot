import { Conversation, Role, Mode } from '@elevenlabs/client';

interface ConversationCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: { message: string; source: Role }) => void;
  onError?: (error: Error | string) => void;
  onStatusChange?: (status: 'connected' | 'connecting' | 'disconnected') => void;
  onModeChange?: (mode: { mode: Mode }) => void;
  onVisualizationData?: (data: { inputVolume: number; outputVolume: number; inputFrequency: Uint8Array; outputFrequency: Uint8Array }) => void;
}

export class ConversationService {
  private conversation: Conversation | null = null;
  private visualizationInterval: NodeJS.Timeout | null = null;
  private callbacks: ConversationCallbacks = {};
  private volume: number = 1.0;
  private isInitializing: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private isPaused: boolean = false;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;

  constructor(callbacks?: ConversationCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitializing) {
      console.log('Already initializing...');
      return;
    }

    try {
      this.isInitializing = true;

      // Request microphone access first
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();

      // Initialize ElevenLabs conversation
      const agentId = import.meta.env.VITE_ELEVEN_LABS_AGENT_ID;

      if (!agentId) {
        throw new Error('ElevenLabs Agent ID not found');
      }

      // Start the conversation session
      this.conversation = await Conversation.startSession({
        agentId,
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
        onMessage: (message) => {
          this.callbacks.onMessage?.(message);
        },
        onError: (error) => {
          this.callbacks.onError?.(error);
        },
        onModeChange: (mode) => {
          this.callbacks.onModeChange?.(mode);
        }
      });

      this.isInitializing = false;
    } catch (error) {
      this.isInitializing = false;
      console.error('Error initializing conversation:', error);
      throw error;
    }
  }

  private startVisualizationUpdates() {
    if (this.visualizationInterval) return;

    this.visualizationInterval = setInterval(async () => {
      if (!this.conversation) return;

      try {
        const [inputVolume, outputVolume] = await Promise.all([
          this.conversation.getInputVolume(),
          this.conversation.getOutputVolume()
        ]);

        const [inputFrequency, outputFrequency] = await Promise.all([
          this.conversation.getInputByteFrequencyData(),
          this.conversation.getOutputByteFrequencyData()
        ]);

        this.callbacks.onVisualizationData?.({
          inputVolume,
          outputVolume,
          inputFrequency,
          outputFrequency
        });
      } catch (error) {
        console.error('Error getting visualization data:', error);
      }
    }, 100);
  }

  private stopVisualizationUpdates() {
    if (this.visualizationInterval) {
      clearInterval(this.visualizationInterval);
      this.visualizationInterval = null;
    }
  }

  async endConversation(): Promise<Blob | null> {
    try {
      if (this.conversation) {
        await this.conversation.endSession();
        this.conversation = null;
      }

      // Clean up audio resources
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      this.stopVisualizationUpdates();
      return null; // The SDK handles the audio recording internally
    } catch (error) {
      console.error('Error ending conversation:', error);
      throw new Error('Failed to end conversation properly');
    }
  }

  async setVolume(value: number): Promise<void> {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.conversation) {
      await this.conversation.setVolume({ volume: this.volume });
    }
  }

  async pause(): Promise<void> {
    if (!this.conversation || this.isPaused) return;
    
    try {
      // Suspend audio context to pause audio processing
      if (this.audioContext) {
        await this.audioContext.suspend();
      }

      // Stop media tracks to pause microphone input
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.enabled = false);
      }

      // Stop visualization updates
      this.stopVisualizationUpdates();

      this.isPaused = true;
    } catch (error) {
      console.error('Error pausing conversation:', error);
      throw new Error('Failed to pause conversation');
    }
  }

  async resume(): Promise<void> {
    if (!this.conversation || !this.isPaused) return;
    
    try {
      // Resume audio context
      if (this.audioContext) {
        await this.audioContext.resume();
      }

      // Re-enable media tracks to resume microphone input
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.enabled = true);
      }

      // Restart visualization updates
      this.startVisualizationUpdates();

      this.isPaused = false;
    } catch (error) {
      console.error('Error resuming conversation:', error);
      throw new Error('Failed to resume conversation');
    }
  }

  isPausedState(): boolean {
    return this.isPaused;
  }
} 