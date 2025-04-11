import { NextResponse } from 'next/server';
import { setCallbackResponse, LindyResponse } from '../utils';

export async function POST(request: Request) {
  try {
    // Get the threadId from the URL
    const url = new URL(request.url);
    const threadId = url.searchParams.get('threadId');

    if (!threadId) {
      return NextResponse.json({ error: 'No threadId provided' }, { status: 400 });
    }

    // Get the response data
    const data = await request.json();
    console.log('Received callback for thread:', threadId, 'with data:', data);

    // Store the response
    setCallbackResponse(threadId, data as LindyResponse);

    // Return success
    return NextResponse.json({ value: "Message sent" });
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.json({ error: 'Failed to process callback' }, { status: 500 });
  }
} 