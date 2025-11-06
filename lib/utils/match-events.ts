import { Team, Player, Position, MatchEvent, MatchEventType, GoalScorer } from '@/types';

/**
 * Select random player weighted by position and rating
 */
function selectRandomPlayer(team: Team, preferredPositions: Position[]): Player {
  const availablePlayers = team.players.filter(player => 
    preferredPositions.includes(player.naturalPosition)
  );
  
  if (availablePlayers.length === 0) {
    return team.players[Math.floor(Math.random() * team.players.length)];
  }
  
  const weights = availablePlayers.map(player => {
    const rating = player.ratings[player.naturalPosition];
    return Math.max(rating, 1);
  });
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < availablePlayers.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return availablePlayers[i];
    }
  }
  
  return availablePlayers[0];
}

/**
 * Get pause duration for an event type (in milliseconds)
 */
function getPauseDuration(eventType: MatchEventType): number {
  const pauseMap: Record<MatchEventType, number> = {
    kickoff: 2000,
    goal: 4000,
    own_goal: 4000,
    shot_on_target: 2000,
    shot_off_target: 1500,
    save: 2500,
    assist: 2000,
    offside: 1500,
    foul: 1500,
    free_kick: 2000,
    penalty_kick: 3000,
    corner_kick: 1800,
    goal_kick: 1000,
    throw_in: 1000,
    yellow_card: 2000,
    red_card: 3000,
    substitution: 2000,
    halftime: 3000,
    fulltime: 3000,
    injury_stoppage: 2000,
    var_review: 4000,
    added_time: 2000,
    extratime: 2000,
    penalties: 3000,
    final: 3000,
  };
  
  return pauseMap[eventType] || 1000;
}

/**
 * Generate a realistic match event timeline with all event types
 */
