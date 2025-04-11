import Redis from 'ioredis';

// Create a Redis client
// In production, use environment variables for connection details
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default redis; 