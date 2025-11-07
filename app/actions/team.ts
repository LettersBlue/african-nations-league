'use server';

import { getTournamentStatus } from '@/app/actions/tournament';
import { generatePlayerRatings, calculateTeamRating, validateTeamComposition } from '@/lib/utils/ratings';
import { Team, Player, TeamRegistrationForm } from '@/types';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { validateTournamentExists, validateUserExists } from '@/lib/firebase/referential-integrity';

/**
 * Create a team - validates and saves to Firestore (uses Admin SDK)
 */
export async function createTeam(
  formData: TeamRegistrationForm,
  representativeUid: string,
  representativeEmail: string
) {
  try {
    // Get current tournament (auto-creates if none exists)
    const tournamentResult = await getTournamentStatus();
    if (!tournamentResult.success || !tournamentResult.tournament) {
      return { success: false, error: 'Failed to initialize tournament. Please contact an administrator.' };
    }
    const tournament = tournamentResult.tournament;
    
    // Validate referential integrity: tournament exists
    const tournamentExists = await validateTournamentExists(tournament.id);
    if (!tournamentExists) {
      return { success: false, error: 'Tournament does not exist' };
    }
    
    // Validate referential integrity: user exists
    const userExists = await validateUserExists(representativeUid);
    if (!userExists) {
      return { success: false, error: 'User does not exist' };
    }

    // Check if tournament is in registration phase
    if (tournament.status !== 'registration') {
      return { success: false, error: 'Tournament is no longer accepting registrations.' };
    }

    // Check if user already has a team registered (using Admin SDK)
    const existingTeamsSnapshot = await adminDb.collection('teams')
      .where('representativeUid', '==', representativeUid)
      .get();
    if (!existingTeamsSnapshot.empty) {
      return { success: false, error: 'You have already registered a team for this tournament.' };
    }

    // Generate players with unique IDs (use country for tier-based ratings)
    const players: Player[] = formData.players.map((p, idx) => ({
      id: `player_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`,
      name: p.name.trim(),
      naturalPosition: p.naturalPosition,
      isCaptain: p.isCaptain,
      ratings: generatePlayerRatings(p.naturalPosition, formData.country),
      goals: 0,
      appearances: 0,
    }));

    // Generate starting 11 IDs from indices or use provided IDs
    let starting11Ids: string[] = [];
    if (formData.starting11Ids && formData.starting11Ids.length > 0) {
      // Use provided IDs
      starting11Ids = formData.starting11Ids;
    } else if (formData.starting11Indices && formData.starting11Indices.length === 11) {
      // Convert indices to player IDs (indices correspond to positions in players array)
      starting11Ids = formData.starting11Indices
        .filter(idx => idx >= 0 && idx < players.length)
        .map(idx => players[idx].id);
      
      // If we don't have exactly 11 valid IDs, fall back to default
      if (starting11Ids.length !== 11) {
        starting11Ids = players.slice(0, 11).map(p => p.id);
      }
    } else {
      // Default: first 11 players, but ensure at least 1 GK
      starting11Ids = players.slice(0, 11).map(p => p.id);
      // If no GK in first 11, find first GK and swap
      const hasGK = starting11Ids.some(id => {
        const player = players.find(p => p.id === id);
        return player?.naturalPosition === 'GK';
      });
      if (!hasGK) {
        const firstGK = players.find(p => p.naturalPosition === 'GK');
        if (firstGK) {
          starting11Ids[10] = firstGK.id; // Replace last player with GK
        }
      }
    }

    const validation = validateTeamComposition(players, starting11Ids);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Check country uniqueness in tournament (using Admin SDK)
    const tournamentTeamsSnapshot = await adminDb.collection('teams')
      .where('tournamentId', '==', tournament.id)
      .get();
    
    const tournamentTeams = tournamentTeamsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Team[];
    
    const countryTaken = tournamentTeams.some(t => t.country === formData.country);
    if (countryTaken) {
      return { success: false, error: `${formData.country} is already registered in this tournament.` };
    }

    // Calculate team rating
    const overallRating = calculateTeamRating(players);

    // Check if we have 8 teams (max for tournament)
    if (tournamentTeams.length >= 8) {
      return { success: false, error: 'Tournament is full (8 teams maximum).' };
    }

    // Create team data
    const teamData = {
      country: formData.country,
      managerName: formData.managerName.trim(),
      representativeUid,
      representativeEmail,
      players,
      starting11Ids,
      overallRating,
      tournamentId: tournament.id,
      stats: {
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsScored: 0,
        goalsConceded: 0,
        goalDifference: 0,
      },
      createdAt: Timestamp.now(),
    };

    // Save to Firestore using Admin SDK
    // Note: teams.tournamentId is the source of truth - tournament.teamIds is always derived from teams
    const teamRef = await adminDb.collection('teams').add(teamData);

    return {
      success: true,
      teamId: teamRef.id,
      message: 'Team registered successfully!',
    };
  } catch (error: any) {
    console.error('Error creating team:', error);
    return { success: false, error: error.message || 'Failed to register team' };
  }
}

