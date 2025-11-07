import { NextRequest, NextResponse } from 'next/server';
import { cleanupTournament } from '@/app/actions/tournament';

/**
 * API route to clean up tournament by removing deleted team references
 */
export async function POST(request: NextRequest) {
  try {
    const result = await cleanupTournament();
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cleanup tournament' },
      { status: 500 }
    );
  }
}

