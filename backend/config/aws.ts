import { S3Client } from '@aws-sdk/client-s3';
import { SESClient } from '@aws-sdk/client-ses';
import { env } from './env';

// Validate AWS credentials
if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('AWS credentials are not configured');
}

// Common AWS configuration
const awsConfig = {
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
};

// Initialize S3 client
export const s3Client = new S3Client(awsConfig);

// Initialize SES client
export const sesClient = new SESClient(awsConfig); 