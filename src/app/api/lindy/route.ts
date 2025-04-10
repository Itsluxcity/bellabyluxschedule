import { NextResponse } from 'next/server';

const LINDY_WEBHOOK_URL = 'https://public.lindy.ai/api/v1/webhooks/lindy/6fdd874b-1e87-48ec-a401-f81546c4ce54';
const LINDY_SECRET_KEY = 'ceddc1d497adf098fb3564709ebf7f01824ee74a2c3ba8492f43b2d06b3f8681';

// This will be our webhook endpoint that Lindy will call
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request:', body);

    // Only proceed if we have a message to send
    if (!body.message) {
      console.log('No message in request, ignoring');
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    console.log('Sending message to Lindy:', {
      message: body.message,
      taskId: body.taskId
    });

    // Send message to Lindy
    const lindyResponse = await fetch(LINDY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINDY_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: body.message,
        taskId: body.taskId,
        handleInSameTask: true
      })
    });

    const responseText = await lindyResponse.text();
    console.log('Raw Lindy response:', responseText);

    if (!lindyResponse.ok) {
      console.error('Lindy response not OK. Status:', lindyResponse.status);
      throw new Error(`Failed to get response from Lindy: ${responseText}`);
    }

    // Parse response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed Lindy response:', data);
    } catch (e) {
      console.error('Failed to parse Lindy response:', e);
      return NextResponse.json({ 
        content: 'I received your message but encountered an error processing the response. Please try again.',
        error: 'Invalid JSON response'
      }, { status: 500 });
    }

    // Extract content and taskId from Lindy's response
    const content = data.response?.content || data.content || 'No response content';
    const taskId = data.taskId || data.response?.taskId;

    console.log('Sending to frontend:', { content, taskId });

    // Return the response
    return NextResponse.json({
      content,
      taskId
    });
    
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