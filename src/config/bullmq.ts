// Stub queue interface — matches the Queue.add() signature used in controllers
interface StubQueue {
  add(name: string, data: any, opts?: any): Promise<any>;
}

const stub: StubQueue = {
  add: async (name, _data, _opts) => {
    console.warn(`[bullmq] Redis unavailable — job "${name}" dropped (no-op stub queue)`);
    return null;
  },
};

let _queues: {
  eventQueue:          any;
  disposableEmailQueue: any;
  anomalyScannerQueue:  any;
  velocityCleanupQueue: any;
  profileUpdaterQueue:  any;
  workerOptions:        any;
} | null = null;

function initQueues() {
  if (!process.env.REDIS_URL) {
    console.log('[bullmq] No REDIS_URL — BullMQ disabled, using stub queues');
    return null;
  }
  try {
    // Dynamic require so the module loads even when Redis connection later fails
    const { Queue } = require('bullmq');
    const connection = {
      host:     process.env.REDIS_HOST || new URL(process.env.REDIS_URL).hostname,
      port:     parseInt(process.env.REDIS_PORT || String(new URL(process.env.REDIS_URL).port || '6379')),
      password: process.env.REDIS_PASSWORD,
      // Fail fast — don't block startup
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    };

    const queues = {
      eventQueue:           new Queue('event-processing',      { connection }),
      disposableEmailQueue: new Queue('disposable-email-sync', { connection }),
      anomalyScannerQueue:  new Queue('anomaly-scanning',      { connection }),
      velocityCleanupQueue: new Queue('velocity-cleanup',      { connection }),
      profileUpdaterQueue:  new Queue('profile-update',        { connection }),
      workerOptions: { concurrency: 10, connection },
    };

    // Silence connection errors on individual queues so they don't crash the process
    for (const [name, q] of Object.entries(queues)) {
      if (q && typeof (q as any).on === 'function') {
        (q as any).on('error', (err: Error) => {
          console.warn(`[bullmq] Queue "${name}" error:`, err.message);
        });
      }
    }

    return queues;
  } catch (err: any) {
    console.warn('[bullmq] Failed to initialise queues:', err.message);
    return null;
  }
}

// Initialise once on startup
_queues = initQueues();

export const eventQueue:           StubQueue = _queues?.eventQueue           ?? stub;
export const disposableEmailQueue: StubQueue = _queues?.disposableEmailQueue ?? stub;
export const anomalyScannerQueue:  StubQueue = _queues?.anomalyScannerQueue  ?? stub;
export const velocityCleanupQueue: StubQueue = _queues?.velocityCleanupQueue ?? stub;
export const profileUpdaterQueue:  StubQueue = _queues?.profileUpdaterQueue  ?? stub;
export const workerOptions                   = _queues?.workerOptions        ?? { concurrency: 10, connection: {} };
