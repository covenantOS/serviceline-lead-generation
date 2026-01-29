/**
 * Bull Queue Configuration
 * Centralized queue management for autonomous processing
 */

const Queue = require('bull');
const Redis = require('ioredis');
const logger = require('../utils/logger');

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// Create Redis client for manual operations
const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
  logger.info('Redis client connected successfully');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

// Queue configuration defaults
const defaultQueueOptions = {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500 // Keep last 500 failed jobs for debugging
  }
};

// Create queues
const queues = {
  // Scraping queue - for web scraping jobs
  scraping: new Queue('scraping', {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      timeout: 600000, // 10 minutes timeout
      attempts: 2 // Less retries for scraping (avoid bans)
    }
  }),

  // Scoring queue - for lead scoring
  scoring: new Queue('scoring', {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      timeout: 60000 // 1 minute timeout
    }
  }),

  // Email queue - for sending emails
  email: new Queue('email', {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      timeout: 30000, // 30 seconds timeout
      attempts: 5 // More retries for emails
    }
  }),

  // Campaign queue - for automated campaigns
  campaign: new Queue('campaign', {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      timeout: 300000 // 5 minutes timeout
    }
  }),

  // Follow-up queue - for automated follow-ups
  followup: new Queue('followup', {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      timeout: 120000 // 2 minutes timeout
    }
  }),

  // Enrichment queue - for lead enrichment
  enrichment: new Queue('enrichment', {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      timeout: 90000 // 1.5 minutes timeout
    }
  })
};

// Setup event listeners for all queues
Object.entries(queues).forEach(([name, queue]) => {
  queue.on('error', (error) => {
    logger.error(`Queue ${name} error:`, error);
  });

  queue.on('waiting', (jobId) => {
    logger.debug(`Job ${jobId} waiting in ${name} queue`);
  });

  queue.on('active', (job) => {
    logger.info(`Job ${job.id} started in ${name} queue`, { jobData: job.data });
  });

  queue.on('completed', (job, result) => {
    logger.info(`Job ${job.id} completed in ${name} queue`, { 
      duration: Date.now() - job.timestamp,
      result: result 
    });
  });

  queue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed in ${name} queue`, {
      error: err.message,
      stack: err.stack,
      attempts: job.attemptsMade
    });
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} stalled in ${name} queue`);
  });
});

/**
 * Add job to queue with priority
 */
async function addJob(queueName, jobType, data, options = {}) {
  try {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.add(jobType, data, {
      priority: options.priority || 5,
      delay: options.delay || 0,
      jobId: options.jobId,
      ...options
    });

    logger.info(`Job ${job.id} added to ${queueName} queue`, { 
      type: jobType, 
      data: data 
    });

    return job;
  } catch (error) {
    logger.error(`Failed to add job to ${queueName} queue:`, error);
    throw error;
  }
}

/**
 * Get queue statistics
 */
async function getQueueStats(queueName) {
  try {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  } catch (error) {
    logger.error(`Failed to get stats for ${queueName} queue:`, error);
    throw error;
  }
}

/**
 * Get all queue statistics
 */
async function getAllQueueStats() {
  const stats = {};
  for (const queueName of Object.keys(queues)) {
    stats[queueName] = await getQueueStats(queueName);
  }
  return stats;
}

/**
 * Clean old jobs from queue
 */
async function cleanQueue(queueName, grace = 86400000) {
  try {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
    
    logger.info(`Cleaned old jobs from ${queueName} queue`);
  } catch (error) {
    logger.error(`Failed to clean ${queueName} queue:`, error);
    throw error;
  }
}

/**
 * Pause queue
 */
async function pauseQueue(queueName) {
  try {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    logger.info(`Queue ${queueName} paused`);
  } catch (error) {
    logger.error(`Failed to pause ${queueName} queue:`, error);
    throw error;
  }
}

/**
 * Resume queue
 */
async function resumeQueue(queueName) {
  try {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    logger.info(`Queue ${queueName} resumed`);
  } catch (error) {
    logger.error(`Failed to resume ${queueName} queue:`, error);
    throw error;
  }
}

/**
 * Shutdown all queues gracefully
 */
async function shutdownQueues() {
  logger.info('Shutting down all queues...');
  
  const closePromises = Object.entries(queues).map(([name, queue]) => {
    return queue.close().then(() => {
      logger.info(`Queue ${name} closed`);
    });
  });

  await Promise.all(closePromises);
  await redisClient.quit();
  logger.info('All queues shut down successfully');
}

// Graceful shutdown handlers
process.on('SIGTERM', shutdownQueues);
process.on('SIGINT', shutdownQueues);

module.exports = {
  queues,
  redisClient,
  addJob,
  getQueueStats,
  getAllQueueStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  shutdownQueues
};
