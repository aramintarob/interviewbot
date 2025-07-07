import { SendEmailCommand } from '@aws-sdk/client-ses';
import { sesClient } from '../server';

interface InterviewNotificationData {
  interviewId: string;
  audioUrl: string;
  transcriptUrl: string;
  duration: number;
}

export class EmailService {
  private readonly fromEmail: string;

  constructor() {
    const fromEmail = process.env.AWS_SES_FROM_EMAIL;
    if (!fromEmail) {
      throw new Error('AWS_SES_FROM_EMAIL environment variable is required');
    }
    this.fromEmail = fromEmail;
  }

  async sendInterviewNotification(
    toEmail: string,
    data: InterviewNotificationData
  ): Promise<void> {
    const { interviewId, audioUrl, transcriptUrl, duration } = data;

    const command = new SendEmailCommand({
      Source: this.fromEmail,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: `Interview ${interviewId} Completed`,
        },
        Body: {
          Html: {
            Data: `
              <h1>Interview Recording Complete</h1>
              <p>The interview session has been completed and processed.</p>
              
              <h2>Interview Details:</h2>
              <ul>
                <li>Interview ID: ${interviewId}</li>
                <li>Duration: ${Math.round(duration / 60)} minutes</li>
              </ul>
              
              <h2>Downloads:</h2>
              <p>
                <a href="${audioUrl}">Download Audio Recording</a>
              </p>
              <p>
                <a href="${transcriptUrl}">Download Transcript</a>
              </p>
              
              <p>
                The files will be available for download for the next 30 days.
              </p>
            `,
          },
          Text: {
            Data: `
Interview Recording Complete

The interview session has been completed and processed.

Interview Details:
- Interview ID: ${interviewId}
- Duration: ${Math.round(duration / 60)} minutes

Downloads:
- Audio Recording: ${audioUrl}
- Transcript: ${transcriptUrl}

The files will be available for download for the next 30 days.
            `,
          },
        },
      },
    });

    try {
      await sesClient.send(command);
    } catch (error) {
      console.error('Error sending email notification:', error);
      throw new Error('Failed to send email notification');
    }
  }
} 