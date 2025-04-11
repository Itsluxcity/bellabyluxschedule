import { NextResponse } from 'next/server';
import { setCallbackData } from '@/utils/callbackStore';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const threadId = data.threadId;

    if (!threadId) {
      return NextResponse.json({ error: 'No threadId provided' }, { status: 400 });
    }

    // Store the callback data
    await setCallbackData(threadId, data);

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error in callback route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 