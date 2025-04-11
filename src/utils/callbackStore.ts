import { Message } from '@/types/chat';
import redis from '@/lib/redis';

// Redis key prefixes
const CALLBACK_KEY_PREFIX = 'callback:';
const TASK_KEY_PREFIX = 'task:';

/**
 * Store callback data in Redis
 * @param threadId The thread ID to associate with the callback
 * @param data The callback data to store
 */
export async function setCallbackData(threadId: string, data: Message): Promise<void> {
  const key = `${CALLBACK_KEY_PREFIX}${threadId}`;
  await redis.set(key, JSON.stringify(data), 'EX', 300); // Expire after 5 minutes
}

/**
 * Get callback data from Redis
 * @param threadId The thread ID to retrieve callback data for
 */
export async function getCallbackData(threadId: string): Promise<Message | null> {
  const key = `${CALLBACK_KEY_PREFIX}${threadId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Clear callback data from Redis
 * @param threadId The thread ID to clear callback data for
 */
export async function clearCallbackData(threadId: string): Promise<void> {
  const key = `${CALLBACK_KEY_PREFIX}${threadId}`;
  await redis.del(key);
}

/**
 * Store task data in Redis
 * @param threadId The thread ID to associate with the task
 * @param data The task data to store
 */
export async function setTaskData(threadId: string, data: {
  conversationId?: string;
  followUpUrl?: string;
  lastMessageId?: string;
}): Promise<void> {
  const key = `${TASK_KEY_PREFIX}${threadId}`;
  await redis.set(key, JSON.stringify(data), 'EX', 3600); // Expire after 1 hour
}

/**
 * Get task data from Redis
 * @param threadId The thread ID to retrieve task data for
 */
export async function getTaskData(threadId: string): Promise<{
  conversationId?: string;
  followUpUrl?: string;
  lastMessageId?: string;
} | null> {
  const key = `${TASK_KEY_PREFIX}${threadId}`;
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
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const data = await getCallbackData(threadId);
    if (data) {
      return data;
    }
    
    // Wait for the poll interval
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  // Timeout reached
  return null;
} 