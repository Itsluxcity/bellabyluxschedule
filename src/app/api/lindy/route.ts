import { NextResponse } from 'next/server';
import { 
  LindyRequest, 
  LindyResponse, 
  getLastTaskId, 
  setLastTaskId, 
  waitForCallback 
} from './utils';

// Get configuration from environment variables
const LINDY_WEBHOOK_URL = 'https://public.lindy.ai/api/v1/webhooks/lindy/6fdd874b-1e87-48ec-a401-f81546c4ce54';
const LINDY_SECRET_KEY = 'ceddc1d497adf098fb3564709ebf7f01824ee74a2c3ba8492f43b2d06b3f8681';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CALLBACK_URL = `${BASE_URL}/api/lindy/callback`;

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

    // Wait for 2 seconds to give Lindy time to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    const responseText = await lindyResponse.text();
    console.log('Raw Lindy response:', responseText);
    console.log('Response status:', lindyResponse.status);
    console.log('Response headers:', Object.fromEntries(lindyResponse.headers.entries()));

    if (!lindyResponse.ok) {
      // Wait for callback response even if initial response fails
      console.log('Initial response not OK, waiting for callback...');
      const callbackResponse = await waitForCallback(body.threadId);
      if (callbackResponse) {
        return NextResponse.json(callbackResponse);
      }
      throw new Error(`Failed to get response from Lindy: ${responseText}`);
    }

    // Parse response as JSON
    let data: LindyResponse;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed Lindy response:', JSON.stringify(data, null, 2));
    } catch (e) {
      // If parsing fails, wait for callback
      console.log('Failed to parse initial response, waiting for callback...');
      const callbackResponse = await waitForCallback(body.threadId);
      if (callbackResponse) {
        return NextResponse.json(callbackResponse);
      }
      throw new Error(`Failed to parse Lindy response: ${responseText}`);
    }

    // Store the task ID for this thread if one was returned
    if (data.taskId) {
      setLastTaskId(body.threadId, data.taskId);
      console.log('Stored task ID:', data.taskId);
    }

    // Always wait for callback response
    console.log('Waiting for callback response...');
    const callbackResponse = await waitForCallback(body.threadId);
    if (callbackResponse) {
      console.log('Received callback response:', JSON.stringify(callbackResponse, null, 2));
      // Return a formatted response that won't trigger another Lindy request
      return NextResponse.json({
        success: true,
        message: callbackResponse.content,
        taskId: callbackResponse.taskId,
        schedulingDetails: callbackResponse.schedulingDetails
      });
    }

    // If no callback received and we have content in the initial response, use that
    if (data.content) {
      console.log('No callback received, using initial response:', data.content);
      return NextResponse.json({
        success: true,
        message: data.content,
        taskId: data.taskId,
        schedulingDetails: data.schedulingDetails
      });
    }

    // If we get here, we have no response at all
    console.log('No response received from any source');
    return NextResponse.json({ 
      error: 'No response received', 
      details: 'Lindy did not provide a response in time'
    }, { status: 504 });
    
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