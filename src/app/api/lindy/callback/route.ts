import { NextResponse } from 'next/server';
import { setCallbackData, setTaskData } from '@/utils/callbackStore';
import { Message } from '@/types/chat';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Extract threadId from the URL query parameters
    const url = new URL(request.url);
    const threadId = url.searchParams.get('threadId');
    
    if (!threadId) {
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
    
    // Store the callback data with the threadId
    await setCallbackData(threadId, message);
    
    // If conversationId or followUpUrl is provided, store it for task continuity
    if (data.conversationId || data.followUpUrl) {
      await setTaskData(threadId, {
        conversationId: data.conversationId,
        followUpUrl: data.followUpUrl,
        lastMessageId: data.messageId
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in callback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 