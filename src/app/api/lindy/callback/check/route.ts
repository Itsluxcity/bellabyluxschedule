import { NextResponse } from 'next/server';
import { getCallbackData } from '@/utils/callbackStore';

export async function GET(request: Request) {
  try {
    // Get threadId from query parameters
    const url = new URL(request.url);
    const threadId = url.searchParams.get('threadId');
    
    if (!threadId) {
      return NextResponse.json(
        { error: 'Missing threadId parameter' },
        { status: 400 }
      );
    }
    
    const data = await getCallbackData(threadId);
    
    if (!data) {
      return NextResponse.json({ status: 'waiting' });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in callback check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 