export function generateMatchEvents(
  team1: Team,
  team2: Team,
  finalResult: {
    team1Score: number;
    team2Score: number;
    goalScorers: GoalScorer[];
    wentToExtraTime: boolean;
    wentToPenalties: boolean;
  }
): MatchEvent[] {
  const events: MatchEvent[] = [];
  let currentScore = { team1: 0, team2: 0 };
  const usedMinutes = new Set<number>();
  const goalScorersByMinute = new Map<number, GoalScorer>();
  const assistMap = new Map<string, string>(); // Track assists for goals
  
  // Map goals by minute
  finalResult.goalScorers.forEach(goal => {
    goalScorersByMinute.set(goal.minute, goal);
  });
  
  // Kickoff
  events.push({
    id: `event-${Date.now()}-0`,
    type: 'kickoff',
    minute: 0,
    isExtraTime: false,
    description: `Match kicks off! ${team1.country} vs ${team2.country}`,
    score: { team1: 0, team2: 0 },
    pauseDuration: getPauseDuration('kickoff'),
  });
  
  // Generate events throughout the match
  const totalMinutes = finalResult.wentToExtraTime ? 120 : 90;
  const goalMinutes = Array.from(goalScorersByMinute.keys()).sort((a, b) => a - b);
  
  // Calculate event frequency based on team ratings
  const avgRating = (team1.overallRating + team2.overallRating) / 2;
  const eventFrequency = Math.max(1.5, Math.min(4, avgRating / 12)); // Events every 1.5-4 minutes
  
  // Track substitutions
  const substitutions: { team: Team; minute: number }[] = [];
  
  for (let minute = 1; minute <= totalMinutes; minute++) {
    const isExtraTime = minute > 90;
    const isNormalTime = !isExtraTime;
    
    // Check if this is a goal minute
    if (goalScorersByMinute.has(minute)) {
      const goal = goalScorersByMinute.get(minute)!;
      const isTeam1Goal = goal.teamId === team1.id;
      const scoringTeam = isTeam1Goal ? team1 : team2;
      
      // Check for own goal (5% chance)
      const isOwnGoal = Math.random() < 0.05 && minute > 10;
      
      if (isOwnGoal) {
        // Own goal scored by defending team
        const defendingTeam = isTeam1Goal ? team2 : team1;
        const defender = selectRandomPlayer(defendingTeam, ['DF', 'GK']);
        currentScore.team1 += isTeam1Goal ? 1 : 0;
        currentScore.team2 += isTeam1Goal ? 0 : 1;
        
        events.push({
          id: `event-${Date.now()}-${minute}-own-goal`,
          type: 'own_goal',
          minute,
          isExtraTime,
          teamId: defendingTeam.id,
          playerId: defender.id,
          playerName: defender.name,
          description: `OWN GOAL! ${minute}' - ${defender.name} (${defendingTeam.country}) accidentally scores for ${scoringTeam.country}!`,
          goal: {
            ...goal,
            playerId: defender.id,
            playerName: defender.name,
            teamId: scoringTeam.id,
          },
          isOwnGoal: true,
          score: { team1: currentScore.team1, team2: currentScore.team2 },
          pauseDuration: getPauseDuration('own_goal'),
        });
      } else {
        // Normal goal
        currentScore.team1 += isTeam1Goal ? 1 : 0;
        currentScore.team2 += isTeam1Goal ? 0 : 1;
        
        // Generate assist (30% chance)
        let assistEvent: MatchEvent | null = null;
        if (Math.random() < 0.3 && minute > 1) {
          const assistPlayer = selectRandomPlayer(scoringTeam, ['AT', 'MD']);
          assistEvent = {
            id: `event-${Date.now()}-${minute}-assist`,
            type: 'assist',
            minute: minute - 0.5, // Slightly before goal
            isExtraTime,
            teamId: scoringTeam.id,
            playerId: assistPlayer.id,
            playerName: assistPlayer.name,
            assistPlayerId: assistPlayer.id,
            assistPlayerName: assistPlayer.name,
            description: `Assist by ${assistPlayer.name} (${scoringTeam.country})!`,
            score: { team1: currentScore.team1 - (isTeam1Goal ? 1 : 0), team2: currentScore.team2 - (isTeam1Goal ? 0 : 1) },
            pauseDuration: getPauseDuration('assist'),
          };
        }
        
        if (assistEvent) {
          events.push(assistEvent);
        }
        
        events.push({
          id: `event-${Date.now()}-${minute}-goal`,
          type: 'goal',
          minute,
          isExtraTime,
          teamId: goal.teamId,
          playerId: goal.playerId,
          playerName: goal.playerName,
          assistPlayerId: assistEvent?.playerId,
          assistPlayerName: assistEvent?.playerName,
          description: `GOAL! ${minute}' - ${goal.playerName} scores for ${scoringTeam.country}${assistEvent ? ` (assist: ${assistEvent.playerName})` : ''}!`,
          goal,
          score: { team1: currentScore.team1, team2: currentScore.team2 },
          pauseDuration: getPauseDuration('goal'),
        });
      }
      
      usedMinutes.add(minute);
      continue;
    }
    
    // Generate other events based on probability
    if (Math.random() < (1 / eventFrequency)) {
      const eventType = generateRandomEventType(minute, goalMinutes, finalResult, isExtraTime);
      
      if (eventType) {
        const event = createEventForType(
          eventType,
          minute,
          team1,
          team2,
          currentScore,
          isExtraTime,
          usedMinutes
        );
        
        if (event) {
          events.push(event);
          usedMinutes.add(minute);
          
          // Track substitution
          if (eventType === 'substitution') {
            substitutions.push({ team: event.teamId === team1.id ? team1 : team2, minute });
          }
        }
      }
    }
    
    // Injury stoppage (rare, 2% chance per minute after 30')
    if (minute > 30 && Math.random() < 0.02 && !usedMinutes.has(minute)) {
      const stoppageMinutes = Math.floor(Math.random() * 3) + 1;
      events.push({
        id: `event-${Date.now()}-${minute}-injury`,
        type: 'injury_stoppage',
        minute: minute + 0.3,
        isExtraTime,
        description: `Injury stoppage - ${stoppageMinutes} minutes added`,
        score: { ...currentScore },
        pauseDuration: getPauseDuration('injury_stoppage'),
      });
      usedMinutes.add(minute);
    }
    
    // VAR review (rare, 1% chance per minute after 20')
    if (minute > 20 && Math.random() < 0.01 && !usedMinutes.has(minute)) {
      const varDecisions: Array<'goal' | 'no_goal' | 'penalty' | 'no_penalty' | 'red_card' | 'no_red_card'> = 
        ['goal', 'no_goal', 'penalty', 'no_penalty', 'red_card', 'no_red_card'];
      const decision = varDecisions[Math.floor(Math.random() * varDecisions.length)];
      events.push({
        id: `event-${Date.now()}-${minute}-var`,
        type: 'var_review',
        minute: minute + 0.5,
        isExtraTime,
        description: `VAR review - Decision: ${decision.replace('_', ' ')}`,
        varDecision: decision,
        score: { ...currentScore },
        pauseDuration: getPauseDuration('var_review'),
      });
      usedMinutes.add(minute);
    }
  }
  
  // Half time
  if (totalMinutes >= 90) {
    const halftimeScore = { team1: 0, team2: 0 };
    finalResult.goalScorers
      .filter(g => !g.isExtraTime && g.minute <= 45)
      .forEach(goal => {
        if (goal.teamId === team1.id) halftimeScore.team1++;
        else halftimeScore.team2++;
      });
    
    events.push({
      id: `event-${Date.now()}-45`,
      type: 'halftime',
      minute: 45,
      isExtraTime: false,
      description: `Half Time - ${team1.country} ${halftimeScore.team1} ${halftimeScore.team2} ${team2.country}`,
      score: { ...halftimeScore },
      pauseDuration: getPauseDuration('halftime'),
    });
  }
  
  // Full time
  events.push({
    id: `event-${Date.now()}-90`,
    type: 'fulltime',
    minute: 90,
    isExtraTime: false,
    description: `Full Time - ${team1.country} ${finalResult.team1Score} ${finalResult.team2Score} ${team2.country}`,
    score: { team1: finalResult.team1Score, team2: finalResult.team2Score },
    pauseDuration: getPauseDuration('fulltime'),
  });
  
  // Added time announcement (if there were events in injury time)
  const injuryTimeEvents = events.filter(e => e.type === 'injury_stoppage' && e.minute >= 85 && e.minute <= 90);
  if (injuryTimeEvents.length > 0) {
    const addedMinutes = Math.floor(Math.random() * 4) + 1;
    events.push({
      id: `event-${Date.now()}-90.5`,
      type: 'added_time',
      minute: 90.5,
      isExtraTime: false,
      description: `${addedMinutes} minutes of added time`,
      addedTimeMinutes: addedMinutes,
      score: { team1: finalResult.team1Score, team2: finalResult.team2Score },
      pauseDuration: getPauseDuration('added_time'),
    });
  }
  
  // Extra time notification
  if (finalResult.wentToExtraTime) {
    events.push({
      id: `event-${Date.now()}-90.5`,
      type: 'extratime',
      minute: 90.5,
      isExtraTime: false,
      description: `Match goes to Extra Time!`,
      score: { team1: finalResult.team1Score, team2: finalResult.team2Score },
      pauseDuration: getPauseDuration('extratime'),
    });
  }
  
  // Penalties
  if (finalResult.wentToPenalties) {
    events.push({
      id: `event-${Date.now()}-penalties`,
      type: 'penalties',
      minute: 120,
      isExtraTime: true,
      description: `Match goes to Penalty Shootout!`,
      score: { team1: finalResult.team1Score, team2: finalResult.team2Score },
      pauseDuration: getPauseDuration('penalties'),
    });
  }
  
  // Final whistle
  events.push({
    id: `event-${Date.now()}-final`,
    type: 'final',
    minute: totalMinutes,
    isExtraTime: finalResult.wentToExtraTime,
    description: `Final Whistle! ${team1.country} ${finalResult.team1Score} - ${finalResult.team2Score} ${team2.country}`,
    score: { team1: finalResult.team1Score, team2: finalResult.team2Score },
    pauseDuration: getPauseDuration('final'),
  });
  
  // Sort events by minute
  return events.sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    // If same minute, prioritize important events
    const priority: Record<string, number> = {
      goal: 1,
      own_goal: 1,
      var_review: 2,
      red_card: 3,
      yellow_card: 4,
      penalty_kick: 5,
    };
    return (priority[a.type] || 99) - (priority[b.type] || 99);
  });
}

