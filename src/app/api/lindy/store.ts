// Simple in-memory store for development
// In production, you'd want to use Redis or a database
interface ThreadStore {
  [threadId: string]: {
    pendingCallback?: {
      resolve: (value: any) => void;
      reject: (error: any) => void;
    };
    lastTaskId?: string;
  };
}

const store: ThreadStore = {};

export function createThread(threadId: string) {
  if (!store[threadId]) {
    store[threadId] = {};
  }
  return store[threadId];
}

export function getThread(threadId: string) {
  return store[threadId];
}

export function setLastTaskId(threadId: string, taskId: string) {
  if (!store[threadId]) {
    store[threadId] = {};
  }
  store[threadId].lastTaskId = taskId;
}

export function getLastTaskId(threadId: string) {
  return store[threadId]?.lastTaskId;
}

export function waitForCallback(threadId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!store[threadId]) {
      store[threadId] = {};
    }
    store[threadId].pendingCallback = { resolve, reject };
  });
}

export function resolveCallback(threadId: string, data: any) {
  const thread = store[threadId];
  if (thread?.pendingCallback) {
    thread.pendingCallback.resolve(data);
    delete thread.pendingCallback;
  }
}

export function rejectCallback(threadId: string, error: any) {
  const thread = store[threadId];
  if (thread?.pendingCallback) {
    thread.pendingCallback.reject(error);
    delete thread.pendingCallback;
  }
} 