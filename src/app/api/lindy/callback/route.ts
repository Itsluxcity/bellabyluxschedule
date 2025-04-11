import { NextResponse } from 'next/server';
import { setCallbackResponse } from '@/lib/db';

export async function POST(request: Request) {
  try {
    console.log('Callback route started');
    
    // Get the threadId from the URL or body
    const url = new URL(request.url);
    const threadId = url.searchParams.get('threadId');
    
    // Parse the callback body
    const body = await request.json();
    console.log('Callback body:', body);
    
    // If threadId is not in the URL, try to get it from the body
    const finalThreadId = threadId || body.threadId;
    
    if (!finalThreadId) {
      console.error('No threadId provided in callback');
      return NextResponse.json({ error: 'No threadId provided' }, { status: 400 });
    }
    
    // Store the callback data
    await setCallbackResponse(finalThreadId, body);
    
    console.log('Callback data stored successfully');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in callback route:', error);
    return NextResponse.json({ error: 'Failed to process callback' }, { status: 500 });
  }
} 