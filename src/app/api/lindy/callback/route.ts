import { NextResponse } from 'next/server';
import { setCallbackResponse, LindyResponse, getTaskData, setTaskData } from '../utils';

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

    // Update task data with conversationId and followUpUrl if provided
    const existingTaskData = getTaskData(threadId);
    if (existingTaskData && (data.conversationId || data.followUpUrl)) {
      setTaskData(threadId, {
        ...existingTaskData,
        conversationId: data.conversationId || existingTaskData.conversationId,
        followUpUrl: data.followUpUrl || existingTaskData.followUpUrl
      });
    }

    // Return success
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.json({ error: 'Failed to process callback' }, { status: 500 });
  }
} 