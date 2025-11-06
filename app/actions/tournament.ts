'use server';

import { getTeamsByTournament } from '@/lib/firebase/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { Tournament, TournamentStatus, MatchRound } from '@/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { generateBracket, getBracketPosition } from '@/lib/utils/bracket';
import { playMatch } from '@/app/actions/match';
import { getTeam } from '@/app/actions/team';

/**
 * Get current tournament status (uses Admin SDK to bypass security rules)
 */
export async function getTournamentStatus() {
  try {
    // Use Admin SDK to read tournaments (bypasses security rules)
    const tournamentsSnapshot = await adminDb.collection('tournaments')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    let tournament: Tournament | null = null;
    
    if (!tournamentsSnapshot.empty) {
      const doc = tournamentsSnapshot.docs[0];
      const data = doc.data();
      tournament = {
        id: doc.id,
        name: data.name || 'African Nations League 2026',
        status: data.status || 'registration',
        teamIds: data.teamIds || [],
        currentRound: data.currentRound || null,
        bracket: data.bracket || {
          quarterFinals: [],
          semiFinals: [],
          final: {
            matchId: '',
            team1Id: '',
            team2Id: '',
          },
        },
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        startedAt: data.startedAt?.toDate ? data.startedAt.toDate() : undefined,
        completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : undefined,
      } as Tournament;
    }
    
    if (!tournament) {
      // Create default tournament if none exists (using Admin SDK to bypass security rules)
      const defaultTournament = {
        name: 'African Nations League 2026',
        status: 'registration' as TournamentStatus,
        teamIds: [] as string[],
        currentRound: null as string | null,
        bracket: {
          quarterFinals: [] as any[],
          semiFinals: [] as any[],
          final: {
            matchId: '',
            team1Id: '',
            team2Id: '',
          },
        },
        createdAt: Timestamp.now(),
      };
      
      const tournamentRef = await adminDb.collection('tournaments').add(defaultTournament);
      tournament = {
        id: tournamentRef.id,
        ...defaultTournament,
        createdAt: new Date(),
      } as Tournament;
    }

    // Get team count using Admin SDK
    const teamsSnapshot = await adminDb.collection('teams')
      .where('tournamentId', '==', tournament.id)
      .get();
    
    const teamCount = teamsSnapshot.size;

    return {
      success: true,
      tournament: {
        ...tournament,
        teamCount,
      },
    };
  } catch (error: any) {
    console.error('Error getting tournament status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Start tournament (admin only)
 */
export async function startTournament() {
  try {
    const tournamentStatus = await getTournamentStatus();
    if (!tournamentStatus.success || !tournamentStatus.tournament) {
      return { success: false, error: 'No tournament found' };
    }
    const tournament = tournamentStatus.tournament;

    // Check if we have exactly 8 teams
    const teams = await getTeamsByTournament(tournament.id);
    if (teams.length !== 8) {
      return { success: false, error: `Tournament requires exactly 8 teams. Currently have ${teams.length}.` };
    }

    // Generate bracket
    const bracket = generateBracket(teams.map(t => t.id));

    // Create quarter final matches
    const qfMatches = [];
    for (let i = 0; i < bracket.quarterFinals.length; i++) {
      const qfMatch = bracket.quarterFinals[i];
      const team1Result = await getTeam(qfMatch.team1Id);
      const team2Result = await getTeam(qfMatch.team2Id);
      
      if (!team1Result.success || !team1Result.team || !team2Result.success || !team2Result.team) {
        throw new Error(`Failed to load team data for QF${i + 1}`);
      }
      
      const team1 = team1Result.team;
      const team2 = team2Result.team;

      const matchRef = await adminDb.collection('matches').add({
        tournamentId: tournament.id,
        round: 'quarterFinal',
        bracketPosition: getBracketPosition('quarterFinal', i),
        team1: {
          id: team1.id,
          name: team1.country,
          representativeEmail: team1.representativeEmail,
          squad: team1.players,
        },
        team2: {
          id: team2.id,
          name: team2.country,
          representativeEmail: team2.representativeEmail,
          squad: team2.players,
        },
        status: 'pending',
        emailsSent: false,
        createdAt: Timestamp.now(),
      });

      (bracket.quarterFinals[i] as any).matchId = matchRef.id;
      qfMatches.push(matchRef.id);
    }

    // Initialize semi final matches (will be populated when QF winners are determined)
    const sfMatches = [];
    for (let i = 0; i < bracket.semiFinals.length; i++) {
      const matchRef = await adminDb.collection('matches').add({
        tournamentId: tournament.id,
        round: 'semiFinal',
        bracketPosition: getBracketPosition('semiFinal', i),
        team1: {
          id: '',
          name: 'TBD',
          representativeEmail: '',
          squad: [],
        },
        team2: {
          id: '',
          name: 'TBD',
          representativeEmail: '',
          squad: [],
        },
        status: 'pending',
        emailsSent: false,
        createdAt: Timestamp.now(),
      });

      (bracket.semiFinals[i] as any).matchId = matchRef.id;
      sfMatches.push(matchRef.id);
    }

    // Initialize final match
    const finalMatchRef = await adminDb.collection('matches').add({
      tournamentId: tournament.id,
      round: 'final',
      bracketPosition: 'FINAL',
      team1: {
        id: '',
        name: 'TBD',
        representativeEmail: '',
        squad: [],
      },
      team2: {
        id: '',
        name: 'TBD',
        representativeEmail: '',
        squad: [],
      },
      status: 'pending',
      emailsSent: false,
      createdAt: Timestamp.now(),
    });

    (bracket.final as any).matchId = finalMatchRef.id;

    // Update tournament with bracket and status using Admin SDK
    await adminDb.collection('tournaments').doc(tournament.id).update({
      status: 'active',
      startedAt: Timestamp.now(),
      teamIds: teams.map(t => t.id),
      bracket: bracket,
      currentRound: 'quarterFinal',
    });

    // Automatically play all quarter final matches
    const playResults = [];
    for (const matchId of qfMatches) {
      try {
        const playResult = await playMatch(matchId);
        playResults.push({ matchId, success: playResult.success, error: playResult.error });
      } catch (error: any) {
        console.error(`Error playing match ${matchId}:`, error);
        playResults.push({ matchId, success: false, error: error.message });
      }
    }

    // Check if all matches played successfully
    const allPlayed = playResults.every(r => r.success);
    if (!allPlayed) {
      const errors = playResults.filter(r => !r.success).map(r => r.error).join(', ');
      return { 
        success: true, 
        message: `Tournament started, but some matches failed to play: ${errors}`,
        warnings: playResults.filter(r => !r.success),
      };
    }

    return { success: true, message: 'Tournament started and all quarter final matches played successfully!' };
  } catch (error: any) {
    console.error('Error starting tournament:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reset tournament (admin only) - Archives current tournament to history first
 */
export async function resetTournament() {
  try {
    const tournamentStatus = await getTournamentStatus();
    if (!tournamentStatus.success || !tournamentStatus.tournament) {
      return { success: false, error: 'No tournament found' };
    }
    const tournament = tournamentStatus.tournament;

    // Archive tournament to history if it has matches or a winner
    if (tournament.status === 'completed' || tournament.status === 'active') {
      try {
        // Get all matches for top scorers calculation
        const { getMatchesByTournament } = await import('@/lib/firebase/firestore');
        const matches = await getMatchesByTournament(tournament.id);
        const teams = await getTeamsByTournament(tournament.id);
        
        // Aggregate top scorers
        const scorerMap = new Map<string, { playerName: string; teamName: string; goals: number; position: string }>();
        
        matches
          .filter(m => m.status === 'completed' && m.result)
          .forEach(match => {
            if (match.result?.goalScorers) {
              match.result.goalScorers.forEach(goal => {
                const existing = scorerMap.get(goal.playerId);
                const team = teams.find(t => t.id === goal.teamId);
                const player = team?.players.find(p => p.id === goal.playerId);
                
                if (existing) {
                  existing.goals += 1;
                } else {
                  scorerMap.set(goal.playerId, {
                    playerName: goal.playerName,
                    teamName: team?.country || 'Unknown',
                    goals: 1,
                    position: player?.naturalPosition || 'Unknown',
                  });
                }
              });
            }
          });
        
        // Sort and get top 10 scorers
        const topScorers = Array.from(scorerMap.values())
          .sort((a, b) => {
            if (b.goals !== a.goals) return b.goals - a.goals;
            return a.playerName.localeCompare(b.playerName);
          })
          .slice(0, 10)
          .map(scorer => ({
            playerId: '', // Not needed for history
            playerName: scorer.playerName,
            teamName: scorer.teamName,
            goals: scorer.goals,
            position: scorer.position,
          }));
        
        // Get winner and runner-up team names
        let winnerName = 'N/A';
        let runnerUpName = 'N/A';
        let winnerManager = 'N/A';
        let runnerUpManager = 'N/A';
        
        if (tournament.winnerId) {
          const winnerTeam = teams.find(t => t.id === tournament.winnerId);
          if (winnerTeam) {
            winnerName = winnerTeam.country;
            winnerManager = winnerTeam.managerName;
          }
        }
        
        if (tournament.runnerUpId) {
          const runnerUpTeam = teams.find(t => t.id === tournament.runnerUpId);
          if (runnerUpTeam) {
            runnerUpName = runnerUpTeam.country;
            runnerUpManager = runnerUpTeam.managerName;
          }
        }
        
        // Calculate total goals
        const totalGoals = matches
          .filter(m => m.status === 'completed' && m.result)
          .reduce((sum, m) => {
            if (m.result) {
              return sum + (m.result.team1Score || 0) + (m.result.team2Score || 0);
            }
            return sum;
          }, 0);
        
        // Create tournament history entry
        await adminDb.collection('tournamentHistory').add({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          winnerId: tournament.winnerId || '',
          winnerName,
          winnerManager,
          runnerUpId: tournament.runnerUpId || '',
          runnerUpName,
          runnerUpManager,
          topScorers,
          totalMatches: matches.filter(m => m.status === 'completed').length,
          totalGoals,
          participatingTeams: teams.map(t => t.country),
          completedAt: tournament.completedAt || tournament.startedAt || Timestamp.now(),
          archivedAt: Timestamp.now(),
        });
      } catch (archiveError) {
        console.error('Error archiving tournament:', archiveError);
        // Continue with reset even if archiving fails
      }
    }

    // Reset tournament using Admin SDK
    await adminDb.collection('tournaments').doc(tournament.id).update({
      status: 'registration',
      startedAt: FieldValue.delete(),
      completedAt: FieldValue.delete(),
      currentRound: null,
      teamIds: [],
      bracket: {
        quarterFinals: [],
        semiFinals: [],
        final: {
          matchId: '',
          team1Id: '',
          team2Id: '',
        },
      },
      winnerId: FieldValue.delete(),
      runnerUpId: FieldValue.delete(),
    });

    return { success: true, message: 'Tournament reset successfully and archived to history!' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