/**
 * Determine what type of event to generate at this minute
 */
function generateRandomEventType(
  minute: number,
  goalMinutes: number[],
  finalResult: any,
  isExtraTime: boolean
): MatchEventType | null {
  // Don't generate events too close to goals
  const tooCloseToGoal = goalMinutes.some(gm => Math.abs(gm - minute) <= 1);
  if (tooCloseToGoal) return null;
  
  const rand = Math.random();
  
  // Higher probability of events in certain periods
  const isIntensePeriod = (minute >= 15 && minute <= 30) || (minute >= 60 && minute <= 75) || (minute >= 105 && minute <= 115);
  const eventChance = isIntensePeriod ? 0.65 : 0.45;
  
  if (rand > eventChance) return null;
  
  // Weight event types
  const eventRand = Math.random();
  
  if (eventRand < 0.20) return 'shot_on_target'; // 20% chance
  if (eventRand < 0.35) return 'shot_off_target'; // 15% chance
  if (eventRand < 0.45) return 'save'; // 10% chance
  if (eventRand < 0.52) return 'corner_kick'; // 7% chance
  if (eventRand < 0.58) return 'offside'; // 6% chance
  if (eventRand < 0.65) return 'foul'; // 7% chance
  if (eventRand < 0.70) return 'yellow_card'; // 5% chance
  if (eventRand < 0.74) return 'free_kick'; // 4% chance
  if (eventRand < 0.78) return 'goal_kick'; // 4% chance
  if (eventRand < 0.82) return 'throw_in'; // 4% chance
  if (eventRand < 0.85) return 'penalty_kick'; // 3% chance
  if (eventRand < 0.88) return 'red_card'; // 3% chance
  if (eventRand < 0.92) return 'substitution'; // 4% chance
  return 'injury_stoppage'; // 8% chance
}

