import { NextResponse } from 'next/server';

const LINDY_WEBHOOK_URL = 'https://public.lindy.ai/api/v1/webhooks/lindy/6fdd874b-1e87-48ec-a401-f81546c4ce54';
const LINDY_SECRET_KEY = 'ceddc1d497adf098fb3564709ebf7f01824ee74a2c3ba8492f43b2d06b3f8681';
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

interface LindyRequest {
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
}

interface ErrorResponse {
  error: string;
  details?: string;
  retryable?: boolean;
}

async function validateLindyResponse(data: any): Promise<LindyResponse | ErrorResponse> {
  if (!data) {
    return { error: 'Empty response from Lindy', retryable: true };
  }

  if (typeof data.content !== 'string' || !data.content.trim()) {
    return { error: 'Invalid or empty content in response', retryable: false };
  }

  if (data.taskId && typeof data.taskId !== 'string') {
    return { error: 'Invalid taskId format', retryable: false };
  }

  // Validate scheduling details if present
  if (data.schedulingDetails) {
    const validFields = ['date', 'time', 'duration', 'purpose', 'participants'];
    const invalidFields = Object.keys(data.schedulingDetails).filter(field => !validFields.includes(field));
    
    if (invalidFields.length > 0) {
      return { 
        error: 'Invalid scheduling details format', 
        details: `Unknown fields: ${invalidFields.join(', ')}`,
        retryable: false 
      };
    }
  }

  return data as LindyResponse;
}

async function sendToLindy(request: LindyRequest, retryCount = 0): Promise<LindyResponse | ErrorResponse> {
  try {
    console.log(`Attempt ${retryCount + 1} - Sending to Lindy:`, {
      ...request,
      timestamp: new Date().toISOString()
    });

    const response = await fetch(LINDY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINDY_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    const responseText = await response.text();
    console.log('Raw Lindy response:', responseText);

    if (!response.ok) {
      const retryable = response.status >= 500 || response.status === 429;
      if (retryable && retryCount < MAX_RETRIES) {
        console.log(`Retrying after ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return sendToLindy(request, retryCount + 1);
      }
      
      return { 
        error: `Lindy API error (${response.status})`, 
        details: responseText,
        retryable: false
      };
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return { 
        error: 'Invalid JSON response from Lindy',
        details: responseText,
        retryable: true
      };
    }

    return await validateLindyResponse(data);

  } catch (error: any) {
    const isNetworkError = error.message.includes('fetch failed') || 
                          error.message.includes('network') ||
                          error.message.includes('ECONNREFUSED');
                          
    return {
      error: 'Failed to communicate with Lindy',
      details: error.message,
      retryable: isNetworkError
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request:', body);
    
    // Validate request - check for content, not message
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing content' }, { status: 400 });
    }

    // Format request for Lindy
    const lindyRequest: LindyRequest = {
      content: body.content.trim(),
      taskId: body.taskId || '',
      requiresDetails: true,
      schedulingDetails: {
        date: '',
        time: '',
        duration: '',
        purpose: '',
        participants: body.participants || []
      }
    };

    console.log('Sending to Lindy:', lindyRequest);

    // Send to Lindy
    const response = await fetch(LINDY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINDY_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lindyRequest)
    });

    const responseText = await response.text();
    console.log('Raw Lindy response:', responseText);

    if (!response.ok) {
      throw new Error(`Failed to get response from Lindy: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error('Invalid JSON response from Lindy');
    }

    // Return the response in the same format
    return NextResponse.json({
      content: data.content,
      taskId: data.taskId || lindyRequest.taskId,
      requiresDetails: data.requiresDetails,
      schedulingDetails: data.schedulingDetails || lindyRequest.schedulingDetails
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
} 