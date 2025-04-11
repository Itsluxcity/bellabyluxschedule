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
  try {
    const key = `${CALLBACK_KEY_PREFIX}${threadId}`;
    console.log(`Setting callback data for key: ${key}`);
    await redis.set(key, JSON.stringify(data), 'EX', 300); // Expire after 5 minutes
    console.log(`Successfully set callback data for key: ${key}`);
  } catch (error) {
    console.error(`Error setting callback data for threadId ${threadId}:`, error);
    throw error;
  }
}

/**
 * Get callback data from Redis
 * @param threadId The thread ID to retrieve callback data for
 */
export async function getCallbackData(threadId: string): Promise<Message | null> {
  try {
    const key = `${CALLBACK_KEY_PREFIX}${threadId}`;
    console.log(`Getting callback data for key: ${key}`);
    const data = await redis.get(key);
    console.log(`Callback data for key ${key}:`, data ? 'Found' : 'Not found');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error getting callback data for threadId ${threadId}:`, error);
    return null;
  }
}

/**
 * Clear callback data from Redis
 * @param threadId The thread ID to clear callback data for
 */
export async function clearCallbackData(threadId: string): Promise<void> {
  try {
    const key = `${CALLBACK_KEY_PREFIX}${threadId}`;
    console.log(`Clearing callback data for key: ${key}`);
    await redis.del(key);
    console.log(`Successfully cleared callback data for key: ${key}`);
  } catch (error) {
    console.error(`Error clearing callback data for threadId ${threadId}:`, error);
    throw error;
  }
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
  try {
    const key = `${TASK_KEY_PREFIX}${threadId}`;
    console.log(`Setting task data for key: ${key}`);
    await redis.set(key, JSON.stringify(data), 'EX', 3600); // Expire after 1 hour
    console.log(`Successfully set task data for key: ${key}`);
  } catch (error) {
    console.error(`Error setting task data for threadId ${threadId}:`, error);
    throw error;
  }
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
  try {
    const key = `${TASK_KEY_PREFIX}${threadId}`;
    console.log(`Getting task data for key: ${key}`);
    const data = await redis.get(key);
    console.log(`Task data for key ${key}:`, data ? 'Found' : 'Not found');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error getting task data for threadId ${threadId}:`, error);
    return null;
  }
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