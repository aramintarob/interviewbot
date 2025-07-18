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
  private conversation: any = null;
  private conversationId: string | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private isInitializing = false;
  private transcript: string = '';
  private callbacks: ConversationCallbacks;
  private volume: number = 1.0;
  private isPaused: boolean = false;
  private currentUserResponse: string = '';
  private isActive = false;

  constructor(callbacks: ConversationCallbacks) {
    this.callbacks = callbacks;
  }

  async initialize(): Promise<void> {
    if (this.isInitializing) {
      console.log('Already initializing...');
      return;
    }

    try {
      this.isInitializing = true;
      this.transcript = '';
      this.conversationId = null;
      this.isActive = false;

      // Initialize ElevenLabs conversation
      const agentId = import.meta.env.VITE_ELEVEN_LABS_AGENT_ID;

      if (!agentId) {
        throw new Error('ElevenLabs Agent ID not found');
      }

      // Start the conversation session
      this.conversation = await Conversation.startSession({
        agentId,
        onConnect: () => {
          console.log('Conversation connected');
          if (this.conversation?.id) {
            this.conversationId = this.conversation.id;
            this.isActive = true;
            console.log('Conversation ID:', this.conversationId);
            this.callbacks.onConnect?.();
            this.callbacks.onStatusChange?.('connected');
          } else {
            console.error('No conversation ID available after connection');
            this.cleanup();
            this.callbacks.onError?.(new Error('No conversation ID available'));
          }
        },
        onDisconnect: () => {
          console.log('Conversation disconnected');
          this.isActive = false;
          this.callbacks.onDisconnect?.();
          this.callbacks.onStatusChange?.('disconnected');
        },
        onMessage: (message) => {
          if (!this.isActive) return;
          console.log('Message received:', message);
          this.transcript += `AI: ${message.message}\n`;
          this.callbacks.onMessage?.(message);
        },
        onError: (error) => {
          console.error('Conversation error:', error);
          this.cleanup();
          this.callbacks.onError?.(error);
        },
        onModeChange: (mode) => {
          if (!this.isActive) return;
          console.log('Mode changed:', mode);
          this.callbacks.onModeChange?.(mode);
          if (mode.mode === 'listening') {
            this.currentUserResponse = '';
            this.transcript += 'User: ';
          } else if (mode.mode === 'speaking' && this.currentUserResponse) {
            this.transcript += `${this.currentUserResponse}\n`;
          }
        },
        onSpeechRecognized: (text) => {
          if (!this.isActive) return;
          console.log('Speech recognized:', text);
          this.currentUserResponse = text;
        }
      });

      // Wait briefly for the connection and ID
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for conversation ID'));
        }, 5000);

        const checkId = () => {
          if (this.conversationId) {
            clearTimeout(timeout);
            resolve(true);
          } else if (!this.isInitializing) {
            clearTimeout(timeout);
            reject(new Error('Initialization failed'));
          } else {
            setTimeout(checkId, 100);
          }
        };

        checkId();
      });

      this.isInitializing = false;
    } catch (error) {
      this.cleanup();
      this.isInitializing = false;
      console.error('Error initializing conversation:', error);
      throw error;
    }
  }

  private cleanup() {
    if (this.conversation) {
      try {
        this.conversation.endSession().catch(console.error);
      } catch (error) {
        console.error('Error ending session during cleanup:', error);
      }
    }
    this.conversation = null;
    this.conversationId = null;
    this.isActive = false;
  }

  async endConversation(): Promise<{ audio: Blob; transcript: string } | null> {
    try {
      if (!this.conversationId) {
        throw new Error('No conversation ID available');
      }

      if (!this.isActive) {
        throw new Error('Conversation is not active');
      }

      if (this.conversation) {
        // Save final user response if any
        if (this.currentUserResponse) {
          this.transcript += `${this.currentUserResponse}\n`;
        }

        console.log('Ending conversation:', this.conversationId);
        await this.conversation.endSession();
        this.isActive = false;
        this.conversation = null;

        // Get the API key
        const apiKey = import.meta.env.VITE_ELEVEN_LABS_API_KEY;
        if (!apiKey) {
          throw new Error('ElevenLabs API key not found');
        }

        // Wait a moment for ElevenLabs to process the conversation
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Fetch the complete audio
        console.log('Fetching audio for conversation:', this.conversationId);
        const audioResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${this.conversationId}/audio`,
          {
            headers: {
              'xi-api-key': apiKey
            }
          }
        );

        if (!audioResponse.ok) {
          throw new Error(`Failed to get audio: ${audioResponse.statusText}`);
        }

        const audioBlob = await audioResponse.blob();
        console.log('Audio blob size:', audioBlob.size);

        // Fetch the conversation details (includes transcript)
        console.log('Fetching transcript for conversation:', this.conversationId);
        const detailsResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${this.conversationId}`,
          {
            headers: {
              'xi-api-key': apiKey
            }
          }
        );

        if (!detailsResponse.ok) {
          throw new Error(`Failed to get conversation details: ${detailsResponse.statusText}`);
        }

        const details = await detailsResponse.json();
        console.log('Conversation details:', details);

        const fullTranscript = details.transcript.map((t: any) => 
          `${t.role === 'user' ? 'User' : 'AI'}: ${t.message}`
        ).join('\n');

        // Clear the conversation ID
        this.conversationId = null;

        return {
          audio: audioBlob,
          transcript: fullTranscript
        };
      }

      return null;
    } catch (error) {
      this.cleanup();
      console.error('Error ending conversation:', error);
      throw error;
    }
  }

  async setVolume(value: number): Promise<void> {
    this.volume = value;
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
      // This line was removed as per the new_code, but it was not explicitly removed by the user.
      // Assuming it should be removed for consistency with the new_code.
      // this.stopVisualizationUpdates(); 

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
      // This line was removed as per the new_code, but it was not explicitly removed by the user.
      // Assuming it should be removed for consistency with the new_code.
      // this.startVisualizationUpdates(); 

      this.isPaused = false;
    } catch (error) {
      console.error('Error resuming conversation:', error);
      throw new Error('Failed to resume conversation');
    }
  }

  isPausing(): boolean {
    return this.isPaused;
  }

  getTranscript(): string {
    return this.transcript;
  }
} 