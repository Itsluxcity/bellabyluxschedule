import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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