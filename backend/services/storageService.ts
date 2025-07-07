import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../server';

export class StorageService {
  private readonly bucketName: string;

  constructor() {
    const bucketName = process.env.AWS_S3_BUCKET;
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET environment variable is required');
    }
    this.bucketName = bucketName;
  }

  async uploadFile(
    data: Buffer,
    key: string,
    contentType: string
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: data,
        ContentType: contentType,
      });

      await s3Client.send(command);
      
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file');
    }
  }

  async uploadInterview(
    audioBlob: Buffer,
    transcriptText: string,
    interviewId: string
  ): Promise<{ audioUrl: string; transcriptUrl: string }> {
    const timestamp = new Date().toISOString();
    const audioKey = `interviews/${interviewId}/audio-${timestamp}.webm`;
    const transcriptKey = `interviews/${interviewId}/transcript-${timestamp}.txt`;

    const [audioUrl, transcriptUrl] = await Promise.all([
      this.uploadFile(audioBlob, audioKey, 'audio/webm'),
      this.uploadFile(
        Buffer.from(transcriptText, 'utf-8'),
        transcriptKey,
        'text/plain'
      ),
    ]);

    return {
      audioUrl,
      transcriptUrl,
    };
  }
} 