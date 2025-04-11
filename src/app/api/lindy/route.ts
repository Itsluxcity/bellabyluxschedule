import { NextResponse } from 'next/server';

interface SchedulingDetails {
  date?: string;
  time?: string;
  duration?: string;
  purpose?: string;
  participants?: string[];
}

interface LindyRequest {
  message: string;
  taskId?: string;
  handleInSameTask: boolean;
  schedulingDetails?: SchedulingDetails;
  callbackUrl: string;
}

interface LindyResponse {
  content: string;
  taskId?: string;
  requiresDetails?: boolean;
  schedulingDetails?: SchedulingDetails;
}

// Get configuration from environment variables
const LINDY_WEBHOOK_URL = 'https://public.lindy.ai/api/v1/webhooks/lindy/6fdd874b-1e87-48ec-a401-f81546c4ce54';
const LINDY_SECRET_KEY = 'ceddc1d497adf098fb3564709ebf7f01824ee74a2c3ba8492f43b2d06b3f8681';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CALLBACK_URL = `${BASE_URL}/api/lindy/callback`;

// Store task IDs for each thread
const taskIds = new Map<string, string>();

function setLastTaskId(threadId: string, taskId: string) {
  taskIds.set(threadId, taskId);
}

function getLastTaskId(threadId: string): string | undefined {
  return taskIds.get(threadId);
}

// Store callback responses
const callbackResponses = new Map<string, LindyResponse>();

function setCallbackResponse(threadId: string, response: LindyResponse) {
  callbackResponses.set(threadId, response);
}

async function waitForCallback(threadId: string, timeout: number = 30000): Promise<LindyResponse | null> {
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request:', body);

    // Ensure we have required fields
    if (!body.message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }
    if (!body.threadId) {
      return NextResponse.json({ error: 'No threadId provided' }, { status: 400 });
    }

    // Get the last task ID for this thread
    const lastTaskId = getLastTaskId(body.threadId);
    console.log('Last task ID:', lastTaskId);

    // Format the request exactly as Lindy expects
    const lindyRequest: LindyRequest = {
      message: body.message,
      callbackUrl: `${CALLBACK_URL}?threadId=${body.threadId}`,
      taskId: lastTaskId || undefined,
      handleInSameTask: true
    };

    if (body.schedulingDetails) {
      lindyRequest.schedulingDetails = body.schedulingDetails;
    }

    console.log('Sending to Lindy:', JSON.stringify(lindyRequest, null, 2));

    // Send message to Lindy
    const lindyResponse = await fetch(LINDY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINDY_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lindyRequest)
    });

    const responseText = await lindyResponse.text();
    console.log('Raw Lindy response:', responseText);
    console.log('Response status:', lindyResponse.status);
    console.log('Response headers:', Object.fromEntries(lindyResponse.headers.entries()));

    if (!lindyResponse.ok) {
      throw new Error(`Failed to get response from Lindy: ${responseText}`);
    }

    // Parse response as JSON
    let data: LindyResponse;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed Lindy response:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Failed to parse Lindy response:', e);
      throw new Error(`Failed to parse Lindy response: ${responseText}`);
    }

    // Store the task ID for this thread if one was returned
    if (data.taskId) {
      setLastTaskId(body.threadId, data.taskId);
      console.log('Stored task ID:', data.taskId);
    }

    // Wait for callback response
    console.log('Waiting for callback response...');
    const callbackResponse = await waitForCallback(body.threadId);
    if (!callbackResponse) {
      console.log('Callback timeout - no response received');
      return NextResponse.json({ error: 'Timeout waiting for response' }, { status: 504 });
    }

    console.log('Received callback response:', JSON.stringify(callbackResponse, null, 2));
    return NextResponse.json(callbackResponse);
    
  } catch (error: any) {
    console.error('Full error details:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process message', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 