/**
 * Get all teams by tournament ID (uses Admin SDK)
 */
export async function getTeamsByTournament(tournamentId: string) {
  try {
    const teamsSnapshot = await adminDb.collection('teams')
      .where('tournamentId', '==', tournamentId)
      .get();
    
    const teams = teamsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
      } as Team;
    });
    
    return { success: true, teams };
  } catch (error: any) {
    console.error('Error getting teams by tournament:', error);
    return { success: false, error: error.message, teams: [] };
  }
}

/**
 * Get team by ID (uses Admin SDK)
 */
export async function getTeam(teamId: string) {
  try {
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: 'Team not found' };
    }
    
    const data = teamDoc.data()!;
    const team = {
      id: teamDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
    } as Team;
    
    return { success: true, team };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get user's team (for representatives) - uses Admin SDK
 */
export async function getUserTeam(representativeUid: string) {
  try {
    // Use Admin SDK to read teams (bypasses security rules)
    const teamsSnapshot = await adminDb.collection('teams')
      .where('representativeUid', '==', representativeUid)
      .get();
    
    if (!teamsSnapshot.empty) {
      const doc = teamsSnapshot.docs[0];
      const data = doc.data();
      const team = {
        id: doc.id,
        country: data.country,
        managerName: data.managerName,
        representativeUid: data.representativeUid,
        representativeEmail: data.representativeEmail,
        players: data.players || [],
        starting11Ids: data.starting11Ids || [],
        overallRating: data.overallRating || 0,
        tournamentId: data.tournamentId,
        stats: data.stats || {
          matchesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsScored: 0,
          goalsConceded: 0,
          goalDifference: 0,
        },
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
      } as Team;
      return { success: true, team };
    }
    return { success: true, team: null };
  } catch (error: any) {
    console.error('Error getting user team:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update team (for representatives to edit their squad)
 */
export async function updateTeam(
  teamId: string,
  formData: TeamRegistrationForm,
  representativeUid: string
) {
  try {
    // Get team to verify ownership
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: 'Team not found' };
    }

    const teamData = teamDoc.data();
    if (teamData?.representativeUid !== representativeUid) {
      return { success: false, error: 'You do not have permission to edit this team' };
    }

    // Preserve existing player IDs where possible (match by name), otherwise generate new ones
    const existingPlayers = (teamData.players || []) as Player[];
    const players: Player[] = formData.players.map((playerForm, idx) => {
      // Try to find existing player by name
      const existingPlayer = existingPlayers.find((p: any) => 
        p.name.trim().toLowerCase() === playerForm.name.trim().toLowerCase()
      );
      
      const playerId = existingPlayer?.id || `player_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        id: playerId,
        name: playerForm.name.trim(),
        naturalPosition: playerForm.naturalPosition,
        isCaptain: playerForm.isCaptain,
        ratings: existingPlayer?.ratings || generatePlayerRatings(playerForm.naturalPosition, formData.country),
        goals: existingPlayer?.goals || 0,
        appearances: existingPlayer?.appearances || 0,
      };
    });

    // Handle starting 11: use provided IDs/indices or default to existing or first 11
    let starting11Ids: string[] = [];
    if (formData.starting11Ids && formData.starting11Ids.length > 0) {
      // Use provided IDs
      starting11Ids = formData.starting11Ids;
    } else if (formData.starting11Indices && formData.starting11Indices.length === 11) {
      // Convert indices to player IDs
      starting11Ids = formData.starting11Indices
        .filter(idx => idx >= 0 && idx < players.length)
        .map(idx => players[idx].id);
      
      // If we don't have exactly 11 valid IDs, use existing or default
      if (starting11Ids.length !== 11) {
        starting11Ids = teamData.starting11Ids || players.slice(0, 11).map(p => p.id);
      }
    } else {
      // Use existing starting 11 if available, otherwise default to first 11
      starting11Ids = teamData.starting11Ids || players.slice(0, 11).map(p => p.id);
      
      // Ensure at least 1 GK in starting 11
      const hasGK = starting11Ids.some(id => {
        const player = players.find(p => p.id === id);
        return player?.naturalPosition === 'GK';
      });
      if (!hasGK) {
        const firstGK = players.find(p => p.naturalPosition === 'GK');
        if (firstGK) {
          starting11Ids[10] = firstGK.id; // Replace last player with GK
        }
      }
    }

    // Validate team composition with starting 11
    const validation = validateTeamComposition(players, starting11Ids);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Calculate team rating
    const overallRating = calculateTeamRating(players);

    // Prepare updates (preserve stats and tournament info)
    const updates: any = {
      country: formData.country,
      managerName: formData.managerName.trim(),
      players,
      starting11Ids,
      overallRating,
      updatedAt: Timestamp.now(),
    };

    // Validate referential integrity: team exists and belongs to tournament
    // teamDoc already fetched above, reuse it
    const existingTeamData = teamData;
    if (existingTeamData?.tournamentId) {
      const tournamentExists = await validateTournamentExists(existingTeamData.tournamentId);
      if (!tournamentExists) {
        return { success: false, error: 'Team references a non-existent tournament' };
      }
    }

    // Update in Firestore using Admin SDK
    await adminDb.collection('teams').doc(teamId).update(updates);

    return {
      success: true,
      message: 'Team updated successfully!',
    };
  } catch (error: any) {
    console.error('Error updating team:', error);
    return { success: false, error: error.message || 'Failed to update team' };
  }
}

/**
 * Update team with latest squad data from fetchRealTimeTeamData
 * Uses the application's existing method to get the most recent team squads
 */
export async function updateTeamWithLatestSquad(teamId: string) {
  try {
    // Get team to verify it exists
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: 'Team not found' };
    }

    const teamData = teamDoc.data() as Team;
    const country = teamData.country;

    // Import the processing function
    const { processSquadDataForUpdate } = await import('@/scripts/update-squads');
    
    // Process squad data using the application's fetchRealTimeTeamData method
    const result = await processSquadDataForUpdate(country, teamData);
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to fetch and process squad data',
      };
    }

    const { players, starting11Ids, overallRating, managerName } = result.data;

    // Prepare updates (preserve stats and tournament info)
    const updates: any = {
      players,
      starting11Ids,
      overallRating,
      managerName,
      updatedAt: Timestamp.now(),
    };

    // Update in Firestore using Admin SDK
    await adminDb.collection('teams').doc(teamId).update(updates);

    return {
      success: true,
      message: `Team ${country} updated with latest squad data!`,
      data: {
        playersCount: players.length,
        managerName,
        overallRating,
      },
    };
  } catch (error: any) {
    console.error('Error updating team with latest squad:', error);
    return { success: false, error: error.message || 'Failed to update team with latest squad' };
  }
}

/**
 * Update all teams with latest squad data
 */
export async function updateAllTeamsWithLatestSquads() {
  try {
    // Get all teams from Firestore
    const teamsSnapshot = await adminDb.collection('teams').get();
    
    if (teamsSnapshot.empty) {
      return { success: false, error: 'No teams found in database' };
    }

    const results = [];
    
    for (const teamDoc of teamsSnapshot.docs) {
      const teamId = teamDoc.id;
      const country = (teamDoc.data() as Team).country;
      
      try {
        const result = await updateTeamWithLatestSquad(teamId);
        results.push({
          country,
          teamId,
          success: result.success,
          error: result.error,
        });
      } catch (error: any) {
        results.push({
          country,
          teamId,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
      success: true,
      message: `Updated ${successCount} teams successfully, ${failCount} failed`,
      results,
    };
  } catch (error: any) {
    console.error('Error updating all teams:', error);
    return { success: false, error: error.message || 'Failed to update all teams' };
  }
}
