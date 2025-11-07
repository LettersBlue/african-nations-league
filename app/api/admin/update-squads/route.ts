import { NextRequest, NextResponse } from 'next/server';
import { updateAllTeamsWithLatestSquads } from '@/app/actions/team';

/**
 * API route to update all teams with latest squad data
 * Uses the application's fetchRealTimeTeamData method
 */
export async function POST(request: NextRequest) {
  try {
    const result = await updateAllTeamsWithLatestSquads();
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update squads' },
      { status: 500 }
    );
  }
}

