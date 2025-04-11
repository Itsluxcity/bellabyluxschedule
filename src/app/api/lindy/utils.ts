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

export async function waitForCallback(threadId: string, timeout: number = 30000): Promise<LindyResponse | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const response = callbackResponses.get(threadId);
    if (response) {
      callbackResponses.delete(threadId); // Clean up
      return response;
    }
    await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100ms
  }
  return null;
} 