/**
 * Create a specific event type
 */
function createEventForType(
  type: MatchEventType,
  minute: number,
  team1: Team,
  team2: Team,
  currentScore: { team1: number; team2: number },
  isExtraTime: boolean,
  usedMinutes: Set<number>
): MatchEvent | null {
  // Ensure unique minute (allow slight overlap for realistic events)
  let eventMinute = minute;
  while (usedMinutes.has(eventMinute) && eventMinute < minute + 2) {
    eventMinute += 0.1;
  }
  
  const teamRand = Math.random();
  const isTeam1 = teamRand < 0.5;
  const team = isTeam1 ? team1 : team2;
  const opponent = isTeam1 ? team2 : team1;
  
  const pauseDuration = getPauseDuration(type);
  
  switch (type) {
    case 'shot_on_target': {
      const player = selectRandomPlayer(team, ['AT', 'MD']);
      const saved = Math.random() < 0.5;
      
      return {
        id: `event-${Date.now()}-${eventMinute}-shot-on`,
        type: 'shot_on_target',
        minute: eventMinute,
        isExtraTime,
        teamId: team.id,
        playerId: player.id,
        playerName: player.name,
        shotType: 'shot',
        saved,
        description: `${player.name} (${team.country}) ${saved ? 'forces a save' : 'hits the target'}`,
        score: { ...currentScore },
        pauseDuration,
      };
    }
    
    case 'shot_off_target': {
      const player = selectRandomPlayer(team, ['AT', 'MD']);
      const shotTypes: Array<'shot' | 'header' | 'volley'> = ['shot', 'header', 'volley'];
      const shotType = shotTypes[Math.floor(Math.random() * shotTypes.length)];
      
      return {
        id: `event-${Date.now()}-${eventMinute}-shot-off`,
        type: 'shot_off_target',
        minute: eventMinute,
        isExtraTime,
        teamId: team.id,
        playerId: player.id,
        playerName: player.name,
        shotType,
        description: `${player.name} (${team.country}) ${shotType} goes wide`,
        score: { ...currentScore },
        pauseDuration,
      };
    }
    
    case 'save': {
      const attacker = selectRandomPlayer(team, ['AT', 'MD']);
      const goalkeeper = selectRandomPlayer(opponent, ['GK']);
      
      return {
        id: `event-${Date.now()}-${eventMinute}-save`,
        type: 'save',
        minute: eventMinute,
        isExtraTime,
        teamId: opponent.id,
        playerId: goalkeeper.id,
        playerName: goalkeeper.name,
        description: `Great save by ${goalkeeper.name} (${opponent.country}) from ${attacker.name}'s shot!`,
        score: { ...currentScore },
        pauseDuration,
      };
    }
    
    case 'corner_kick': {
      const taker = selectRandomPlayer(team, ['AT', 'MD', 'DF']);
      
      return {
        id: `event-${Date.now()}-${eventMinute}-corner`,
        type: 'corner_kick',
        minute: eventMinute,
        isExtraTime,
        teamId: team.id,
        playerId: taker.id,
        playerName: taker.name,
        description: `Corner kick for ${team.country}, ${taker.name} to take`,
        score: { ...currentScore },
        pauseDuration,
      };
    }
    
    case 'goal_kick': {
      return {
        id: `event-${Date.now()}-${eventMinute}-gk`,
        type: 'goal_kick',
        minute: eventMinute,
        isExtraTime,
        teamId: team.id,
        description: `Goal kick for ${team.country}`,
        score: { ...currentScore },
        pauseDuration,
      };
    }
    
    case 'throw_in': {
      const player = selectRandomPlayer(team, ['DF', 'MD']);
      
      return {
        id: `event-${Date.now()}-${eventMinute}-throw`,
        type: 'throw_in',
        minute: eventMinute,
        isExtraTime,
        teamId: team.id,
        playerId: player.id,
        playerName: player.name,
        description: `Throw-in for ${team.country}`,
        score: { ...currentScore },
        pauseDuration,
      };
    }
    
    case 'offside': {
      const player = selectRandomPlayer(team, ['AT']);
      
      return {
        id: `event-${Date.now()}-${eventMinute}-offside`,
        type: 'offside',
        minute: eventMinute,
        isExtraTime,
        teamId: team.id,
        playerId: player.id,
        playerName: player.name,
        offsidePlayer: player.name,
        description: `Offside! ${player.name} (${team.country}) is caught offside.`,
        score: { ...currentScore },
        pauseDuration,
      };
    }
    
    case 'foul': {
      const player = selectRandomPlayer(team, ['MD', 'DF']);
      
      return {
        id: `event-${Date.now()}-${eventMinute}-foul`,
        type: 'foul',
        minute: eventMinute,
        isExtraTime,
        teamId: team.id,
        playerId: player.id,
        playerName: player.name,
        description: `Foul by ${player.name} (${team.country})`,
        score: { ...currentScore },
        pauseDuration,
      };
    }
    
    case 'free_kick': {
      const player = selectRandomPlayer(team, ['AT', 'MD']);
      
      return {
        id: `event-${Date.now()}-${eventMinute}-fk`,
        type: 'free_kick',
        minute: eventMinute,
        isExtraTime,
        teamId: team.id,
        playerId: player.id,
        playerName: player.name,
        description: `Free kick for ${team.country}, ${player.name} to take`,
        score: { ...currentScore },
        pauseDuration,
      };
    }
    
    case 'penalty_kick': {
      const player = selectRandomPlayer(team, ['AT', 'MD']);
      
      return {
        id: `event-${Date.now()}-${eventMinute}-pen`,
        type: 'penalty_kick',
        minute: eventMinute,
        isExtraTime,
        teamId: team.id,
        playerId: player.id,
        playerName: player.name,
        description: `Penalty awarded to ${team.country}! ${player.name} to take`,
        score: { ...currentScore },
        pauseDuration,
      };
    }
    
    case 'yellow_card': {
      const player = selectRandomPlayer(team, ['MD', 'DF', 'AT']);
      
      return {
        id: `event-${Date.now()}-${eventMinute}-yellow`,
        type: 'yellow_card',
        minute: eventMinute,
        isExtraTime,
        teamId: team.id,
        playerId: player.id,
        playerName: player.name,
        cardType: 'yellow',
        description: `Yellow card shown to ${player.name} (${team.country})`,
        score: { ...currentScore },
        pauseDuration,
      };
    }
    
    case 'red_card': {
      const player = selectRandomPlayer(team, ['MD', 'DF']);
      
      return {
        id: `event-${Date.now()}-${eventMinute}-red`,
        type: 'red_card',
        minute: eventMinute,
        isExtraTime,
        teamId: team.id,
        playerId: player.id,
        playerName: player.name,
        cardType: 'red',
        description: `Red card! ${player.name} (${team.country}) is sent off!`,
        score: { ...currentScore },
        pauseDuration,
      };
    }
    
    case 'substitution': {
      // Only allow substitutions in reasonable time windows
      if ((!isExtraTime && (minute < 60 || minute > 85)) || (isExtraTime && minute > 115)) return null;
      
      const teamToSub = Math.random() < 0.5 ? team1 : team2;
      const outPlayer = selectRandomPlayer(teamToSub, ['AT', 'MD', 'DF']);
      const inPlayer = selectRandomPlayer(teamToSub, ['AT', 'MD', 'DF']);
      
      // Ensure different players
      if (outPlayer.id === inPlayer.id) {
        const alternatives = teamToSub.players.filter(p => p.id !== outPlayer.id);
        if (alternatives.length > 0) {
          const altIn = alternatives[Math.floor(Math.random() * alternatives.length)];
          return {
            id: `event-${Date.now()}-${eventMinute}-sub`,
            type: 'substitution',
            minute: eventMinute,
            isExtraTime,
            teamId: teamToSub.id,
            playerId: inPlayer.id,
            playerName: inPlayer.name,
            subbedOutPlayerId: outPlayer.id,
            subbedOutPlayerName: outPlayer.name,
            subbedInPlayerId: altIn.id,
            subbedInPlayerName: altIn.name,
            description: `Substitution: ${outPlayer.name} off, ${altIn.name} on (${teamToSub.country})`,
            score: { ...currentScore },
            pauseDuration,
          };
        }
      }
      
      return {
        id: `event-${Date.now()}-${eventMinute}-sub`,
        type: 'substitution',
        minute: eventMinute,
        isExtraTime,
        teamId: teamToSub.id,
        playerId: inPlayer.id,
        playerName: inPlayer.name,
        subbedOutPlayerId: outPlayer.id,
        subbedOutPlayerName: outPlayer.name,
        subbedInPlayerId: inPlayer.id,
        subbedInPlayerName: inPlayer.name,
        description: `Substitution: ${outPlayer.name} off, ${inPlayer.name} on (${teamToSub.country})`,
        score: { ...currentScore },
        pauseDuration,
      };
    }
    
    default:
      return null;
  }
}
