import { NextResponse } from 'next/server';
import { 
  getTaskData, 
  setTaskData, 
  waitForCallback 
} from '@/utils/callbackStore';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';

// Get configuration from environment variables
const LINDY_WEBHOOK_URL = 'https://public.lindy.ai/api/v1/webhooks/lindy/6fdd874b-1e87-48ec-a401-f81546c4ce54';
const LINDY_SECRET_KEY = 'ceddc1d497adf098fb3564709ebf7f01824ee74a2c3ba8492f43b2d06b3f8681';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CALLBACK_URL = `${BASE_URL}/api/lindy/callback`;

// Define interfaces for Lindy request and response
interface LindyRequest {
  message: string;
  taskId?: string;
  handleInSameTask: boolean;
  schedulingDetails?: {
    date?: string;
    time?: string;
    duration?: string;
    purpose?: string;
    participants?: string[];
  };
  callbackUrl: string;
  conversationId?: string;
  source?: 'user' | 'lindy';
  messageId?: string;
}

interface LindyResponse {
  content: string;
  taskId?: string;
  requiresDetails?: boolean;
  schedulingDetails?: {
    date?: string;
    time?: string;
    duration?: string;
    purpose?: string;
    participants?: string[];
  };
  followUpUrl?: string;
  conversationId?: string;
}

// Interface for callback data with additional fields
interface CallbackData extends Message {
  conversationId?: string;
  followUpUrl?: string;
}

export async function POST(request: Request) {
  try {
    console.log('=== LINDY API ROUTE STARTED ===');
    const body = await request.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));

    // Check if this is a callback from Lindy
    if (body.source === 'lindy' || body.isCallback) {
      console.log('Skipping response loop: message from Lindy');
      return NextResponse.json({ status: 'ok' });
    }

    // Add source identifier for user messages
    const messageWithSource = {
      ...body,
      source: 'user',
      messageId: body.messageId || uuidv4() // For deduplication
    };

    // Ensure we have required fields
    if (!messageWithSource.message) {
      console.log('Error: No message provided');
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }
    
    // Generate or use provided threadId
    const threadId = messageWithSource.threadId || uuidv4();
    messageWithSource.threadId = threadId;
    console.log('Using threadId:', threadId);

    // Get the existing task data for this thread
    console.log('Attempting to get task data from Redis...');
    const taskData = await getTaskData(threadId);
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
      callbackUrl: `${CALLBACK_URL}?threadId=${threadId}`,
      source: 'user',
      messageId: messageWithSource.messageId
    };

    // If we have existing task data, use it for continuity
    if (taskData) {
      console.log('Using existing task data for continuity:', {
        threadId: threadId,
        existingConversationId: taskData.conversationId,
        existingFollowUpUrl: taskData.followUpUrl
      });
      
      if (taskData.followUpUrl) {
        lindyRequest.callbackUrl = taskData.followUpUrl;
        console.log('Using followUpUrl for callback:', taskData.followUpUrl);
      }
      if (taskData.conversationId) {
        lindyRequest.conversationId = taskData.conversationId;
        console.log('Using conversationId for continuity:', taskData.conversationId);
      }
    }

    // Determine which URL to use for the request
    let targetUrl = LINDY_WEBHOOK_URL;
    if (taskData?.followUpUrl) {
      targetUrl = taskData.followUpUrl;
      console.log('Using followUpUrl for request:', targetUrl);
    } else if (taskData?.conversationId) {
      targetUrl = `${LINDY_WEBHOOK_URL}?conversationId=${taskData.conversationId}`;
      console.log('Using conversationId in URL:', targetUrl);
    }

    console.log('Sending request to Lindy:', {
      url: targetUrl,
      request: JSON.stringify(lindyRequest, null, 2)
    });

    // Send request to Lindy
    console.log('Making fetch request to Lindy...');
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINDY_SECRET_KEY}`
      },
      body: JSON.stringify(lindyRequest)
    });

    console.log('Lindy response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lindy API error response:', errorText);
      throw new Error(`Lindy API error: ${response.statusText} - ${errorText}`);
    }

    const lindyResponse = await response.json();
    console.log('Lindy response:', JSON.stringify(lindyResponse, null, 2));

    // Update task data with new information
    if (lindyResponse.taskId || lindyResponse.conversationId || lindyResponse.followUpUrl) {
      console.log('Updating task data with new information...');
      await setTaskData(threadId, {
        conversationId: lindyResponse.conversationId || taskData?.conversationId,
        followUpUrl: lindyResponse.followUpUrl || taskData?.followUpUrl,
        lastMessageId: messageWithSource.messageId
      });
      console.log('Task data updated successfully');
    }

    // If we have content in the immediate response, return it
    if (lindyResponse.content) {
      console.log('Returning immediate response:', lindyResponse.content);
      return NextResponse.json({
        ...lindyResponse,
        threadId
      });
    }

    // Wait for the callback response
    console.log('Waiting for callback response...');
    const callbackResponse = await waitForCallback(threadId) as CallbackData | null;
    if (!callbackResponse) {
      console.log('Callback timeout - no response received');
      return NextResponse.json({ error: 'Timeout waiting for response' }, { status: 504 });
    }

    // Store any new task data from callback
    if (callbackResponse.conversationId || callbackResponse.followUpUrl) {
      console.log('Updating task data from callback...');
      await setTaskData(threadId, {
        followUpUrl: callbackResponse.followUpUrl,
        conversationId: callbackResponse.conversationId || taskData?.conversationId,
        lastMessageId: messageWithSource.messageId
      });
      console.log('Updated task data from callback');
    }

    console.log('Received callback response:', JSON.stringify(callbackResponse, null, 2));
    console.log('=== LINDY API ROUTE COMPLETED ===');
    return NextResponse.json({
      ...callbackResponse,
      threadId
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
} 