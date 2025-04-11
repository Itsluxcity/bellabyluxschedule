import { Message } from '@/types/chat';
import { redis } from '@/lib/redis';

// Redis key prefixes
const CALLBACK_PREFIX = 'lindy:callback:';
const TASK_PREFIX = 'lindy:task:';
const TTL = 300; // 5 minutes in seconds

/**
 * Store callback data for a thread
 * @param threadId The thread ID to store callback data for
 * @param data The callback data to store
 */
export async function setCallbackData(threadId: string, data: any): Promise<void> {
  const key = `${CALLBACK_PREFIX}${threadId}`;
  await redis.set(key, JSON.stringify(data), 'EX', TTL);
}

/**
 * Get callback data for a thread
 * @param threadId The thread ID to get callback data for
 */
export async function getCallbackData(threadId: string): Promise<any | null> {
  const key = `${CALLBACK_PREFIX}${threadId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Clear callback data for a thread
 * @param threadId The thread ID to clear callback data for
 */
export async function clearCallbackData(threadId: string): Promise<void> {
  const key = `${CALLBACK_PREFIX}${threadId}`;
  await redis.del(key);
}

/**
 * Wait for callback data for a thread
 * @param threadId The thread ID to wait for callback data for
 * @param timeoutMs Timeout in milliseconds (default: 5 minutes)
 */
export async function waitForCallback(threadId: string, timeoutMs: number = 5 * 60 * 1000): Promise<any | null> {
  const startTime = Date.now();
  const pollInterval = 5000; // Check every 5 seconds

  while (Date.now() - startTime < timeoutMs) {
    const data = await getCallbackData(threadId);
    if (data) {
      return data;
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return null;
}

/**
 * Store task data for a thread
 * @param threadId The thread ID to store task data for
 * @param data The task data to store
 */
export async function setTaskData(threadId: string, data: any): Promise<void> {
  const key = `${TASK_PREFIX}${threadId}`;
  await redis.set(key, JSON.stringify(data), 'EX', 3600); // 1 hour expiry
}

/**
 * Get task data for a thread
 * @param threadId The thread ID to get task data for
 */
export async function getTaskData(threadId: string): Promise<any | null> {
  const key = `${TASK_PREFIX}${threadId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
} 