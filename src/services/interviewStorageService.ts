import { supabase } from '@/lib/supabase';
import { InterviewSession } from '@/types/questions';

interface InterviewAssets {
  audioUrl: string;
  transcriptUrl: string;
  metadataUrl: string;
}

interface InterviewMetadata {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  candidateName: string;
  questionCount: number;
  completedQuestions: number;
}

interface ElevenLabsTranscript {
  language_code: string;
  language_probability: number;
  text: string;
  words: Array<{
    text: string;
    type: string;
    start: number;
    end: number;
    speaker_id?: string;
  }>;
}

export class InterviewStorageService {
  private readonly bucketName = 'interview-assets';
  private readonly CLEANUP_AFTER_DAYS = 30; // Cleanup files after 30 days

  constructor() {
    this.initializeBucket().catch(console.error);
  }

  private async initializeBucket() {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(this.bucketName, {
          public: false,
          fileSizeLimit: 104857600, // 100MB limit
          allowedMimeTypes: ['audio/webm', 'audio/wav', 'audio/mpeg', 'application/json', 'text/plain']
        });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Failed to initialize interview storage bucket:', error);
      throw new Error('Interview storage initialization failed');
    }
  }

  private async generateElevenLabsTranscript(audioBlob: Blob): Promise<ElevenLabsTranscript> {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob);
      formData.append('model_id', 'scribe_v1');
      formData.append('diarize', 'true');
      formData.append('tag_audio_events', 'true');

      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.VITE_ELEVEN_LABS_API_KEY as string,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to generate ElevenLabs transcript:', error);
      throw new Error('Failed to generate transcript');
    }
  }

  async saveInterviewAssets(
    session: InterviewSession,
    audioBlob: Blob,
    realtimeTranscript: string
  ): Promise<InterviewAssets> {
    try {
      const timestamp = new Date().toISOString();
      const prefix = `interviews/${session.id}`;

      // Generate metadata
      const metadata: InterviewMetadata = {
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime || Date.now(),
        duration: (session.endTime || Date.now()) - session.startTime,
        candidateName: session.candidateName,
        questionCount: session.sequence?.questions?.length || 0,
        completedQuestions: session.responses?.length || 0
      };

      // Generate ElevenLabs transcript
      const elevenlabsTranscript = await this.generateElevenLabsTranscript(audioBlob);
      
      // Format transcript with speaker labels
      const formattedTranscript = elevenlabsTranscript.words
        .map(word => {
          if (word.type === 'word') {
            const speaker = word.speaker_id === 'speaker_1' ? 'Interviewer' : 'You';
            return `${speaker}: ${word.text}`;
          }
          return word.text;
        })
        .join('');

      // Upload files in parallel
      const [audioUrl, transcriptUrl, metadataUrl] = await Promise.all([
        this.uploadFile(
          audioBlob,
          `${prefix}/audio-${timestamp}.webm`,
          'audio/webm'
        ),
        this.uploadFile(
          new Blob([formattedTranscript], { type: 'text/plain' }),
          `${prefix}/transcript-${timestamp}.txt`,
          'text/plain'
        ),
        this.uploadFile(
          new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' }),
          `${prefix}/metadata-${timestamp}.json`,
          'application/json'
        )
      ]);

      // Schedule cleanup
      this.scheduleCleanup(prefix);

      return {
        audioUrl,
        transcriptUrl,
        metadataUrl
      };
    } catch (error) {
      console.error('Failed to save interview assets:', error);
      throw new Error('Failed to save interview assets');
    }
  }

  private async uploadFile(
    blob: Blob,
    path: string,
    contentType: string
  ): Promise<string> {
    try {
      const { error: uploadError, data } = await supabase.storage
        .from(this.bucketName)
        .upload(path, blob, {
          contentType,
          upsert: false
        });

      if (uploadError) throw uploadError;
      if (!data?.path) throw new Error('Upload failed - no path returned');

      const { data: { publicUrl } } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw new Error(`Failed to upload ${path}`);
    }
  }

  private async scheduleCleanup(prefix: string) {
    try {
      // Get current date and cleanup date
      const now = new Date();
      const cleanupDate = new Date(now.getTime() + (this.CLEANUP_AFTER_DAYS * 24 * 60 * 60 * 1000));

      // Store cleanup date in metadata
      await supabase
        .from('interview_cleanups')
        .insert({
          prefix,
          cleanup_date: cleanupDate.toISOString()
        });
    } catch (error) {
      console.error('Failed to schedule cleanup:', error);
      // Don't throw - cleanup scheduling is non-critical
    }
  }

  async getInterviewAssets(sessionId: string): Promise<InterviewAssets | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(`interviews/${sessionId}`);

      if (error) throw error;
      if (!data?.length) return null;

      // Find the latest files
      const latestFiles = data.reduce((acc, file) => {
        if (file.name.includes('audio')) acc.audioUrl = file.name;
        if (file.name.includes('transcript')) acc.transcriptUrl = file.name;
        if (file.name.includes('metadata')) acc.metadataUrl = file.name;
        return acc;
      }, {} as Partial<InterviewAssets>);

      // Get public URLs for all files
      const prefix = `interviews/${sessionId}`;
      const urls = await Promise.all(
        Object.entries(latestFiles).map(async ([key, filename]) => {
          if (!filename) return [key, null];
          const { data: { publicUrl } } = supabase.storage
            .from(this.bucketName)
            .getPublicUrl(`${prefix}/${filename}`);
          return [key, publicUrl];
        })
      );

      // Convert to object
      const assets = Object.fromEntries(urls) as InterviewAssets;
      return assets;
    } catch (error) {
      console.error('Failed to get interview assets:', error);
      throw new Error('Failed to get interview assets');
    }
  }

  async deleteInterviewAssets(sessionId: string): Promise<void> {
    try {
      const prefix = `interviews/${sessionId}`;
      
      // List all files in the interview directory
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(prefix);

      if (error) throw error;
      if (!data?.length) return;

      // Delete all files
      const { error: deleteError } = await supabase.storage
        .from(this.bucketName)
        .remove(data.map(file => `${prefix}/${file.name}`));

      if (deleteError) throw deleteError;

      // Remove cleanup schedule
      await supabase
        .from('interview_cleanups')
        .delete()
        .eq('prefix', prefix);
    } catch (error) {
      console.error('Failed to delete interview assets:', error);
      throw new Error('Failed to delete interview assets');
    }
  }
} 