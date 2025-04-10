import { NextResponse } from 'next/server';

const LINDY_WEBHOOK_URL = 'https://public.lindy.ai/api/v1/webhooks/lindy/6fdd874b-1e87-48ec-a401-f81546c4ce54';
const LINDY_SECRET_KEY = 'ceddc1d497adf098fb3564709ebf7f01824ee74a2c3ba8492f43b2d06b3f8681';

// This will be our webhook endpoint that Lindy will call
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request:', body);

    // If no message or userName, return error
    if (!body.message || !body.userName) {
      return NextResponse.json({ error: 'Message and userName are required' }, { status: 400 });
    }

    // Format message for Lindy
    const formattedMessage = `User speaking: ${body.userName}\nMessage: ${body.message}`;
    console.log('Formatted message:', formattedMessage);

    // Send message to Lindy
    const lindyResponse = await fetch(LINDY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINDY_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: formattedMessage,
        taskId: body.taskId || undefined,
        handleInSameTask: true,
        type: 'message'
      })
    });

    const responseText = await lindyResponse.text();
    console.log('Raw Lindy response:', responseText);

    if (!lindyResponse.ok) {
      throw new Error(`Failed to get response from Lindy: ${responseText}`);
    }

    // Parse response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed Lindy response:', data);
    } catch (e) {
      console.error('Failed to parse Lindy response:', e);
      throw new Error('Failed to parse Lindy response');
    }

    // Extract the actual response content and taskId
    const responseData = {
      content: data.content,
      taskId: data.taskId || body.taskId, // Use existing taskId if no new one provided
      requiresDetails: data.requiresDetails === true,
      schedulingDetails: data.schedulingDetails || null
    };

    console.log('Sending to frontend:', responseData);
    return NextResponse.json(responseData);
    
  } catch (error: any) {
    console.error('Full error details:', error);
    return NextResponse.json(
      { 
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        error: 'Failed to process message', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 