import { NextResponse } from 'next/server';

// This will be our webhook endpoint that Lindy will call
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Process the message from Lindy
    // For now, we'll just echo it back
    return NextResponse.json({
      content: body.message || 'No message received'
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
} 