'use server';

import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { Match, Team, MatchResult } from '@/types';
import { simulateMatch as simulateMatchGame } from '@/lib/utils/match-simulator';
import { generateMatchEvents } from '@/lib/utils/match-events';
import { advanceWinner, isTournamentComplete, getTournamentResults } from '@/lib/utils/bracket';
import { getTeam } from './team';
import { calculateTeamRating } from '@/lib/utils/ratings';
import { generateMatchCommentary } from '@/lib/ai/groq';

/**
 * Get match by ID
 */
export async function getMatch(matchId: string) {
  try {
    const matchDoc = await adminDb.collection('matches').doc(matchId).get();
    
    if (!matchDoc.exists) {
      return { success: false, error: 'Match not found' };
    }
    
    const data = matchDoc.data()!;
    const match: Match = {
      id: matchDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      completedAt: data.completedAt?.toDate(),
      events: data.events || [], // Include events for replay
    } as Match;
    
    return { success: true, match };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Play a match - simulates the match and saves results
 */
export async function playMatch(matchId: string) {
  try {
    // Get match
    const matchResult = await getMatch(matchId);
    if (!matchResult.success || !matchResult.match) {
      return { success: false, error: 'Match not found' };
    }
    
    const match = matchResult.match;
    
    // Check if match is already completed
    if (match.status === 'completed') {
      return { success: false, error: 'Match already completed' };
    }
    
    // Check if teams are valid (not TBD)
    if (!match.team1.id || !match.team2.id || match.team1.name === 'TBD' || match.team2.name === 'TBD') {
      return { success: false, error: 'Cannot play match: teams not determined yet' };
    }
    
    // Get full team data to calculate ratings
    const team1Result = await getTeam(match.team1.id);
    const team2Result = await getTeam(match.team2.id);
    
    if (!team1Result.success || !team1Result.team || !team2Result.success || !team2Result.team) {
      return { success: false, error: 'Failed to load team data' };
    }
    
    const team1 = team1Result.team;
    const team2 = team2Result.team;
    
    // Calculate team ratings
    const team1Rating = team1.overallRating || calculateTeamRating(team1.players);
    const team2Rating = team2.overallRating || calculateTeamRating(team2.players);
    
    // Create Team objects for simulation (need overallRating)
    const team1ForSim: Team = {
      ...team1,
      overallRating: team1Rating,
    };
    const team2ForSim: Team = {
      ...team2,
      overallRating: team2Rating,
    };
    
    // Simulate the match
    const simulationResult = simulateMatchGame(team1ForSim, team2ForSim);
    
    // Generate realistic match events timeline
    const matchEvents = generateMatchEvents(team1ForSim, team2ForSim, {
      team1Score: simulationResult.team1Score,
      team2Score: simulationResult.team2Score,
      goalScorers: simulationResult.goalScorers,
      wentToExtraTime: simulationResult.wentToExtraTime,
      wentToPenalties: simulationResult.wentToPenalties,
    });
    
    // Try to generate AI commentary, fallback if it fails
    let commentary: string[];
    let keyMoments: string[] = [];
    
    try {
      const aiResult = await generateMatchCommentary(match);
      commentary = aiResult.commentary;
      // Extract key moments (goals, cards, etc.)
      keyMoments = commentary.filter(line => 
        line.toLowerCase().includes('goal') || 
        line.toLowerCase().includes('card') ||
        line.toLowerCase().includes('penalty') ||
        line.toLowerCase().includes('red')
      ).slice(0, 10); // Limit to 10 key moments
    } catch (error) {
      console.error('AI commentary generation failed, using fallback:', error);
      // Fallback commentary
      commentary = [`Match between ${match.team1.name} and ${match.team2.name}`, `Final Score: ${simulationResult.team1Score} - ${simulationResult.team2Score}`];
    }
    
    // Clean result object - remove undefined values for Firestore
    const cleanResult: any = {
      team1Score: simulationResult.team1Score,
      team2Score: simulationResult.team2Score,
      winnerId: simulationResult.winnerId,
      loserId: simulationResult.loserId,
      isDraw: simulationResult.isDraw,
      goalScorers: simulationResult.goalScorers,
      wentToExtraTime: simulationResult.wentToExtraTime,
      wentToPenalties: simulationResult.wentToPenalties,
    };
    
    // Only include penaltyShootout if it exists
    if (simulationResult.penaltyShootout) {
      cleanResult.penaltyShootout = simulationResult.penaltyShootout;
    }
    
    // Clean events: remove undefined values (Firestore doesn't allow undefined)
    const cleanEvents = matchEvents.map(event => {
      const clean: any = {};
      for (const [key, value] of Object.entries(event)) {
        if (value !== undefined) {
          clean[key] = value;
        }
      }
      return clean;
    });
    
    // Update match with results, events, and commentary
    await adminDb.collection('matches').doc(matchId).update({
      status: 'completed',
      result: cleanResult,
      events: cleanEvents, // Store events for replay
      commentary,
      keyMoments,
      completedAt: Timestamp.now(),
      simulationType: 'played', // AI commentary was generated
    });
    
    // Send email notifications (fire and forget - don't block on errors)
    try {
      // Call email notification API in background
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      }).catch(err => console.error('Failed to trigger email notification:', err));
    } catch (emailError) {
      console.error('Error triggering email notifications:', emailError);
      // Don't fail the match completion if email fails
    }
    
    // Advance bracket if this is a quarter final or semi final
    if (match.round === 'quarterFinal' || match.round === 'semiFinal' || match.round === 'final') {
      // Get tournament
      const tournamentDoc = await adminDb.collection('tournaments').doc(match.tournamentId).get();
      if (tournamentDoc.exists) {
        const tournamentData = tournamentDoc.data()!;
        const currentBracket = tournamentData.bracket || {};
        
        // Advance winner
        const updatedBracket = advanceWinner(
          currentBracket,
          matchId,
          simulationResult.winnerId,
          match.round
        );
        
        // Update tournament bracket
        const updates: any = {
          bracket: updatedBracket,
        };
        
        // If quarter final, update semi final matches with winning teams
        if (match.round === 'quarterFinal') {
          const qfIndex = currentBracket.quarterFinals?.findIndex((qf: any) => qf.matchId === matchId);
          if (qfIndex !== -1 && qfIndex !== undefined) {
            const sfIndex = qfIndex < 2 ? 0 : 1;
            const sfMatchId = updatedBracket.semiFinals[sfIndex]?.matchId;
            
            if (sfMatchId) {
              const winnerTeam = simulationResult.winnerId === team1.id ? team1 : team2;
              const sfPosition = qfIndex % 2 === 0 ? 'team1' : 'team2';
              
              // Update semi final match with winner
              await adminDb.collection('matches').doc(sfMatchId).update({
                [sfPosition]: {
                  id: winnerTeam.id,
                  name: winnerTeam.country,
                  representativeEmail: winnerTeam.representativeEmail,
                  squad: winnerTeam.players,
                },
              });
            }
          }
        }
        
        // If semi final, update final match with winning teams
        if (match.round === 'semiFinal') {
          const sfIndex = currentBracket.semiFinals?.findIndex((sf: any) => sf.matchId === matchId);
          if (sfIndex !== -1 && sfIndex !== undefined) {
            const finalMatchId = updatedBracket.final?.matchId;
            
            if (finalMatchId) {
              const winnerTeam = simulationResult.winnerId === team1.id ? team1 : team2;
              const finalPosition = sfIndex === 0 ? 'team1' : 'team2';
              
              // Update final match with winner
              await adminDb.collection('matches').doc(finalMatchId).update({
                [finalPosition]: {
                  id: winnerTeam.id,
                  name: winnerTeam.country,
                  representativeEmail: winnerTeam.representativeEmail,
                  squad: winnerTeam.players,
                },
              });
            }
          }
        }
        
        // Check if tournament is complete
        if (isTournamentComplete(updatedBracket)) {
          const results = getTournamentResults(updatedBracket);
          if (results && results.winnerId && results.runnerUpId) {
            updates.winnerId = results.winnerId;
            updates.runnerUpId = results.runnerUpId;
            updates.status = 'completed';
            updates.completedAt = Timestamp.now();
            updates.currentRound = null;
          }
        } else if (match.round === 'quarterFinal') {
          // Move to semi final round
          updates.currentRound = 'semiFinal';
        } else if (match.round === 'semiFinal') {
          // Move to final round
          updates.currentRound = 'final';
        }
        
        await adminDb.collection('tournaments').doc(match.tournamentId).update(updates);
      }
    }
    
    return { 
      success: true, 
      message: 'Match played successfully!', 
      match: { ...match, status: 'completed', result: cleanResult } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Simulate match (simple mode - no AI commentary)
 */
export async function simulateMatch(matchId: string) {
  try {
    // Get match
    const matchResult = await getMatch(matchId);
    if (!matchResult.success || !matchResult.match) {
      return { success: false, error: 'Match not found' };
    }
    
    const match = matchResult.match;
    
    // Check if match is already completed
    if (match.status === 'completed') {
      return { success: false, error: 'Match already completed' };
    }
    
    // Check if teams are valid (not TBD)
    if (!match.team1.id || !match.team2.id || match.team1.name === 'TBD' || match.team2.name === 'TBD') {
      return { success: false, error: 'Cannot simulate match: teams not determined yet' };
    }
    
    // Get full team data to calculate ratings
    const team1Result = await getTeam(match.team1.id);
    const team2Result = await getTeam(match.team2.id);
    
    if (!team1Result.success || !team1Result.team || !team2Result.success || !team2Result.team) {
      return { success: false, error: 'Failed to load team data' };
    }
    
    const team1 = team1Result.team;
    const team2 = team2Result.team;
    
    // Calculate team ratings
    const team1Rating = team1.overallRating || calculateTeamRating(team1.players);
    const team2Rating = team2.overallRating || calculateTeamRating(team2.players);
    
    // Create Team objects for simulation (need overallRating)
    const team1ForSim: Team = {
      ...team1,
      overallRating: team1Rating,
    };
    const team2ForSim: Team = {
      ...team2,
      overallRating: team2Rating,
    };
    
    // Simulate the match (simple mode - no AI commentary)
    const simulationResult = simulateMatchGame(team1ForSim, team2ForSim);
    
    // Generate realistic match events timeline
    const matchEvents = generateMatchEvents(team1ForSim, team2ForSim, {
      team1Score: simulationResult.team1Score,
      team2Score: simulationResult.team2Score,
      goalScorers: simulationResult.goalScorers,
      wentToExtraTime: simulationResult.wentToExtraTime,
      wentToPenalties: simulationResult.wentToPenalties,
    });
    
    // Clean result object - remove undefined values for Firestore
    const cleanResult: any = {
      team1Score: simulationResult.team1Score,
      team2Score: simulationResult.team2Score,
      winnerId: simulationResult.winnerId,
      loserId: simulationResult.loserId,
      isDraw: simulationResult.isDraw,
      goalScorers: simulationResult.goalScorers,
      wentToExtraTime: simulationResult.wentToExtraTime,
      wentToPenalties: simulationResult.wentToPenalties,
    };
    
    // Only include penaltyShootout if it exists
    if (simulationResult.penaltyShootout) {
      cleanResult.penaltyShootout = simulationResult.penaltyShootout;
    }
    
    // Clean events: remove undefined values (Firestore doesn't allow undefined)
    const cleanEvents = matchEvents.map(event => {
      const clean: any = {};
      for (const [key, value] of Object.entries(event)) {
        if (value !== undefined) {
          clean[key] = value;
        }
      }
      return clean;
    });

    // Update match with results and events (no commentary)
    await adminDb.collection('matches').doc(matchId).update({
      status: 'completed',
      result: cleanResult,
      events: cleanEvents, // Store events for replay
      completedAt: Timestamp.now(),
      simulationType: 'simulated', // Simple simulation without AI
    });
    
    // Send email notifications (fire and forget - don't block on errors)
    try {
      // Call email notification API in background
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      }).catch(err => console.error('Failed to trigger email notification:', err));
    } catch (emailError) {
      console.error('Error triggering email notifications:', emailError);
      // Don't fail the match completion if email fails
    }
    
    // Advance bracket if this is a quarter final or semi final (same logic as playMatch)
    if (match.round === 'quarterFinal' || match.round === 'semiFinal' || match.round === 'final') {
      // Get tournament
      const tournamentDoc = await adminDb.collection('tournaments').doc(match.tournamentId).get();
      if (tournamentDoc.exists) {
        const tournamentData = tournamentDoc.data()!;
        const currentBracket = tournamentData.bracket || {};
        
        // Advance winner
        const updatedBracket = advanceWinner(
          currentBracket,
          matchId,
          simulationResult.winnerId,
          match.round
        );
        
        // Update tournament bracket
        const updates: any = {
          bracket: updatedBracket,
        };
        
        // If quarter final, update semi final matches with winning teams
        if (match.round === 'quarterFinal') {
          const qfIndex = currentBracket.quarterFinals?.findIndex((qf: any) => qf.matchId === matchId);
          if (qfIndex !== -1 && qfIndex !== undefined) {
            const sfIndex = qfIndex < 2 ? 0 : 1;
            const sfMatchId = updatedBracket.semiFinals[sfIndex]?.matchId;
            
            if (sfMatchId) {
              const winnerTeam = simulationResult.winnerId === team1.id ? team1 : team2;
              const sfPosition = qfIndex % 2 === 0 ? 'team1' : 'team2';
              
              // Update semi final match with winner
              await adminDb.collection('matches').doc(sfMatchId).update({
                [sfPosition]: {
                  id: winnerTeam.id,
                  name: winnerTeam.country,
                  representativeEmail: winnerTeam.representativeEmail,
                  squad: winnerTeam.players,
                },
              });
            }
          }
        }
        
        // If semi final, update final match with winning teams
        if (match.round === 'semiFinal') {
          const sfIndex = currentBracket.semiFinals?.findIndex((sf: any) => sf.matchId === matchId);
          if (sfIndex !== -1 && sfIndex !== undefined) {
            const finalMatchId = updatedBracket.final?.matchId;
            
            if (finalMatchId) {
              const winnerTeam = simulationResult.winnerId === team1.id ? team1 : team2;
              const finalPosition = sfIndex === 0 ? 'team1' : 'team2';
              
              // Update final match with winner
              await adminDb.collection('matches').doc(finalMatchId).update({
                [finalPosition]: {
                  id: winnerTeam.id,
                  name: winnerTeam.country,
                  representativeEmail: winnerTeam.representativeEmail,
                  squad: winnerTeam.players,
                },
              });
            }
          }
        }
        
        // Check if tournament is complete
        if (isTournamentComplete(updatedBracket)) {
          const results = getTournamentResults(updatedBracket);
          if (results && results.winnerId && results.runnerUpId) {
            updates.winnerId = results.winnerId;
            updates.runnerUpId = results.runnerUpId;
            updates.status = 'completed';
            updates.completedAt = Timestamp.now();
            updates.currentRound = null;
          }
        } else if (match.round === 'quarterFinal') {
          // Move to semi final round
          updates.currentRound = 'semiFinal';
        } else if (match.round === 'semiFinal') {
          // Move to final round
          updates.currentRound = 'final';
        }
        
        await adminDb.collection('tournaments').doc(match.tournamentId).update(updates);
      }
    }
    
    return { 
      success: true, 
      message: 'Match simulated successfully!',
      match: { ...match, status: 'completed', result: cleanResult }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
