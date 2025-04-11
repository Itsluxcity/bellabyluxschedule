import { NextResponse } from 'next/server';
import { 
  getTaskData, 
  setTaskData, 
  waitForCallback,
  getCallbackData,
  clearCallbackData
} from '@/utils/callbackStore';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';

// Get configuration from environment variables
const LINDY_API_URL = 'https://api.lindy.ai/v1/chat';
const LINDY_SECRET_KEY = 'ceddc1d497adf098fb3564709ebf7f01824ee74a2c3ba8492f43b2d06b3f8681';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CALLBACK_URL = process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/lindy/callback` : 'http://localhost:3000/api/lindy/callback';

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

export async function POST(req: Request) {
  try {
    const { message, threadId: providedThreadId, metadata } = await req.json();
    const threadId = providedThreadId || uuidv4();

    // Check for callback data and append to messages if it exists
    const callbackData = await getCallbackData(threadId);
    const messages = callbackData ? [callbackData] : [];

    // Prepare the request to Lindy
    const lindyRequest = {
      messages: [...messages, { role: 'user', content: message }],
      threadId,
      metadata: {
        ...metadata,
        source: 'user'
      },
      callbackUrl: `${CALLBACK_URL}?threadId=${threadId}`
    };

    // Make the request to Lindy
    const response = await fetch(LINDY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINDY_API_KEY}`
      },
      body: JSON.stringify(lindyRequest)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Lindy API error: ${error}`);
    }

    const data = await response.json();

    // If we have content in the immediate response, return it
    if (data.content) {
      return NextResponse.json({
        ...data,
        threadId
      });
    }

    // Wait for the callback response
    const callbackResponse = await waitForCallback(threadId);
    if (!callbackResponse) {
      return NextResponse.json({ error: 'Timeout waiting for response' }, { status: 504 });
    }

    // Clear callback data after successful request
    if (callbackData) {
      await clearCallbackData(threadId);
    }

    return NextResponse.json({
      ...callbackResponse,
      threadId
    });
  } catch (error) {
    console.error('Error in Lindy route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 