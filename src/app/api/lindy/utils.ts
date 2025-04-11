export interface SchedulingDetails {
  date?: string;
  time?: string;
  duration?: string;
  purpose?: string;
  participants?: string[];
}

export interface LindyRequest {
  message: string;
  taskId?: string;
  handleInSameTask: boolean;
  schedulingDetails?: SchedulingDetails;
  callbackUrl: string;
}

export interface LindyResponse {
  content: string;
  taskId?: string;
  requiresDetails?: boolean;
  schedulingDetails?: SchedulingDetails;
}

// Store task IDs for each thread
const taskIds = new Map<string, string>();

export function setLastTaskId(threadId: string, taskId: string) {
  taskIds.set(threadId, taskId);
}

export function getLastTaskId(threadId: string): string | undefined {
  return taskIds.get(threadId);
}

// Store callback responses
const callbackResponses = new Map<string, LindyResponse>();

export function setCallbackResponse(threadId: string, response: LindyResponse) {
  callbackResponses.set(threadId, response);
  console.log('Stored callback response for thread:', threadId, response);
}

export async function waitForCallback(threadId: string, timeout: number = 300000): Promise<LindyResponse | null> {
  console.log(`Starting to wait for callback for thread ${threadId}. Will wait for ${timeout/1000} seconds.`);
  const startTime = Date.now();
  let pollCount = 0;
  
  while (Date.now() - startTime < timeout) {
    pollCount++;
    const response = callbackResponses.get(threadId);
    if (response) {
      console.log(`Found callback response for thread ${threadId} after ${pollCount} polls:`, response);
      callbackResponses.delete(threadId); // Clean up
      return response;
    }
    if (pollCount % 50 === 0) { // Log every ~5 seconds
      console.log(`Still waiting for callback for thread ${threadId}. Polled ${pollCount} times. Elapsed: ${(Date.now() - startTime)/1000}s`);
    }
    await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100ms
  }
  
  console.log(`Timeout reached for thread ${threadId} after ${timeout/1000} seconds and ${pollCount} polls.`);
  return null;
} 