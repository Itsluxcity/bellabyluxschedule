import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { LindyResponse } from '@/app/api/lindy/utils';
import path from 'path';
import fs from 'fs';

// Define the data structure
interface DbData {
  taskIds: Record<string, string>;
  callbacks: Record<string, LindyResponse[]>;
}

// Create the database directory if it doesn't exist
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize the database
const db = new Low<DbData>(new JSONFile(path.join(dbDir, 'db.json')), { taskIds: {}, callbacks: {} });

// Initialize with default data if needed
async function initDb() {
  await db.read();
  db.data ||= { taskIds: {}, callbacks: {} };
  await db.write();
}

// Initialize the database
initDb().catch(console.error);

// Task ID functions
export async function setLastTaskId(threadId: string, taskId: string) {
  await db.read();
  db.data ||= { taskIds: {}, callbacks: {} };
  db.data.taskIds[threadId] = taskId;
  await db.write();
  console.log(`Stored task ID ${taskId} for thread ${threadId}`);
}

export async function getLastTaskId(threadId: string): Promise<string | undefined> {
  await db.read();
  return db.data?.taskIds[threadId];
}

// Callback functions
export async function setCallbackResponse(threadId: string, response: LindyResponse) {
  await db.read();
  db.data ||= { taskIds: {}, callbacks: {} };
  
  if (!db.data.callbacks[threadId]) {
    db.data.callbacks[threadId] = [];
  }
  
  db.data.callbacks[threadId].push(response);
  await db.write();
  console.log(`Stored callback response for thread ${threadId}. Total responses: ${db.data.callbacks[threadId].length}`);
}

export async function getCallbackResponses(threadId: string): Promise<LindyResponse[]> {
  await db.read();
  return db.data?.callbacks[threadId] || [];
}

export async function removeCallbackResponse(threadId: string): Promise<LindyResponse | null> {
  await db.read();
  if (!db.data?.callbacks[threadId] || db.data.callbacks[threadId].length === 0) {
    return null;
  }
  
  const response = db.data.callbacks[threadId].shift();
  
  if (db.data.callbacks[threadId].length === 0) {
    delete db.data.callbacks[threadId];
  }
  
  await db.write();
  return response || null;
}

export async function waitForCallback(threadId: string, timeout: number = 300000): Promise<LindyResponse | null> {
  console.log(`Starting to wait for callback for thread ${threadId}. Will wait for ${timeout/1000} seconds.`);
  const startTime = Date.now();
  let pollCount = 0;
  const pollInterval = 1000; // Poll every 1 second
  
  while (Date.now() - startTime < timeout) {
    pollCount++;
    const response = await removeCallbackResponse(threadId);
    
    if (response) {
      console.log(`Found callback response for thread ${threadId} after ${pollCount} polls:`, response);
      return response;
    }
    
    // Log less frequently to reduce noise
    if (pollCount % 5 === 0) { // Log every 5 seconds
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      console.log(`Still waiting for callback for thread ${threadId}. Polled ${pollCount} times. Elapsed: ${elapsedSeconds.toFixed(1)}s`);
    }
    
    // Use a more reliable sleep mechanism
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  console.log(`Timeout reached for thread ${threadId} after ${timeout/1000} seconds and ${pollCount} polls.`);
  return null;
} 