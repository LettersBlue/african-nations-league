'use server';

import { getTournamentStatus } from '@/app/actions/tournament';
import { getUserTeam } from '@/app/actions/team';
import { getMatchesByTournament } from '@/lib/firebase/firestore';
import { Match } from '@/types';

export interface TeamAnalytics {
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  goalDifference: number;
  winRate: number;
  avgGoalsPerMatch: number;
  matchHistory: Array<{
    matchId: string;
    opponent: string;
    score: string;
    result: 'win' | 'draw' | 'loss';
    goalsScored: number;
    goalsConceded: number;
    round: string;
    date: Date;
  }>;
  topScorer: {
    playerId: string;
    playerName: string;
    goals: number;
    position: string;
  } | null;
  playerGoals: Array<{
    playerId: string;
    playerName: string;
    goals: number;
    position: string;
  }>;
  goalsPerMatch: Array<{
    matchNumber: number;
    goalsScored: number;
    goalsConceded: number;
  }>;
}

/**
 * Get team analytics for a representative
 */
export async function getTeamAnalytics(representativeUid: string): Promise<{
  success: boolean;
  analytics?: TeamAnalytics;
  error?: string;
}> {
  try {
    // Get user's team
    const teamResult = await getUserTeam(representativeUid);
    if (!teamResult.success || !teamResult.team) {
      return { success: false, error: 'Team not found' };
    }

    const team = teamResult.team;

    // Get tournament
    const tournamentStatus = await getTournamentStatus();
    if (!tournamentStatus.success || !tournamentStatus.tournament) {
      return { success: false, error: 'Tournament not found' };
    }

    const tournament = tournamentStatus.tournament;

    // Get all matches for the tournament
    const matches = await getMatchesByTournament(tournament.id);

    // Filter matches where this team participated
    const teamMatches = matches.filter(
      m =>
        m.status === 'completed' &&
        m.result &&
        (m.team1.id === team.id || m.team2.id === team.id)
    );

    // Calculate statistics
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsScored = 0;
    let goalsConceded = 0;

    const matchHistory: TeamAnalytics['matchHistory'] = [];
    const playerGoalsMap = new Map<string, { playerId: string; playerName: string; goals: number; position: string }>();

    teamMatches.forEach((match, index) => {
      if (!match.result) return;

      const isTeam1 = match.team1.id === team.id;
      const teamScore = isTeam1 ? match.result.team1Score : match.result.team2Score;
      const opponentScore = isTeam1 ? match.result.team2Score : match.result.team1Score;
      const opponentName = isTeam1 ? match.team2.name : match.team1.name;

      goalsScored += teamScore;
      goalsConceded += opponentScore;

      let result: 'win' | 'draw' | 'loss';
      if (teamScore > opponentScore) {
        wins++;
        result = 'win';
      } else if (teamScore === opponentScore) {
        draws++;
        result = 'draw';
      } else {
        losses++;
        result = 'loss';
      }

      matchHistory.push({
        matchId: match.id,
        opponent: opponentName,
        score: `${teamScore} - ${opponentScore}`,
        result,
        goalsScored: teamScore,
        goalsConceded: opponentScore,
        round: match.round,
        date: match.completedAt || match.createdAt,
      });

      // Aggregate player goals
      match.result.goalScorers
        ?.filter(g => g.teamId === team.id)
        .forEach(goal => {
          const player = team.players.find(p => p.id === goal.playerId);
          const existing = playerGoalsMap.get(goal.playerId);
          
          if (existing) {
            existing.goals += 1;
          } else {
            playerGoalsMap.set(goal.playerId, {
              playerId: goal.playerId,
              playerName: goal.playerName,
              goals: 1,
              position: player?.naturalPosition || 'Unknown',
            });
          }
        });

      // Goals per match data
    });

    // Get top scorer
    const playerGoals = Array.from(playerGoalsMap.values()).sort((a, b) => b.goals - a.goals);
    const topScorer = playerGoals.length > 0 ? {
      playerId: '', // Not needed for display
      playerName: playerGoals[0].playerName,
      goals: playerGoals[0].goals,
      position: playerGoals[0].position,
    } : null;

    // Goals per match timeline
    const goalsPerMatch = matchHistory.map((match, index) => ({
      matchNumber: index + 1,
      goalsScored: match.goalsScored,
      goalsConceded: match.goalsConceded,
    }));

    const analytics: TeamAnalytics = {
      matchesPlayed: teamMatches.length,
      wins,
      draws,
      losses,
      goalsScored,
      goalsConceded,
      goalDifference: goalsScored - goalsConceded,
      winRate: teamMatches.length > 0 ? (wins / teamMatches.length) * 100 : 0,
      avgGoalsPerMatch: teamMatches.length > 0 ? goalsScored / teamMatches.length : 0,
      matchHistory: matchHistory.sort((a, b) => b.date.getTime() - a.date.getTime()),
      topScorer,
      playerGoals,
      goalsPerMatch,
    };

    return { success: true, analytics };
  } catch (error: any) {
    console.error('Error getting team analytics:', error);
    return { success: false, error: error.message || 'Failed to get analytics' };
  }
}

