import { Message } from '@/types/chat';

// In-memory storage
const callbackStore = new Map<string, any>();
const taskStore = new Map<string, any>();

/**
 * Store callback data for a thread
 * @param threadId The thread ID to store callback data for
 * @param data The callback data to store
 */
export async function setCallbackData(threadId: string, data: any): Promise<void> {
  callbackStore.set(threadId, data);
}

/**
 * Get callback data for a thread
 * @param threadId The thread ID to get callback data for
 */
export async function getCallbackData(threadId: string): Promise<any | null> {
  return callbackStore.get(threadId) || null;
}

/**
 * Clear callback data for a thread
 * @param threadId The thread ID to clear callback data for
 */
export async function clearCallbackData(threadId: string): Promise<void> {
  callbackStore.delete(threadId);
}

/**
 * Wait for callback data for a thread
 * @param threadId The thread ID to wait for callback data for
 * @param timeoutMs Timeout in milliseconds (default: 5 minutes)
 */
export async function waitForCallback(threadId: string, timeoutMs: number = 5 * 60 * 1000): Promise<any | null> {
  console.log(`Starting to wait for callback for threadId ${threadId}`);
  console.log(`Timeout: ${timeoutMs}ms`);
  
  const startTime = Date.now();
  const pollInterval = 5000; // Check every 5 seconds
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
    console.log(`No callback data yet, waiting ${pollInterval}ms before next poll...`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  // Timeout reached
  console.log(`Timeout reached after ${pollCount} polls. No callback data received.`);
  return null;
}

/**
 * Store task data for a thread
 * @param threadId The thread ID to store task data for
 * @param data The task data to store
 */
export async function setTaskData(threadId: string, data: any): Promise<void> {
  taskStore.set(threadId, data);
}

/**
 * Get task data for a thread
 * @param threadId The thread ID to get task data for
 */
export async function getTaskData(threadId: string): Promise<any | null> {
  return taskStore.get(threadId) || null;
} 