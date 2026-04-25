/**
 * Queue Manager Tests
 * 
 * Integration and unit tests for the QueueManager class.
 * Tests queue initialization, job enqueueing, and lifecycle management.
 */

import { QueueManager } from './queue-manager';
import { JobType } from './types';
import { RetryPolicyManager } from './retry-manager';

describe('QueueManager', () => {
  let queueManager: QueueManager;

  beforeEach(() => {
    queueManager = QueueManager.getInstance();
  });

  afterEach(async () => {
    await queueManager.shutdown();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = QueueManager.getInstance();
      const instance2 = QueueManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Queue Initialization', () => {
    it('should initialize a queue for a job type', async () => {
      await expect(
        queueManager.initializeQueue(JobType.EMAIL_NOTIFICATION)
      ).resolves.not.toThrow();
    });

    it('should handle multiple initializations of the same queue', async () => {
      await queueManager.initializeQueue(JobType.EMAIL_NOTIFICATION);
      await expect(
        queueManager.initializeQueue(JobType.EMAIL_NOTIFICATION)
      ).resolves.not.toThrow();
    });

    it('should initialize all job types', async () => {
      const initPromises = Object.values(JobType).map((type) =>
        queueManager.initializeQueue(type)
      );
      await expect(Promise.all(initPromises)).resolves.not.toThrow();
    });
  });

  describe('Job Enqueueing', () => {
    beforeEach(async () => {
      await queueManager.initializeQueue(JobType.EMAIL_NOTIFICATION);
    });

    it('should add a job to the queue', async () => {
      const payload = {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test',
      };

      const jobId = await queueManager.addJob(JobType.EMAIL_NOTIFICATION, payload);
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });

    it('should add a job with priority', async () => {
      const payload = {
        to: 'urgent@example.com',
        subject: 'Urgent',
        body: 'High priority',
      };

      const jobId = await queueManager.addJob(
        JobType.EMAIL_NOTIFICATION,
        payload,
        { priority: 1 }
      );
      expect(jobId).toBeDefined();
    });

    it('should add a delayed job', async () => {
      const payload = {
        to: 'delayed@example.com',
        subject: 'Delayed',
        body: 'Send later',
      };

      const jobId = await queueManager.addJob(
        JobType.EMAIL_NOTIFICATION,
        payload,
        { delay: 50 }
      );
      expect(jobId).toBeDefined();
    });

    it('should throw error when queue not initialized', async () => {
      await expect(
        queueManager.addJob(JobType.CONTRACT_PROCESSING, {
          contractId: 'test',
          action: 'create',
        })
      ).rejects.toThrow('Queue for contract-processing not initialized');
    });
  });

  describe('Job Status', () => {
    beforeEach(async () => {
      await queueManager.initializeQueue(JobType.EMAIL_NOTIFICATION);
    });

    it('should get job status', async () => {
      const payload = {
        to: 'status@example.com',
        subject: 'Status Test',
        body: 'Check status',
      };

      const jobId = await queueManager.addJob(JobType.EMAIL_NOTIFICATION, payload);
      
      await new Promise((resolve) => setTimeout(resolve, 150));

      const status = await queueManager.getJobStatus(
        JobType.EMAIL_NOTIFICATION,
        jobId
      );
      expect(status).toBeDefined();
      expect(status?.id).toBe(jobId);
    });

    it('should return null for non-existent job', async () => {
      const status = await queueManager.getJobStatus(
        JobType.EMAIL_NOTIFICATION,
        'non-existent-id'
      );
      expect(status).toBeNull();
    });

    it('should throw error when queue not initialized', async () => {
      await expect(
        queueManager.getJobStatus(JobType.BLOCKCHAIN_SYNC, 'some-id')
      ).rejects.toThrow('Queue for blockchain-sync not initialized');
    });
  });

  describe('Graceful Shutdown', () => {
    it('should shutdown without errors', async () => {
      await queueManager.initializeQueue(JobType.EMAIL_NOTIFICATION);
      await expect(queueManager.shutdown()).resolves.not.toThrow();
    });

    it('should handle multiple shutdown calls', async () => {
      await queueManager.initializeQueue(JobType.EMAIL_NOTIFICATION);
      await queueManager.shutdown();
      await expect(queueManager.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Retry Policy Integration', () => {
    it('should provide access to retry manager', () => {
      const retryManager = queueManager.getRetryManager();
      expect(retryManager).toBeInstanceOf(RetryPolicyManager);
    });

    it('should use retry policies when initializing queues', async () => {
      const retryManager = queueManager.getRetryManager();
      
      // Get default policy for email notifications
      const emailPolicy = retryManager.getRetryPolicy(JobType.EMAIL_NOTIFICATION);
      expect(emailPolicy.attempts).toBe(5);
      expect(emailPolicy.backoff.type).toBe('exponential');
      
      // Initialize queue (should use retry policy)
      await queueManager.initializeQueue(JobType.EMAIL_NOTIFICATION);
      
      // Verify policy is still accessible
      const retrievedPolicy = retryManager.getRetryPolicy(JobType.EMAIL_NOTIFICATION);
      expect(retrievedPolicy.attempts).toBe(emailPolicy.attempts);
    });

    it('should allow updating retry policies', async () => {
      const retryManager = queueManager.getRetryManager();
      
      // Update retry policy
      retryManager.updateRetryPolicy(JobType.EMAIL_NOTIFICATION, {
        attempts: 7,
      });
      
      const updatedPolicy = retryManager.getRetryPolicy(JobType.EMAIL_NOTIFICATION);
      expect(updatedPolicy.attempts).toBe(7);
      
      // Initialize queue with updated policy
      await queueManager.initializeQueue(JobType.EMAIL_NOTIFICATION);
      
      // Policy should still be updated
      const currentPolicy = retryManager.getRetryPolicy(JobType.EMAIL_NOTIFICATION);
      expect(currentPolicy.attempts).toBe(7);
    });

    it('should provide retry policy statistics', () => {
      const retryManager = queueManager.getRetryManager();
      const stats = retryManager.getStatistics();
      
      expect(stats).toHaveProperty('totalPolicies');
      expect(stats).toHaveProperty('customPolicies');
      expect(stats).toHaveProperty('policiesByType');
      
      expect(stats.totalPolicies).toBeGreaterThan(0);
      expect(Object.keys(stats.policiesByType)).toContain(JobType.EMAIL_NOTIFICATION);
    });
  });
});
