import { NextResponse } from 'next/server';

// Get configuration from environment variables
const LINDY_WEBHOOK_URL = process.env.LINDY_WEBHOOK_URL || 'https://public.lindy.ai/api/v1/webhooks/lindy/6fdd874b-1e87-48ec-a401-f81546c4ce54';
const LINDY_SECRET_KEY = process.env.LINDY_SECRET_KEY || 'ceddc1d497adf098fb3564709ebf7f01824ee74a2c3ba8492f43b2d06b3f8681';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CALLBACK_URL = `${BASE_URL}/api/lindy/callback`;

interface LindyRequest {
  content: string;
  callbackUrl: string;
  schedulingDetails?: {
    date?: string;
    time?: string;
    duration?: string;
    purpose?: string;
    participants?: string[];
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request with content:', body.content);

    // Ensure we have a message
    if (!body.content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    const lindyRequest = {
      content: body.content,
      callbackUrl: CALLBACK_URL,  // Add the callback URL
      schedulingDetails: body.schedulingDetails || {}
    };

    console.log('Sending to Lindy:', lindyRequest);

    // Send message to Lindy
    const lindyResponse = await fetch(LINDY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINDY_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lindyRequest)
    });

    const responseText = await lindyResponse.text();
    console.log('Raw Lindy response:', responseText);

    if (!lindyResponse.ok) {
      throw new Error(`Failed to get response from Lindy: ${responseText}`);
    }

    // Return processing status
    return NextResponse.json({
      status: 'processing',
      message: 'Request sent to Lindy, awaiting response'
    });
    
  } catch (error: any) {
    console.error('Full error details:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process message', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle callbacks from Lindy
export async function callback(request: Request) {
  try {
    const body = await request.json();
    console.log('Received callback from Lindy:', body);

    // Validate the callback
    if (!body.content) {
      return NextResponse.json({ error: 'Invalid callback data' }, { status: 400 });
    }

    // Return the response to be sent to the client
    return NextResponse.json({
      content: body.content,
      schedulingDetails: body.schedulingDetails
    });

  } catch (error) {
    console.error('Error processing callback:', error);
    return NextResponse.json({ error: 'Failed to process callback' }, { status: 500 });
  }
} 