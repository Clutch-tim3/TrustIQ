import Redis from 'ioredis';

let _client: Redis | null = null;
let _available = false;

const url = process.env.REDIS_URL;

if (url) {
  _client = new Redis(url, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 5) {
        console.warn('[redis] Max retries reached — Redis disabled for this session');
        return null; // stop retrying
      }
      return Math.min(times * 1000, 5000);
    },
  });

  _client.on('ready', () => {
    _available = true;
    console.log('[redis] Connected');
  });

  _client.on('error', (err: Error) => {
    if (_available) {
      console.warn('[redis] Connection lost:', err.message);
    }
    _available = false;
  });

  _client.on('close', () => {
    _available = false;
  });
} else {
  console.log('[redis] No REDIS_URL set — using in-memory fallbacks throughout');
}

export const isRedisAvailable = (): boolean => _available;

export const redisClient: Redis | null = _client;

export default _client;
