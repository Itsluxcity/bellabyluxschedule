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
  conversationId?: string;
}

export interface LindyResponse {
  content: string;
  taskId?: string;
  requiresDetails?: boolean;
  schedulingDetails?: SchedulingDetails;
  followUpUrl?: string;
  conversationId?: string;
}

// Store task IDs and followUpUrls for each thread
const taskData = new Map<string, { taskId: string; followUpUrl?: string; conversationId?: string }>();

export function setTaskData(threadId: string, data: { taskId: string; followUpUrl?: string; conversationId?: string }) {
  taskData.set(threadId, data);
  console.log('Stored task data for thread:', threadId, data);
}

export function getTaskData(threadId: string) {
  return taskData.get(threadId);
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