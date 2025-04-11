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
  followUpUrl?: string;
  schedulingDetails?: {
    date?: string;
    time?: string;
    duration?: string;
    purpose?: string;
    participants?: string[];
  };
}

async function sendToLindy(request: LindyRequest, followUpUrl?: string): Promise<LindyResponse> {
  // Use follow-up URL if provided, otherwise use initial webhook URL
  const targetUrl = followUpUrl || LINDY_WEBHOOK_URL;
  console.log('URL Selection:', {
    usingFollowUpUrl: !!followUpUrl,
    selectedUrl: targetUrl,
    originalFollowUpUrl: followUpUrl,
    webhookUrl: LINDY_WEBHOOK_URL
  });
  console.log('Request:', request);

  const response = await fetch(targetUrl, {
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
    const data = JSON.parse(responseText);
    console.log('Response details:', {
      hasFollowUpUrl: !!data.followUpUrl,
      followUpUrl: data.followUpUrl,
      taskId: data.taskId
    });
    return data;
  } catch (e) {
    throw new Error('Invalid JSON response from Lindy');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request body:', body);

    // Validate request
    if (!body.content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    // Prepare request to Lindy
    const lindyRequest: LindyRequest = {
      content: body.content.trim(),
      taskId: body.taskId, // Include taskId if provided
      schedulingDetails: body.schedulingDetails || {}
    };

    // Send to Lindy using the follow-up URL if available
    const data = await sendToLindy(lindyRequest, body.followUpUrl);

    // Return response with both taskId and followUpUrl
    return NextResponse.json({
      content: data.content,
      taskId: data.taskId,
      followUpUrl: data.followUpUrl,
      schedulingDetails: data.schedulingDetails
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
} 