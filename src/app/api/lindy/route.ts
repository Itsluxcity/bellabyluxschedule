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

export async function POST(req: Request) {
  try {
    const { message, threadId, metadata } = await req.json();

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
      }
    };

    // Make the request to Lindy
    const response = await fetch('https://api.lindy.ai/v1/chat', {
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

    // Clear callback data after successful request
    if (callbackData) {
      await clearCallbackData(threadId);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Lindy route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 