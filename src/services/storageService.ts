import { supabase } from '@/lib/supabase';

export class StorageService {
  private readonly bucketName = 'interview-recordings';

  constructor() {
    this.initializeBucket();
  }

  private async initializeBucket() {
    try {
      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        // Create bucket if it doesn't exist
        const { error } = await supabase.storage.createBucket(this.bucketName, {
          public: false, // Private by default
          fileSizeLimit: 52428800, // 50MB limit
          allowedMimeTypes: ['audio/webm', 'audio/wav', 'audio/mpeg']
        });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Failed to initialize storage bucket:', error);
      throw new Error('Storage initialization failed');
    }
  }

  async uploadRecording(
    audioBlob: Blob,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    try {
      // Generate a unique filename
      const timestamp = new Date().toISOString();
      const filename = `${userId}/${timestamp}.webm`;

      // Upload the file
      const { error: uploadError, data } = await supabase.storage
        .from(this.bucketName)
        .upload(filename, audioBlob, {
          contentType: 'audio/webm',
          upsert: false,
          metadata
        });

      if (uploadError) throw uploadError;
      if (!data?.path) throw new Error('Upload failed - no path returned');

      // Get the public URL (if needed)
      const { data: { publicUrl } } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Failed to upload recording:', error);
      throw new Error('Failed to upload recording');
    }
  }

  async getRecording(path: string): Promise<Blob> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(path);

      if (error) throw error;
      if (!data) throw new Error('No data received');

      return data;
    } catch (error) {
      console.error('Failed to download recording:', error);
      throw new Error('Failed to download recording');
    }
  }

  async listRecordings(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(userId);

      if (error) throw error;
      if (!data) return [];

      return data.map(file => file.name);
    } catch (error) {
      console.error('Failed to list recordings:', error);
      throw new Error('Failed to list recordings');
    }
  }

  async deleteRecording(path: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([path]);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete recording:', error);
      throw new Error('Failed to delete recording');
    }
  }
} 