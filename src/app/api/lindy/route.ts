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

    // Check if this is a callback from Lindy
    if (body.source === 'lindy' || body.isCallback) {
      console.log('Skipping response loop: message from Lindy');
      return NextResponse.json({ status: 'ok' });
    }

    // Add source identifier for user messages
    const messageWithSource = {
      ...body,
      source: 'user',
      messageId: Date.now().toString() // For deduplication
    };

    // Ensure we have required fields
    if (!messageWithSource.message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }
    if (!messageWithSource.threadId) {
      return NextResponse.json({ error: 'No threadId provided' }, { status: 400 });
    }

    // Get the existing task data for this thread
    const taskData = getTaskData(messageWithSource.threadId);
    console.log('Retrieved task data:', taskData);

    // Check for duplicate message
    if (taskData?.lastMessageId === messageWithSource.messageId) {
      console.log('Duplicate message detected. Skipping.');
      return NextResponse.json({ status: 'skipped', reason: 'duplicate' });
    }

    // Prepare the request to Lindy
    const lindyRequest: LindyRequest = {
      message: messageWithSource.message,
      handleInSameTask: true,
      callbackUrl: CALLBACK_URL,
      source: 'user',
      messageId: messageWithSource.messageId
    };

    // If we have existing task data, use it for continuity
    if (taskData) {
      if (taskData.followUpUrl) {
        lindyRequest.callbackUrl = taskData.followUpUrl;
      }
      if (taskData.conversationId) {
        lindyRequest.conversationId = taskData.conversationId;
      }
      if (taskData.taskId) {
        lindyRequest.taskId = taskData.taskId;
      }
    }

    // Send request to Lindy
    const response = await fetch(LINDY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINDY_SECRET_KEY}`
      },
      body: JSON.stringify(lindyRequest)
    });

    if (!response.ok) {
      throw new Error(`Lindy API error: ${response.statusText}`);
    }

    const lindyResponse = await response.json();
    console.log('Lindy response:', lindyResponse);

    // Update task data with new information
    if (lindyResponse.taskId || lindyResponse.conversationId || lindyResponse.followUpUrl) {
      setTaskData(messageWithSource.threadId, {
        taskId: lindyResponse.taskId || taskData?.taskId || '',
        conversationId: lindyResponse.conversationId || taskData?.conversationId,
        followUpUrl: lindyResponse.followUpUrl || taskData?.followUpUrl,
        lastMessageId: messageWithSource.messageId
      });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
} 