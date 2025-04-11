import { NextResponse } from 'next/server';
import { Message, LindyRequest } from '@/types/chat';
import { 
  getCallbackData, 
  clearCallbackData, 
  getTaskData, 
  setTaskData,
  waitForCallback
} from '@/utils/callbackStore';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, userName, schedulingDetails, threadId: providedThreadId } = body;
    
    // Generate or use provided threadId
    const threadId = providedThreadId || uuidv4();
    
    // Get existing task data if available
    const taskData = await getTaskData(threadId);
    
    // Check for callback data and append to messages if it exists
    const callbackData = await getCallbackData(threadId);
    if (callbackData) {
      messages.push(callbackData);
      await clearCallbackData(threadId);
    }

    // Prepare request to Lindy API
    const lindyRequest: LindyRequest = {
      messages,
      metadata: {
        userName,
        schedulingDetails,
        // Include conversationId and followUpUrl if available for task continuity
        conversationId: taskData?.conversationId,
        followUpUrl: taskData?.followUpUrl
      }
    };

    // Send request to Lindy API
    const response = await fetch('https://api.lindy.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINDY_API_KEY}`
      },
      body: JSON.stringify(lindyRequest)
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to get response from Lindy' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Store task data for continuity
    if (data.conversationId || data.followUpUrl) {
      await setTaskData(threadId, {
        conversationId: data.conversationId,
        followUpUrl: data.followUpUrl,
        lastMessageId: data.message?.id
      });
    }
    
    // If Lindy indicates it will send a callback, wait for it
    if (data.requiresCallback) {
      // Wait for callback (up to 5 minutes)
      const callbackResult = await waitForCallback(threadId);
      
      if (callbackResult) {
        // Return both the initial response and the callback result
        return NextResponse.json({
          ...data,
          callbackResult
        });
      }
    }
    
    // Return the response with the threadId for future reference
    return NextResponse.json({
      ...data,
      threadId
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 