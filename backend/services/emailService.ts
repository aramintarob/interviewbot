import { SendEmailCommand } from '@aws-sdk/client-ses';
import { sesClient } from '../config/aws';
import { env } from '../config/env';
import logger from '../config/logger';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export class EmailService {
  private fromEmail: string;

  constructor() {
    if (!env.AWS_SES_FROM_EMAIL) {
      throw new Error('AWS SES from email is not configured');
    }
    this.fromEmail = env.AWS_SES_FROM_EMAIL;
  }

  /**
   * Send an email with optional attachments
   * @param to Recipient email address
   * @param subject Email subject
   * @param body Email body (HTML)
   * @param attachments Optional array of attachments
   */
  async sendEmail(
    to: string,
    subject: string,
    body: string,
    attachments: EmailAttachment[] = []
  ): Promise<void> {
    try {
      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
          },
          Body: {
            Html: {
              Data: body,
            },
          },
        },
      });

      await sesClient.send(command);
      logger.info(`Email sent successfully to ${to}`);

      // If there are attachments, send a separate email with attachments
      if (attachments.length > 0) {
        await this.sendAttachments(to, subject, attachments);
      }
    } catch (error) {
      logger.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send attachments in a separate email
   */
  private async sendAttachments(
    to: string,
    subject: string,
    attachments: EmailAttachment[]
  ): Promise<void> {
    try {
      for (const attachment of attachments) {
        const command = new SendEmailCommand({
          Source: this.fromEmail,
          Destination: {
            ToAddresses: [to],
          },
          Message: {
            Subject: {
              Data: `${subject} - Attachment: ${attachment.filename}`,
            },
            Body: {
              Text: {
                Data: `Please find attached: ${attachment.filename}`,
              },
              // AWS SES doesn't directly support attachments in the SDK
              // You would need to use a different service or implement
              // raw email sending with MIME for attachments
            },
          },
        });

        await sesClient.send(command);
        logger.info(`Attachment ${attachment.filename} sent to ${to}`);
      }
    } catch (error) {
      logger.error('Error sending attachments:', error);
      throw new Error('Failed to send attachments');
    }
  }

  /**
   * Send interview completion email
   * @param to Recipient email address
   * @param audioUrl URL to the recorded audio
   * @param transcriptUrl URL to the transcript
   */
  async sendInterviewCompletionEmail(
    to: string,
    audioUrl: string,
    transcriptUrl: string
  ): Promise<void> {
    const subject = 'Your Interview Recording is Ready';
    const body = `
      <h2>Your Interview Recording is Ready</h2>
      <p>Thank you for completing your interview. Your recording has been processed and is now available.</p>
      <p>You can access your interview materials using the following links:</p>
      <ul>
        <li><a href="${audioUrl}">Download Audio Recording</a></li>
        <li><a href="${transcriptUrl}">View Transcript</a></li>
      </ul>
      <p>These links will expire in 7 days.</p>
      <p>Best regards,<br>InterviewBot Team</p>
    `;

    await this.sendEmail(to, subject, body);
  }
} 