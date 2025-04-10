import { NextResponse } from 'next/server';

const LINDY_WEBHOOK_URL = 'https://public.lindy.ai/api/v1/webhooks/lindy/6fdd874b-1e87-48ec-a401-f81546c4ce54';
const LINDY_SECRET_KEY = 'ceddc1d497adf098fb3564709ebf7f01824ee74a2c3ba8492f43b2d06b3f8681';

interface LindyRequest {
  content: string;
  taskId?: string;
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
  schedulingDetails?: {
    date?: string;
    time?: string;
    duration?: string;
    purpose?: string;
    participants?: string[];
  };
}

async function sendToLindy(request: LindyRequest): Promise<LindyResponse> {
  console.log('Sending to Lindy:', request);

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
    throw new Error(`Failed to get response from Lindy: ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    throw new Error('Invalid JSON response from Lindy');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request:', body);
    
    // Validate request
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing content' }, { status: 400 });
    }

    // Format request for Lindy - ALWAYS include taskId
    const lindyRequest: LindyRequest = {
      content: body.content.trim(),
      taskId: body.taskId || '', // Empty string if no taskId
      schedulingDetails: {
        date: '',
        time: '',
        duration: '',
        purpose: '',
        participants: body.participants || []
      }
    };

    // Send to Lindy using our ONE implementation
    const data = await sendToLindy(lindyRequest);

    // Return response with preserved taskId
    return NextResponse.json({
      content: data.content,
      taskId: data.taskId || lindyRequest.taskId, // Keep existing if no new one
      schedulingDetails: data.schedulingDetails || lindyRequest.schedulingDetails
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
} 