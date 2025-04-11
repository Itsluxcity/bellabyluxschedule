import { Message } from '@/types/chat';
import { redis } from '@/lib/redis';

// Redis key prefixes
const CALLBACK_PREFIX = 'lindy:callback:';
const TASK_PREFIX = 'lindy:task:';
const TTL = 300; // 5 minutes in seconds

/**
 * Store callback data in Redis
 * @param threadId The thread ID to associate with the callback
 * @param data The callback data to store
 */
export async function setCallbackData(threadId: string, data: any): Promise<void> {
  const key = `${CALLBACK_PREFIX}${threadId}`;
  await redis.set(key, JSON.stringify(data), 'EX', TTL);
}

/**
 * Get callback data from Redis
 * @param threadId The thread ID to retrieve callback data for
 */
export async function getCallbackData(threadId: string): Promise<any | null> {
  const key = `${CALLBACK_PREFIX}${threadId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Clear callback data from Redis
 * @param threadId The thread ID to clear callback data for
 */
export async function clearCallbackData(threadId: string): Promise<void> {
  const key = `${CALLBACK_PREFIX}${threadId}`;
  await redis.del(key);
}

/**
 * Store task data in Redis
 * @param threadId The thread ID to associate with the task
 * @param data The task data to store
 */
export async function setTaskData(threadId: string, data: any): Promise<void> {
  const key = `${TASK_PREFIX}${threadId}`;
  await redis.set(key, JSON.stringify(data), 'EX', 3600); // 1 hour expiry
}

/**
 * Get task data from Redis
 * @param threadId The thread ID to retrieve task data for
 */
export async function getTaskData(threadId: string): Promise<any | null> {
  const key = `${TASK_PREFIX}${threadId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Wait for callback data with polling
 * @param threadId The thread ID to wait for
 * @param timeoutMs Maximum time to wait in milliseconds (default: 5 minutes)
 * @param pollIntervalMs Interval between polls in milliseconds (default: 5 seconds)
 */
export async function waitForCallback(
  threadId: string,
  timeoutMs: number = 5 * 60 * 1000,
  pollIntervalMs: number = 5 * 1000
): Promise<Message | null> {
  console.log(`Starting to wait for callback for threadId ${threadId}`);
  console.log(`Timeout: ${timeoutMs}ms, Poll interval: ${pollIntervalMs}ms`);
  
  const startTime = Date.now();
  let pollCount = 0;
  
  while (Date.now() - startTime < timeoutMs) {
    pollCount++;
    console.log(`Poll #${pollCount} for callback data...`);
    
    const data = await getCallbackData(threadId);
    if (data) {
      console.log(`Callback data found on poll #${pollCount}`);
      return data;
    }
    
    // Wait for the poll interval
    console.log(`No callback data yet, waiting ${pollIntervalMs}ms before next poll...`);
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  // Timeout reached
  console.log(`Timeout reached after ${pollCount} polls. No callback data received.`);
  return null;
} 