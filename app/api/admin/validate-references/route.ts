import { NextRequest, NextResponse } from 'next/server';
import {
  validateTournamentExists,
  validateTeamExists,
  validateMatchExists,
  validateUserExists,
  validateTeamsInTournament,
  cleanupTournamentBracketReferences,
  getTournamentTeamIds,
} from '@/lib/firebase/referential-integrity';
import { getTournamentStatus } from '@/app/actions/tournament';
import { getTeamsByTournament } from '@/app/actions/team';

/**
 * API route to validate all referential integrity in the database
 */
export async function GET(request: NextRequest) {
  try {
    const tournamentResult = await getTournamentStatus();
    if (!tournamentResult.success || !tournamentResult.tournament) {
      return NextResponse.json(
        { success: false, error: 'No tournament found' },
        { status: 404 }
      );
    }

    const tournament = tournamentResult.tournament;
    const teamsResult = await getTeamsByTournament(tournament.id);
    const teams = teamsResult.success ? teamsResult.teams || [] : [];

    const validationResults = {
      tournament: {
        exists: await validateTournamentExists(tournament.id),
        id: tournament.id,
      },
      teams: {
        count: teams.length,
        validations: [] as Array<{ id: string; exists: boolean; belongsToTournament: boolean }>,
      },
      bracket: {
        cleaned: false,
        removedReferences: [] as string[],
      },
      teamIds: {
        synced: false,
        teamIds: [] as string[],
      },
    };

    // Validate each team
    for (const team of teams) {
      const exists = await validateTeamExists(team.id);
      const belongsToTournament = team.tournamentId === tournament.id;
      
      validationResults.teams.validations.push({
        id: team.id,
        exists,
        belongsToTournament,
      });
    }

    // Clean up bracket references
    const bracketCleanup = await cleanupTournamentBracketReferences(tournament.id);
    validationResults.bracket = bracketCleanup;

    // Get teamIds from teams collection (source of truth)
    const teamIdsResult = await getTournamentTeamIds(tournament.id);
    if (teamIdsResult.success) {
      validationResults.teamIds = {
        synced: true, // Always synced since it's derived, not stored
        teamIds: teamIdsResult.teamIds,
      };
    }

    return NextResponse.json({
      success: true,
      validation: validationResults,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to validate references' },
      { status: 500 }
    );
  }
}

