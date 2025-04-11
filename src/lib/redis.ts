import Redis from 'ioredis';

// Create a Redis client
// In production, use environment variables for connection details
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
console.log('Connecting to Redis at:', redisUrl);

const redis = new Redis(redisUrl);

// Add error handling
redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('Successfully connected to Redis');
});

export default redis; 