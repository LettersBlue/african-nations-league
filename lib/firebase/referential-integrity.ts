/**
 * Referential Integrity Utilities for Firestore
 * 
 * Since Firestore doesn't have built-in foreign key constraints,
 * we implement referential integrity through:
 * 1. Validation functions that check if references exist
 * 2. Transaction-based operations for atomic updates
 * 3. Helper functions to validate relationships
 */

import { adminDb } from './admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Validate that a tournament exists
 */
export async function validateTournamentExists(tournamentId: string): Promise<boolean> {
  try {
    const tournamentDoc = await adminDb.collection('tournaments').doc(tournamentId).get();
    return tournamentDoc.exists;
  } catch (error) {
    console.error('Error validating tournament:', error);
    return false;
  }
}

/**
 * Validate that a team exists
 */
export async function validateTeamExists(teamId: string): Promise<boolean> {
  try {
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    return teamDoc.exists;
  } catch (error) {
    console.error('Error validating team:', error);
    return false;
  }
}

/**
 * Validate that a match exists
 */
export async function validateMatchExists(matchId: string): Promise<boolean> {
  try {
    const matchDoc = await adminDb.collection('matches').doc(matchId).get();
    return matchDoc.exists;
  } catch (error) {
    console.error('Error validating match:', error);
    return false;
  }
}

/**
 * Validate that a user exists
 */
export async function validateUserExists(uid: string): Promise<boolean> {
  try {
    const userDoc = await adminDb.collection('users').doc(uid).get();
    return userDoc.exists;
  } catch (error) {
    console.error('Error validating user:', error);
    return false;
  }
}

/**
 * Validate that a team belongs to a tournament
 */
