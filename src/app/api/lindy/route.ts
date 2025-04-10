import { NextResponse } from 'next/server';

const LINDY_WEBHOOK_URL = 'https://public.lindy.ai/api/v1/webhooks/lindy/6fdd874b-1e87-48ec-a401-f81546c4ce54';
const LINDY_SECRET_KEY = 'ceddc1d497adf098fb3564709ebf7f01824ee74a2c3ba8492f43b2d06b3f8681';

// This will be our webhook endpoint that Lindy will call
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Send message to Lindy
    const lindyResponse = await fetch(LINDY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINDY_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: body.message,
        sender: body.userName,
        handleInSameTask: true,
        taskId: body.taskId || undefined // Pass taskId if it exists
      })
    });

    if (!lindyResponse.ok) {
      console.error('Lindy response not OK:', await lindyResponse.text());
      throw new Error('Failed to get response from Lindy');
    }

    const data = await lindyResponse.json();
    console.log('Lindy response:', data); // Debug log
    
    // Return the response, preserving all fields from Lindy
    return NextResponse.json({
      ...data,
      content: data.content?.replace(/\\n/g, '\n') || 'No response content',
      taskId: data.taskId // Pass taskId back to client
    });
    
  } catch (error: any) { // Type error as any to access .message
    console.error('Error processing message:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process message', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 