// Simple in-memory store for callback data
interface CallbackData {
  content: string;
  schedulingDetails?: {
    date?: string;
    time?: string;
    duration?: number;
    [key: string]: any;
  };
}

let callbackData: CallbackData | null = null;

export function setCallbackData(data: CallbackData): void {
  callbackData = data;
}

export function getCallbackData(): CallbackData | null {
  return callbackData;
}

export function clearCallbackData(): void {
  callbackData = null;
} 