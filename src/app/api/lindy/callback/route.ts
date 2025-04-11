import { NextResponse } from 'next/server';
import { setCallbackData, setTaskData } from '@/utils/callbackStore';
import { Message } from '@/types/chat';

export async function POST(request: Request) {
  try {
    console.log('=== LINDY CALLBACK ROUTE STARTED ===');
    console.log('Callback URL:', request.url);
    
    const data = await request.json();
    console.log('Callback data received:', JSON.stringify(data, null, 2));
    
    // Extract threadId from the URL query parameters
    const url = new URL(request.url);
    const threadId = url.searchParams.get('threadId');
    console.log('Extracted threadId from URL:', threadId);
    
    if (!threadId) {
      console.log('Error: Missing threadId in callback URL');
      return NextResponse.json(
        { error: 'Missing threadId in callback URL' },
        { status: 400 }
      );
    }
    
    // Create a message object from the callback data
    const message: Message = {
      role: 'assistant',
      content: data.content,
      schedulingDetails: data.schedulingDetails
    };
    console.log('Created message object:', JSON.stringify(message, null, 2));
    
    // Store the callback data with the threadId
    console.log('Storing callback data in Redis...');
    await setCallbackData(threadId, message);
    console.log('Callback data stored successfully');
    
    // If conversationId or followUpUrl is provided, store it for task continuity
    if (data.conversationId || data.followUpUrl) {
      console.log('Storing task data for continuity...');
      await setTaskData(threadId, {
        conversationId: data.conversationId,
        followUpUrl: data.followUpUrl,
        lastMessageId: data.messageId
      });
      console.log('Task data stored successfully');
    }

    console.log('=== LINDY CALLBACK ROUTE COMPLETED ===');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in callback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 