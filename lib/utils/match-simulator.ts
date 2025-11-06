import { Team, Player, Position, GoalScorer, MatchResult, PenaltyShootout } from '@/types';

/**
 * Select random player for goal scoring
 * Weighted by position and rating
 */
function selectRandomPlayer(team: Team, preferredPositions: Position[]): Player {
  const availablePlayers = team.players.filter(player => 
    preferredPositions.includes(player.naturalPosition)
  );
  
  if (availablePlayers.length === 0) {
    // Fallback to any player
    return team.players[Math.floor(Math.random() * team.players.length)];
  }
  
  // Weight by rating in natural position
  const weights = availablePlayers.map(player => {
    const rating = player.ratings[player.naturalPosition];
    return Math.max(rating, 1); // Ensure minimum weight
  });
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < availablePlayers.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return availablePlayers[i];
    }
  }
  
  return availablePlayers[0]; // Fallback
}

/**
 * Generate goal scorers for a team
 */
function generateGoalScorers(team: Team, goalCount: number): GoalScorer[] {
  const scorers: GoalScorer[] = [];
  const usedMinutes = new Set<number>();
  
  for (let i = 0; i < goalCount; i++) {
    // Position preference: 70% AT, 25% MD, 5% DF
    const positionRand = Math.random();
    let preferredPositions: Position[];
    
    if (positionRand < 0.7) {
      preferredPositions = ['AT'];
    } else if (positionRand < 0.95) {
      preferredPositions = ['MD'];
    } else {
      preferredPositions = ['DF'];
    }
    
    const scorer = selectRandomPlayer(team, preferredPositions);
    
    // Generate unique minute
    let minute: number;
    do {
      minute = Math.floor(Math.random() * 90) + 1;
    } while (usedMinutes.has(minute));
    usedMinutes.add(minute);
    
    scorers.push({
      playerId: scorer.id,
      playerName: scorer.name,
      teamId: team.id,
      minute,
      isExtraTime: false,
      isPenalty: false,
    });
  }
  
  return scorers.sort((a, b) => a.minute - b.minute);
}

/**
 * Generate goals for extra time
 */
function generateExtraTimeGoals(team: Team, goalCount: number): GoalScorer[] {
  const scorers: GoalScorer[] = [];
  
  for (let i = 0; i < goalCount; i++) {
    const scorer = selectRandomPlayer(team, ['AT', 'MD']);
    const minute = Math.floor(Math.random() * 30) + 91; // 91-120
    
    scorers.push({
      playerId: scorer.id,
      playerName: scorer.name,
      teamId: team.id,
      minute,
      isExtraTime: true,
      isPenalty: false,
    });
  }
  
  return scorers;
}

/**
 * Simulate penalty shootout
 */
function simulatePenaltyShootout(team1: Team, team2: Team): {
  team1Score: number;
  team2Score: number;
  penalties: Array<{ teamId: string; playerId: string; scored: boolean; order: number }>;
} {
  const penalties: Array<{ teamId: string; playerId: string; scored: boolean; order: number }> = [];
  let team1Score = 0;
  let team2Score = 0;
  
  // First 5 penalties each
  for (let round = 0; round < 5; round++) {
    // Team 1 penalty
    const team1Player = selectRandomPlayer(team1, ['AT', 'MD', 'DF']);
    const team1Scored = Math.random() < 0.75; // 75% success rate
    if (team1Scored) team1Score++;
    
    penalties.push({
      teamId: team1.id,
      playerId: team1Player.id,
      scored: team1Scored,
      order: round * 2 + 1,
    });
    
    // Team 2 penalty
    const team2Player = selectRandomPlayer(team2, ['AT', 'MD', 'DF']);
    const team2Scored = Math.random() < 0.75; // 75% success rate
    if (team2Scored) team2Score++;
    
    penalties.push({
      teamId: team2.id,
      playerId: team2Player.id,
      scored: team2Scored,
      order: round * 2 + 2,
    });
  }
  
  // Sudden death if tied
  let round = 5;
  while (team1Score === team2Score) {
    // Team 1 penalty
    const team1Player = selectRandomPlayer(team1, ['AT', 'MD', 'DF']);
    const team1Scored = Math.random() < 0.75;
    if (team1Scored) team1Score++;
    
    penalties.push({
      teamId: team1.id,
      playerId: team1Player.id,
      scored: team1Scored,
      order: round * 2 + 1,
    });
    
    // Team 2 penalty
    const team2Player = selectRandomPlayer(team2, ['AT', 'MD', 'DF']);
    const team2Scored = Math.random() < 0.75;
    if (team2Scored) team2Score++;
    
    penalties.push({
      teamId: team2.id,
      playerId: team2Player.id,
      scored: team2Scored,
      order: round * 2 + 2,
    });
    
    round++;
  }
  
  return { team1Score, team2Score, penalties };
}

