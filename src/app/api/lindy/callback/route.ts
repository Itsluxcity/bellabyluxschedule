import { NextResponse } from 'next/server';
import { resolveCallback } from '../store';

export async function POST(request: Request) {
  try {
    // Get threadId from URL
    const url = new URL(request.url);
    const threadId = url.searchParams.get('threadId');

    if (!threadId) {
      console.error('No threadId provided in callback URL');
      return NextResponse.json({ error: 'No threadId provided' }, { status: 400 });
    }

    const body = await request.json();
    console.log('Received callback from Lindy for thread:', threadId, body);

    // Validate the callback
    if (!body.content) {
      console.error('Invalid callback data received:', body);
      return NextResponse.json({ error: 'Invalid callback data' }, { status: 400 });
    }

    // Format the response data
    const responseData = {
      content: body.content,
      schedulingDetails: body.schedulingDetails || null
    };

    console.log('Resolving callback with data:', responseData);

    // Resolve the callback for this thread
    resolveCallback(threadId, responseData);

    return NextResponse.json({ status: 'success' });

  } catch (error) {
    console.error('Error processing callback:', error);
    return NextResponse.json({ error: 'Failed to process callback' }, { status: 500 });
  }
} 