export async function validateTeamInTournament(
  teamId: string,
  tournamentId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    
    if (!teamDoc.exists) {
      return { valid: false, error: `Team ${teamId} does not exist` };
    }
    
    const teamData = teamDoc.data();
    if (teamData?.tournamentId !== tournamentId) {
      return {
        valid: false,
        error: `Team ${teamId} does not belong to tournament ${tournamentId}`,
      };
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate multiple teams belong to a tournament
 */
export async function validateTeamsInTournament(
  teamIds: string[],
  tournamentId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  for (const teamId of teamIds) {
    const result = await validateTeamInTournament(teamId, tournamentId);
    if (!result.valid) {
      errors.push(result.error || `Team ${teamId} validation failed`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that all player IDs in starting11Ids exist in the team's players array
 */
export async function validateStarting11Players(
  teamId: string,
  starting11Ids: string[]
): Promise<{ valid: boolean; error?: string }> {
  try {
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    
    if (!teamDoc.exists) {
      return { valid: false, error: `Team ${teamId} does not exist` };
    }
    
    const teamData = teamDoc.data();
    const players = teamData?.players || [];
    const playerIds = players.map((p: any) => p.id);
    
    const invalidIds = starting11Ids.filter(id => !playerIds.includes(id));
    
    if (invalidIds.length > 0) {
      return {
        valid: false,
        error: `Starting 11 contains invalid player IDs: ${invalidIds.join(', ')}`,
      };
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Clean up orphaned references in tournament bracket
 * Removes references to teams that no longer exist
 */
export async function cleanupTournamentBracketReferences(
  tournamentId: string
): Promise<{ cleaned: boolean; removedReferences: string[] }> {
  try {
    const tournamentDoc = await adminDb.collection('tournaments').doc(tournamentId).get();
    
    if (!tournamentDoc.exists) {
      return { cleaned: false, removedReferences: [] };
    }
    
    const tournamentData = tournamentDoc.data();
    const bracket = tournamentData?.bracket || {};
    const removedReferences: string[] = [];
    
    // Get all valid team IDs for this tournament
    const teamsSnapshot = await adminDb.collection('teams')
      .where('tournamentId', '==', tournamentId)
      .get();
    const validTeamIds = teamsSnapshot.docs.map(doc => doc.id);
    
    // Clean quarterFinals
    if (bracket.quarterFinals) {
      bracket.quarterFinals = bracket.quarterFinals.map((qf: any) => {
        const cleaned = { ...qf };
        
        if (qf.team1Id && !validTeamIds.includes(qf.team1Id)) {
          removedReferences.push(qf.team1Id);
          cleaned.team1Id = '';
        }
        if (qf.team2Id && !validTeamIds.includes(qf.team2Id)) {
          removedReferences.push(qf.team2Id);
          cleaned.team2Id = '';
        }
        if (qf.winnerId && !validTeamIds.includes(qf.winnerId)) {
          removedReferences.push(qf.winnerId);
          delete cleaned.winnerId;
        }
        
        return cleaned;
      });
    }
    
    // Clean semiFinals
    if (bracket.semiFinals) {
      bracket.semiFinals = bracket.semiFinals.map((sf: any) => {
        const cleaned = { ...sf };
        
        if (sf.team1Id && !validTeamIds.includes(sf.team1Id)) {
          removedReferences.push(sf.team1Id);
          cleaned.team1Id = '';
        }
        if (sf.team2Id && !validTeamIds.includes(sf.team2Id)) {
          removedReferences.push(sf.team2Id);
          cleaned.team2Id = '';
        }
        if (sf.winnerId && !validTeamIds.includes(sf.winnerId)) {
          removedReferences.push(sf.winnerId);
          delete cleaned.winnerId;
        }
        
        return cleaned;
      });
    }
    
    // Clean final
    if (bracket.final) {
      const final = { ...bracket.final };
      
      if (final.team1Id && !validTeamIds.includes(final.team1Id)) {
        removedReferences.push(final.team1Id);
        final.team1Id = '';
      }
      if (final.team2Id && !validTeamIds.includes(final.team2Id)) {
        removedReferences.push(final.team2Id);
        final.team2Id = '';
      }
      if (final.winnerId && !validTeamIds.includes(final.winnerId)) {
        removedReferences.push(final.winnerId);
        delete final.winnerId;
      }
      
      bracket.final = final;
    }
    
    // Update tournament if any references were removed
    if (removedReferences.length > 0) {
      await adminDb.collection('tournaments').doc(tournamentId).update({
        bracket,
      });
    }
    
    return {
      cleaned: removedReferences.length > 0,
      removedReferences,
    };
  } catch (error: any) {
    console.error('Error cleaning up bracket references:', error);
    return { cleaned: false, removedReferences: [] };
  }
}

/**
 * Validate and clean up team references when deleting a team
 * This should be called before deleting a team to ensure referential integrity
 */
export async function validateTeamDeletion(teamId: string): Promise<{
  canDelete: boolean;
  errors: string[];
  references: {
    tournament?: string;
    matches: string[];
  };
}> {
  const errors: string[] = [];
  const references: { tournament?: string; matches: string[] } = { matches: [] };
  
  try {
    // Check if team exists
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return { canDelete: false, errors: ['Team does not exist'], references };
    }
    
    const teamData = teamDoc.data();
    const tournamentId = teamData?.tournamentId;
    
    if (tournamentId) {
      references.tournament = tournamentId;
      
      // Check if tournament is active
      const tournamentDoc = await adminDb.collection('tournaments').doc(tournamentId).get();
      if (tournamentDoc.exists) {
        const tournamentData = tournamentDoc.data();
        if (tournamentData?.status === 'active') {
          errors.push('Cannot delete team from active tournament');
        }
      }
    }
    
    // Find all matches referencing this team
    const matchesSnapshot = await adminDb.collection('matches')
      .where('tournamentId', '==', tournamentId)
      .get();
    
    matchesSnapshot.docs.forEach(matchDoc => {
      const matchData = matchDoc.data();
      if (
        matchData?.team1?.id === teamId ||
        matchData?.team2?.id === teamId
      ) {
        references.matches.push(matchDoc.id);
      }
    });
    
    if (references.matches.length > 0) {
      errors.push(`Team is referenced in ${references.matches.length} match(es)`);
    }
    
    return {
      canDelete: errors.length === 0,
      errors,
      references,
    };
  } catch (error: any) {
    errors.push(error.message);
    return { canDelete: false, errors, references };
  }
}

/**
 * Get teamIds for a tournament by querying teams collection
 * This is the source of truth - teams.tournamentId is the primary reference
 * Note: teamIds is NOT stored in tournaments - it's always derived from teams
 */
export async function getTournamentTeamIds(tournamentId: string): Promise<{
  success: boolean;
  teamIds: string[];
  error?: string;
}> {
  try {
    // Get actual teams - teams.tournamentId is the source of truth
    const teamsSnapshot = await adminDb.collection('teams')
      .where('tournamentId', '==', tournamentId)
      .get();
    
    const teamIds = teamsSnapshot.docs.map(doc => doc.id);
    
    return { success: true, teamIds };
  } catch (error: any) {
    return { success: false, teamIds: [], error: error.message };
  }
}

