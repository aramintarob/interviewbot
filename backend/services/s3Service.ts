import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { s3Client } from '../config/aws';
import { env } from '../config/env';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export class S3Service {
  private bucket: string;

  constructor() {
    if (!env.AWS_S3_BUCKET) {
      throw new Error('AWS S3 bucket is not configured');
    }
    this.bucket = env.AWS_S3_BUCKET;
  }

  /**
   * Upload a file to S3
   * @param file The file buffer to upload
   * @param prefix Optional prefix for the S3 key (folder path)
   * @returns The S3 URL of the uploaded file
   */
  async uploadFile(file: Buffer, prefix = ''): Promise<string> {
    try {
      const key = prefix ? `${prefix}/${uuidv4()}` : uuidv4();
      
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: file,
          ContentType: 'audio/mpeg',
        },
      });

      await upload.done();
      logger.info(`File uploaded successfully to S3: ${key}`);
      
      return `https://${this.bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      logger.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Get a file from S3
   * @param key The S3 key of the file
   * @returns The file buffer
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await s3Client.send(command);
      const chunks: Uint8Array[] = [];
      
      // @ts-ignore - TypeScript doesn't recognize response.Body as a readable stream
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('Error getting file from S3:', error);
      throw new Error('Failed to get file from S3');
    }
  }

  /**
   * Delete a file from S3
   * @param key The S3 key of the file to delete
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await s3Client.send(command);
      logger.info(`File deleted successfully from S3: ${key}`);
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file from S3');
    }
  }
} 