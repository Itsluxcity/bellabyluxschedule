import { NextResponse } from 'next/server';
import { createThread, getLastTaskId, setLastTaskId, waitForCallback } from './store';

// Get configuration from environment variables
const LINDY_WEBHOOK_URL = process.env.LINDY_WEBHOOK_URL || 'https://public.lindy.ai/api/v1/webhooks/lindy/6fdd874b-1e87-48ec-a401-f81546c4ce54';
const LINDY_SECRET_KEY = process.env.LINDY_SECRET_KEY || 'ceddc1d497adf098fb3564709ebf7f01824ee74a2c3ba8492f43b2d06b3f8681';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CALLBACK_URL = `${BASE_URL}/api/lindy/callback`;

interface LindyRequest {
  content: string;
  callbackUrl: string;
  taskId?: string;
  handleInSameTask: boolean;
  schedulingDetails?: {
    date?: string;
    time?: string;
    duration?: string;
    purpose?: string;
    participants?: string[];
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request:', body);

    // Ensure we have required fields
    if (!body.content || !body.threadId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get or create thread
    createThread(body.threadId);
    const lastTaskId = getLastTaskId(body.threadId);

    const lindyRequest: LindyRequest = {
      content: body.content,
      callbackUrl: `${CALLBACK_URL}?threadId=${body.threadId}`,
      handleInSameTask: true,
      schedulingDetails: body.schedulingDetails || {}
    };

    // If we have a previous task ID, include it
    if (lastTaskId) {
      lindyRequest.taskId = lastTaskId;
    }

    console.log('Sending to Lindy:', lindyRequest);

    // Send message to Lindy
    const lindyResponse = await fetch(LINDY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINDY_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lindyRequest)
    });

    if (!lindyResponse.ok) {
      const errorText = await lindyResponse.text();
      console.error('Lindy API error:', errorText);
      throw new Error(`Failed to get response from Lindy: ${errorText}`);
    }

    // Parse the response to get the task ID
    const responseData = await lindyResponse.json();
    console.log('Lindy initial response:', responseData);
    
    if (responseData.taskId) {
      setLastTaskId(body.threadId, responseData.taskId);
    }

    try {
      // Wait for callback response with a timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Callback timeout')), 30000); // 30 second timeout
      });

      // Wait for either the callback or timeout
      const callbackData = await Promise.race([
        waitForCallback(body.threadId),
        timeoutPromise
      ]);

      console.log('Received callback data:', callbackData);
      return NextResponse.json(callbackData);
    } catch (timeoutError) {
      console.error('Callback timeout:', timeoutError);
      return NextResponse.json({ 
        error: 'Timeout waiting for Lindy response',
        details: 'The request was sent successfully, but no response was received in time.'
      }, { status: 504 });
    }
    
  } catch (error: any) {
    console.error('Full error details:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process message', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 