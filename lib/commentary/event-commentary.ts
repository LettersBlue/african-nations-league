/**
 * Generate contextual commentary for match events
 * Includes stats, probabilities, player info, team info, tournament context
 */

import { MatchEvent, Match, Team, Player } from '@/types';

export interface CommentaryContext {
  match: Match;
  team1: Team;
  team2: Team;
  currentScore: { team1: number; team2: number };
  tournamentRound: string;
  eventIndex: number;
  totalEvents: number;
}

/**
 * Calculate win probability based on current score and team ratings
 */
function calculateWinProbability(
  team1Rating: number,
  team2Rating: number,
  currentScore: { team1: number; team2: number },
  minute: number
): { team1: number; team2: number } {
  const ratingDiff = team1Rating - team2Rating;
  const scoreDiff = currentScore.team1 - currentScore.team2;
  
  // Base probability from ratings (60% weight)
  let team1Prob = 50 + (ratingDiff * 0.5);
  
  // Adjust based on current score (30% weight)
  team1Prob += scoreDiff * 10;
  
  // Adjust based on time remaining (10% weight)
  const timeRemaining = 90 - minute;
  if (timeRemaining < 15 && scoreDiff !== 0) {
    // If leading with little time left, increase probability
    team1Prob += scoreDiff > 0 ? 5 : -5;
  }
  
  // Clamp between 10% and 90%
  team1Prob = Math.max(10, Math.min(90, team1Prob));
  const team2Prob = 100 - team1Prob;
  
  return { team1: team1Prob, team2: team2Prob };
}

/**
 * Get player stats string
 */
function getPlayerStats(player: Player | undefined, teamName: string): string {
  if (!player) return '';
  
  const stats: string[] = [];
  
  if (player.goals > 0) {
    stats.push(`${player.goals} goal${player.goals > 1 ? 's' : ''} this tournament`);
  }
  
  if (player.appearances > 0) {
    stats.push(`${player.appearances} appearance${player.appearances > 1 ? 's' : ''}`);
  }
  
  // Get best position rating
  const ratings = player.ratings;
  const bestRating = Math.max(ratings.GK, ratings.DF, ratings.MD, ratings.AT);
  const bestPosition = Object.entries(ratings).find(([_, rating]) => rating === bestRating)?.[0];
  
  if (bestPosition && bestRating > 70) {
    stats.push(`strong ${bestPosition} with rating ${bestRating}`);
  }
  
  return stats.length > 0 ? `, who has ${stats.join(', ')}` : '';
}

/**
 * Get team stats string
 */
function getTeamStats(team: Team, tournamentRound: string): string {
  const stats: string[] = [];
  
  if (team.stats.matchesPlayed > 0) {
    const winRate = (team.stats.wins / team.stats.matchesPlayed) * 100;
    stats.push(`${winRate.toFixed(0)}% win rate`);
    
    if (team.stats.goalsScored > 0) {
      const avgGoals = (team.stats.goalsScored / team.stats.matchesPlayed).toFixed(1);
      stats.push(`averaging ${avgGoals} goals per match`);
    }
  }
  
  if (team.overallRating > 0) {
    stats.push(`overall rating of ${team.overallRating.toFixed(1)}`);
  }
  
  return stats.length > 0 ? ` (${stats.join(', ')})` : '';
}

/**
 * Generate contextual commentary for a match event
 */
export function generateEventCommentary(
  event: MatchEvent,
  context: CommentaryContext
): string {
  const { match, team1, team2, currentScore, tournamentRound, eventIndex, totalEvents } = context;
  const minute = Math.floor(event.minute);
  
  // Get team names - use country if available, otherwise use name
  const team1Name = team1.country || match.team1.name || 'Team 1';
  const team2Name = team2.country || match.team2.name || 'Team 2';
  
  // Calculate win probability
  const winProb = calculateWinProbability(
    team1.overallRating,
    team2.overallRating,
    currentScore,
    minute
  );
  
  // Find player if event has player
  const player = event.playerId 
    ? (event.teamId === team1.id 
        ? team1.players.find(p => p.id === event.playerId)
        : team2.players.find(p => p.id === event.playerId))
    : undefined;
  
  const playerName = event.playerName || player?.name || 'Player';
  const playerStats = getPlayerStats(player, event.teamId === team1.id ? team1Name : team2Name);
  
  // Team info
  const team1Stats = getTeamStats(team1, tournamentRound);
  const team2Stats = getTeamStats(team2, tournamentRound);
  
  // Generate commentary based on event type
  switch (event.type) {
    case 'kickoff':
      return `${minute}' - We're underway! ${team1Name} take on ${team2Name} in the ${tournamentRound}.`;
    
    case 'goal':
      const goalTeam = event.teamId === team1.id ? team1 : team2;
      const goalTeamName = event.teamId === team1.id ? team1Name : team2Name;
      const newScore = event.score || currentScore;
      
      return `${minute}' - GOAL! ${playerName} scores for ${goalTeamName}! ${newScore.team1} - ${newScore.team2}.`;
    
    case 'own_goal':
      return `${minute}' - Own goal! ${playerName} puts it in his own net. ${event.teamId === team1.id ? team2Name : team1Name} benefit!`;
    
    case 'shot_on_target':
      return `${minute}' - ${playerName} shoots on target!`;
    
    case 'shot_off_target':
      return `${minute}' - ${playerName} shoots wide.`;
    
    case 'save':
      return `${minute}' - Great save!`;
    
    case 'corner_kick':
      return `${minute}' - Corner kick for ${event.teamId === team1.id ? team1Name : team2Name}. Dangerous situation!`;
    
    case 'free_kick':
      return `${minute}' - Free kick for ${event.teamId === team1.id ? team1Name : team2Name}. ${playerName} to take. This is dangerous!`;
    
    case 'penalty_kick':
      return `${minute}' - PENALTY! ${event.teamId === team1.id ? team1Name : team2Name} awarded. ${playerName} steps up!`;
    
    case 'yellow_card':
      return `${minute}' - Yellow card to ${playerName}.`;
    
    case 'red_card':
      return `${minute}' - RED CARD! ${playerName} sent off! ${event.teamId === team1.id ? team1Name : team2Name} down to 10 men!`;
    
    case 'substitution':
      return `${minute}' - Substitution: ${event.subbedOutPlayerName || 'Player'} off, ${event.subbedInPlayerName || 'Player'} on.`;
    
    case 'foul':
      return `${minute}' - Foul by ${playerName}.`;
    
    case 'offside':
      return `${minute}' - Offside! ${event.offsidePlayer || playerName} caught.`;
    
    case 'halftime':
      return `${minute}' - Half time! ${currentScore.team1} - ${currentScore.team2}.`;
    
    case 'fulltime':
      if (currentScore.team1 === currentScore.team2) {
        return `${minute}' - Full time! ${currentScore.team1} - ${currentScore.team2}. Extra time!`;
      }
      return `${minute}' - Full time! ${currentScore.team1} - ${currentScore.team2}.`;
    
    case 'extratime':
      return `${minute}' - Extra time begins! ${currentScore.team1} - ${currentScore.team2}.`;
    
    case 'penalties':
      return `${minute}' - Penalty shootout! ${team1Name} vs ${team2Name}.`;
    
    case 'final':
      return `${minute}' - Match ends! ${currentScore.team1} - ${currentScore.team2}.`;
    
    default:
      return `${minute}' - ${event.description}`;
  }
}

