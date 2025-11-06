import { NextRequest, NextResponse } from 'next/server';
import { regenerateAllMatchEvents } from '@/app/actions/regenerate-events';

export async function POST(request: NextRequest) {
  try {
    const result = await regenerateAllMatchEvents();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

