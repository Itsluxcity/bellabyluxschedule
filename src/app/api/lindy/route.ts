import { NextResponse } from 'next/server';

const LINDY_WEBHOOK_URL = 'https://public.lindy.ai/api/v1/webhooks/lindy/6fdd874b-1e87-48ec-a401-f81546c4ce54';
const LINDY_SECRET_KEY = 'ceddc1d497adf098fb3564709ebf7f01824ee74a2c3ba8492f43b2d06b3f8681';

// This will be our webhook endpoint that Lindy will call
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request body:', body); // Log incoming request
    
    // Format request for Lindy
    const lindyRequest = {
      message: body.message,
      sender: body.userName,
      handleInSameTask: true,
      taskId: body.taskId || undefined,
      type: 'message' // Add message type
    };
    
    console.log('Sending to Lindy:', lindyRequest); // Log outgoing request
    
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
    console.log('Raw Lindy response:', responseText); // Log raw response

    if (!lindyResponse.ok) {
      console.error('Lindy response not OK. Status:', lindyResponse.status);
      throw new Error(`Failed to get response from Lindy: ${responseText}`);
    }

    // Parse response as JSON
    const data = JSON.parse(responseText);
    console.log('Parsed Lindy response:', data);
    
    // Return the response, preserving all fields from Lindy
    const response = {
      ...data,
      content: data.content?.replace(/\\n/g, '\n') || 'No response content',
      taskId: data.taskId
    };
    
    console.log('Sending response to client:', response); // Log outgoing response
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      error
    });
    return NextResponse.json(
      { 
        error: 'Failed to process message', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 