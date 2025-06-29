import { NextRequest, NextResponse } from 'next/server';
import { Message } from 'ai';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    // Simple echo for now - actual processing happens client-side
    // This is because we're using the streamNoditUI function directly
    return NextResponse.json({
      role: 'assistant',
      content: lastMessage.content,
    });
  } catch (error) {
    console.error('Error processing chat request:', error);
    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    );
  }
} 