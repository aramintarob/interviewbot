import logger from '../config/logger';

interface ResourceMetrics {
  s3Storage: {
    totalSize: number;
    fileCount: number;
  };
  emailsSent: number;
  errors: {
    count: number;
    lastError?: Error;
  };
}

export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: ResourceMetrics;
  private readonly metricsInterval: NodeJS.Timeout;

  private constructor() {
    this.metrics = {
      s3Storage: {
        totalSize: 0,
        fileCount: 0,
      },
      emailsSent: 0,
      errors: {
        count: 0,
      },
    };

    // Update metrics every 5 minutes
    this.metricsInterval = setInterval(() => {
      this.logMetrics();
    }, 5 * 60 * 1000);
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Track S3 file upload
   * @param size File size in bytes
   */
  trackS3Upload(size: number): void {
    this.metrics.s3Storage.totalSize += size;
    this.metrics.s3Storage.fileCount += 1;
  }

  /**
   * Track email sent
   */
  trackEmailSent(): void {
    this.metrics.emailsSent += 1;
  }

  /**
   * Track error occurrence
   * @param error Error object
   */
  trackError(error: Error): void {
    this.metrics.errors.count += 1;
    this.metrics.errors.lastError = error;
    logger.error('Error tracked:', error);
  }

  /**
   * Get current metrics
   */
  getMetrics(): ResourceMetrics {
    return { ...this.metrics };
  }

  /**
   * Log current metrics
   */
  private logMetrics(): void {
    const { s3Storage, emailsSent, errors } = this.metrics;
    logger.info('Current metrics:', {
      s3Storage: {
        totalSize: `${(s3Storage.totalSize / 1024 / 1024).toFixed(2)} MB`,
        fileCount: s3Storage.fileCount,
      },
      emailsSent,
      errors: {
        count: errors.count,
        lastError: errors.lastError?.message,
      },
    });
  }

  /**
   * Clean up monitoring service
   */
  cleanup(): void {
    clearInterval(this.metricsInterval);
  }
} 