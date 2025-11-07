import { NextRequest, NextResponse } from 'next/server';
import { getTournamentStatus } from '@/app/actions/tournament';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * API route to fix tournament status - resets to registration if active without 8 teams
 */
export async function POST(request: NextRequest) {
  try {
    const tournamentResult = await getTournamentStatus();
    if (!tournamentResult.success || !tournamentResult.tournament) {
      return NextResponse.json(
        { success: false, error: 'No tournament found' },
        { status: 404 }
      );
    }

    const tournament = tournamentResult.tournament;
    
    // Get actual team count
    const teamsSnapshot = await adminDb.collection('teams')
      .where('tournamentId', '==', tournament.id)
      .get();
    
    const teamCount = teamsSnapshot.size;

    // If tournament is active but doesn't have 8 teams, reset it
    if (tournament.status === 'active' && teamCount !== 8) {
      await adminDb.collection('tournaments').doc(tournament.id).update({
        status: 'registration',
        startedAt: FieldValue.delete(),
        currentRound: null,
        bracket: {
          quarterFinals: [],
          semiFinals: [],
          final: {
            matchId: '',
            team1Id: '',
            team2Id: '',
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Tournament reset to registration. Had ${teamCount} teams, need 8.`,
        teamCount,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Tournament status is valid',
      status: tournament.status,
      teamCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fix tournament status' },
      { status: 500 }
    );
  }
}