/**
 * Generate realistic goal count based on team rating
 */
function generateGoalCount(teamRating: number, isHomeTeam: boolean = true): number {
  // Base goal probability based on rating
  const baseProbability = teamRating / 100;
  
  // Add some randomness
  const randomFactor = (Math.random() - 0.5) * 0.4; // ±20%
  const adjustedProbability = Math.max(0, Math.min(1, baseProbability + randomFactor));
  
  // Generate goals using Poisson-like distribution
  let goals = 0;
  let probability = adjustedProbability;
  
  // Most common: 0-3 goals
  if (Math.random() < probability * 0.8) {
    goals = Math.floor(Math.random() * 4); // 0-3
  } else if (Math.random() < probability * 0.95) {
    goals = Math.floor(Math.random() * 2) + 4; // 4-5
  } else {
    goals = Math.floor(Math.random() * 2) + 6; // 6-7 (rare)
  }
  
  return Math.min(goals, 7); // Cap at 7 goals
}

/**
 * Main match simulation function
 */
export function simulateMatch(team1: Team, team2: Team): MatchResult {
  // Generate goal counts
  const team1Goals = generateGoalCount(team1.overallRating, true);
  const team2Goals = generateGoalCount(team2.overallRating, false);
  
  let finalTeam1Goals = team1Goals;
  let finalTeam2Goals = team2Goals;
  let wentToExtraTime = false;
  let wentToPenalties = false;
  let penaltyShootout: PenaltyShootout | undefined;
  
  const allGoalScorers: GoalScorer[] = [];
  
  // Normal time goals
  if (team1Goals > 0) {
    allGoalScorers.push(...generateGoalScorers(team1, team1Goals));
  }
  if (team2Goals > 0) {
    allGoalScorers.push(...generateGoalScorers(team2, team2Goals));
  }
  
  // Check if draw after 90 minutes
  if (team1Goals === team2Goals) {
    wentToExtraTime = true;
    
    // Extra time goals (0-2 goals each)
    const extraTimeGoals1 = Math.random() < 0.3 ? Math.floor(Math.random() * 2) : 0;
    const extraTimeGoals2 = Math.random() < 0.3 ? Math.floor(Math.random() * 2) : 0;
    
    finalTeam1Goals += extraTimeGoals1;
    finalTeam2Goals += extraTimeGoals2;
    
    if (extraTimeGoals1 > 0) {
      allGoalScorers.push(...generateExtraTimeGoals(team1, extraTimeGoals1));
    }
    if (extraTimeGoals2 > 0) {
      allGoalScorers.push(...generateExtraTimeGoals(team2, extraTimeGoals2));
    }
    
    // Still tied? Penalty shootout
    if (finalTeam1Goals === finalTeam2Goals) {
      wentToPenalties = true;
      penaltyShootout = simulatePenaltyShootout(team1, team2);
      
      // Update final scores with penalty results
      if (penaltyShootout.team1Score > penaltyShootout.team2Score) {
        finalTeam1Goals = finalTeam1Goals; // Team 1 wins on penalties
      } else {
        finalTeam2Goals = finalTeam2Goals; // Team 2 wins on penalties
      }
    }
  }
  
  // Determine winner
  let winnerId: string;
  let loserId: string;
  
  if (wentToPenalties) {
    if (penaltyShootout!.team1Score > penaltyShootout!.team2Score) {
      winnerId = team1.id;
      loserId = team2.id;
    } else {
      winnerId = team2.id;
      loserId = team1.id;
    }
  } else {
    if (finalTeam1Goals > finalTeam2Goals) {
      winnerId = team1.id;
      loserId = team2.id;
    } else {
      winnerId = team2.id;
      loserId = team1.id;
    }
  }
  
  return {
    team1Score: finalTeam1Goals,
    team2Score: finalTeam2Goals,
    winnerId,
    loserId,
    isDraw: team1Goals === team2Goals && !wentToExtraTime,
    goalScorers: allGoalScorers.sort((a, b) => a.minute - b.minute),
    wentToExtraTime,
    wentToPenalties,
    penaltyShootout,
  };
}

