'use server';

import { adminDb } from '@/lib/firebase/admin';
import { getTeam } from '@/app/actions/team';
import { generateMatchEvents } from '@/lib/utils/match-events';
import { Match, Team } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Regenerate events for a specific match
 */
export async function regenerateMatchEvents(matchId: string) {
  try {
    const matchDoc = await adminDb.collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return { success: false, error: 'Match not found' };
    }

    const matchData = matchDoc.data()!;
    const match = {
      id: matchDoc.id,
      ...matchData,
    } as Match;

    if (!match.result) {
      return { success: false, error: 'Match has no result' };
    }

    // Fetch team data
    const team1Result = await getTeam(match.team1.id);
    const team2Result = await getTeam(match.team2.id);

    if (!team1Result.success || !team1Result.team) {
      return { success: false, error: 'Team 1 not found' };
    }
    if (!team2Result.success || !team2Result.team) {
      return { success: false, error: 'Team 2 not found' };
    }

    // Generate new events
    const events = generateMatchEvents(
      team1Result.team,
      team2Result.team,
      {
        team1Score: match.result.team1Score,
        team2Score: match.result.team2Score,
        goalScorers: match.result.goalScorers,
        wentToExtraTime: match.result.wentToExtraTime,
        wentToPenalties: match.result.wentToPenalties,
      }
    );

    // Update match with new events
    await adminDb.collection('matches').doc(matchId).update({
      events,
    });

    return { success: true, eventsCount: events.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Regenerate events for all completed matches that don't have events
 */
export async function regenerateAllMatchEvents() {
  try {
    // Get all completed matches
    const matchesSnapshot = await adminDb
      .collection('matches')
      .where('status', '==', 'completed')
      .get();

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const matchDoc of matchesSnapshot.docs) {
      const matchData = matchDoc.data();
      const match = {
        id: matchDoc.id,
        ...matchData,
      } as Match;

      // Force regenerate all matches with new event types (don't skip existing events)
      // This ensures all matches have the new comprehensive event types

      if (!match.result) {
        continue;
      }

      try {
        // Fetch team data
        const team1Result = await getTeam(match.team1.id);
        const team2Result = await getTeam(match.team2.id);

        if (!team1Result.success || !team1Result.team || !team2Result.success || !team2Result.team) {
          errorCount++;
          results.push({
            matchId: match.id,
            error: 'Team data not found',
          });
          continue;
        }

        // Generate new events
        const events = generateMatchEvents(
          team1Result.team,
          team2Result.team,
          {
            team1Score: match.result.team1Score,
            team2Score: match.result.team2Score,
            goalScorers: match.result.goalScorers,
            wentToExtraTime: match.result.wentToExtraTime,
            wentToPenalties: match.result.wentToPenalties,
          }
        );

        // Clean events: remove undefined values (Firestore doesn't allow undefined)
        const cleanEvents = events.map(event => {
          const clean: any = {};
          for (const [key, value] of Object.entries(event)) {
            if (value !== undefined) {
              clean[key] = value;
            }
          }
          return clean;
        });

        // Update match with new events
        await adminDb.collection('matches').doc(match.id).update({
          events: cleanEvents,
        });

        successCount++;
        results.push({
          matchId: match.id,
          success: true,
          eventsCount: events.length,
        });
      } catch (error: any) {
        errorCount++;
        results.push({
          matchId: match.id,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      total: matchesSnapshot.size,
      successCount,
      errorCount,
      results,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

