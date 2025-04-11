import { NextResponse } from 'next/server';
import { 
  LindyRequest, 
  LindyResponse, 
  getTaskData,
  setTaskData,
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

    // Get the existing task data for this thread
    const taskData = getTaskData(body.threadId);
    console.log('Retrieved task data:', taskData);

    // Determine which URL to use
    let targetUrl = LINDY_WEBHOOK_URL;
    if (taskData?.followUpUrl) {
      targetUrl = taskData.followUpUrl;
      console.log('Using followUpUrl:', targetUrl);
    } else if (taskData?.conversationId) {
      targetUrl = `${LINDY_WEBHOOK_URL}?conversationId=${taskData.conversationId}`;
      console.log('Using conversationId URL:', targetUrl);
    }

    // Format the request exactly as Lindy expects
    const lindyRequest: LindyRequest = {
      message: body.message,
      callbackUrl: `${CALLBACK_URL}?threadId=${body.threadId}`,
      taskId: taskData?.taskId,
      handleInSameTask: true,
      conversationId: taskData?.conversationId
    };

    if (body.schedulingDetails) {
      lindyRequest.schedulingDetails = body.schedulingDetails;
    }

    console.log('Sending to Lindy:', JSON.stringify(lindyRequest, null, 2));

    // Send message to Lindy
    const lindyResponse = await fetch(targetUrl, {
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

    // Store the task data if we got any
    if (data.taskId || data.followUpUrl || data.conversationId) {
      setTaskData(body.threadId, {
        taskId: data.taskId || taskData?.taskId || '',
        followUpUrl: data.followUpUrl,
        conversationId: data.conversationId || taskData?.conversationId
      });
      console.log('Updated task data');
    }

    // If we have content in the immediate response, return it
    if (data.content) {
      console.log('Returning immediate response:', data.content);
      return NextResponse.json(data);
    }

    // Otherwise wait for callback response
    console.log('No immediate content, waiting for callback response...');
    const callbackResponse = await waitForCallback(body.threadId);
    if (!callbackResponse) {
      console.log('Callback timeout - no response received');
      return NextResponse.json({ error: 'Timeout waiting for response' }, { status: 504 });
    }

    // Store any new task data from callback
    if (callbackResponse.taskId || callbackResponse.followUpUrl || callbackResponse.conversationId) {
      setTaskData(body.threadId, {
        taskId: callbackResponse.taskId || taskData?.taskId || '',
        followUpUrl: callbackResponse.followUpUrl,
        conversationId: callbackResponse.conversationId || taskData?.conversationId
      });
      console.log('Updated task data from callback');
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