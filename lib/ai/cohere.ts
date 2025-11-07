/**
 * Cohere API integration for generating rich match commentary
 * PRIMARY AI provider - Groq is used as fallback if Cohere fails
 */

import { Match, Team, MatchEvent, Player } from '@/types';

// Initialize Cohere client (if SDK available, otherwise use fetch)
const COHERE_API_KEY = process.env.COHERE_API_KEY;
const COHERE_API_URL = 'https://api.cohere.ai/v1/generate';

/**
 * Generate continuous commentary for a specific moment in the match
 */
export async function generateContinuousCommentary(
  match: Match,
  team1: Team,
  team2: Team,
  currentMinute: number,
  currentScore: { team1: number; team2: number },
  recentEvents: MatchEvent[],
  matchContext: {
    tournamentRound: string;
    totalEvents: number;
    isExtraTime: boolean;
  }
): Promise<string> {
  if (!COHERE_API_KEY) {
    // Fallback to basic commentary if no API key
    return generateFallbackCommentary(currentMinute, currentScore, team1, team2, matchContext);
  }

  const recentEventsText = recentEvents
    .slice(-5) // Last 5 events
    .map(e => `${Math.floor(e.minute)}' - ${e.description}`)
    .join('\n');

  const prompt = `You are a professional football commentator providing live commentary for the African Nations League ${matchContext.tournamentRound} between ${team1.country || match.team1.name} and ${team2.country || match.team2.name}.

CURRENT MATCH STATE:
- Minute: ${currentMinute}${matchContext.isExtraTime ? ' (Extra Time)' : ''}
- Score: ${currentScore.team1} - ${currentScore.team2}
- ${team1.country || match.team1.name} Rating: ${team1.overallRating.toFixed(1)} | Stats: ${team1.stats.wins}W-${team1.stats.draws}D-${team1.stats.losses}L
- ${team2.country || match.team2.name} Rating: ${team2.overallRating.toFixed(1)} | Stats: ${team2.stats.wins}W-${team2.stats.draws}D-${team2.stats.losses}L

RECENT EVENTS:
${recentEventsText || 'Match just started'}

Generate a brief, natural commentary for this moment. Keep it to ONE short sentence (max 15 words). Focus on:
- Current state of play
- Brief statistical context if relevant

Be concise and professional. This is live commentary - keep it brief.

Commentary:`;

  try {
    const response = await fetch(COHERE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command',
        prompt: prompt,
        max_tokens: 50, // Reduced for shorter commentary
        temperature: 0.7,
        stop_sequences: ['\n\n', '.', '!'],
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.generations?.[0]?.text?.trim() || generateFallbackCommentary(currentMinute, currentScore, team1, team2, matchContext);
  } catch (error) {
    console.warn('Cohere API error, using fallback:', error);
    return generateFallbackCommentary(currentMinute, currentScore, team1, team2, matchContext);
  }
}

/**
 * Format squads for AI prompt (shared with Groq)
 */
function formatSquads(team1Squad: Player[], team2Squad: Player[], team1Name: string, team2Name: string): string {
  const formatTeam = (squad: Player[], teamName: string) => {
    const gk = squad.filter(p => p.naturalPosition === 'GK').map(p => `${p.name} (GK: ${p.ratings.GK})`);
    const df = squad.filter(p => p.naturalPosition === 'DF').map(p => `${p.name} (DF: ${p.ratings.DF})`);
    const md = squad.filter(p => p.naturalPosition === 'MD').map(p => `${p.name} (MD: ${p.ratings.MD})`);
    const at = squad.filter(p => p.naturalPosition === 'AT').map(p => `${p.name} (AT: ${p.ratings.AT})`);
    
    return `
${teamName}:
Goalkeepers: ${gk.join(', ')}
Defenders: ${df.join(', ')}
Midfielders: ${md.join(', ')}
Attackers: ${at.join(', ')}`;
  };
  
  return formatTeam(team1Squad, team1Name) + formatTeam(team2Squad, team2Name);
}

/**
 * Parse AI commentary to extract match result (shared format with Groq)
 */
function parseCommentary(commentary: string, team1Name: string, team2Name: string): {
  team1Score: number;
  team2Score: number;
  goalScorers: Array<{
    playerName: string;
    teamName: string;
    minute: number;
  }>;
} {
  const lines = commentary.split('\n');
  const goalScorers: Array<{ playerName: string; teamName: string; minute: number }> = [];
  
  // Extract goals
  lines.forEach(line => {
    const goalMatch = line.match(/GOAL!.*?(\d+)'.*?([A-Za-z\s]+)\(([A-Za-z\s]+)\)/);
    if (goalMatch) {
      goalScorers.push({
        minute: parseInt(goalMatch[1]),
        playerName: goalMatch[2].trim(),
        teamName: goalMatch[3].trim(),
      });
    }
  });
  
  // Extract final score
  let team1Score = 0;
  let team2Score = 0;
  
  const scoreMatch = commentary.match(/FINAL SCORE:.*?(\d+)\s*-\s*(\d+)/i);
  if (scoreMatch) {
    team1Score = parseInt(scoreMatch[1]);
    team2Score = parseInt(scoreMatch[2]);
  } else {
    // Fallback: count goals by team
    goalScorers.forEach(goal => {
      if (goal.teamName === team1Name) {
        team1Score++;
      } else if (goal.teamName === team2Name) {
        team2Score++;
      }
    });
  }
  
  return {
    team1Score,
    team2Score,
    goalScorers,
  };
}

/**
 * Generate full match commentary using Cohere API (PRIMARY AI provider)
 * This is the first choice for AI commentary generation
 */
export async function generateMatchCommentary(match: Match): Promise<{
  commentary: string[];
  result: {
    team1Score: number;
    team2Score: number;
    goalScorers: Array<{
      playerName: string;
      teamName: string;
      minute: number;
    }>;
  };
}> {
  if (!COHERE_API_KEY) {
    throw new Error('Cohere API key not configured');
  }

  const prompt = `You are a professional football commentator for the African Nations League. Generate a detailed play-by-play commentary for a match between ${match.team1.name} and ${match.team2.name} in the ${match.round === 'quarterFinal' ? 'Quarter Final' : match.round === 'semiFinal' ? 'Semi Final' : 'Final'}.

SQUADS:
${formatSquads(match.team1.squad, match.team2.squad, match.team1.name, match.team2.name)}

RULES:
- The match must end with a clear winner (90 minutes, extra time, or penalties)
- Include key moments: kick-off, chances, goals, saves, fouls, cards
- For each goal, specify: minute, scorer name, team, description
- Make it exciting and realistic
- If draw after 90 min, go to extra time (30 min)
- If still draw, go to penalties (5 each, then sudden death)
- Keep commentary engaging and professional

FORMAT:
Provide commentary as chronological events, one per line.
Mark goals clearly: "GOAL! [minute]' - [Player Name] ([Team]) scores!"
Mark final score: "FINAL SCORE: [Team 1] [score] - [score] [Team 2]"

Generate the commentary now:
`;

  try {
    const response = await fetch(COHERE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command',
        prompt: prompt,
        max_tokens: 2000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.statusText}`);
    }

    const data = await response.json();
    const commentary = data.generations?.[0]?.text?.trim() || '';
    
    if (!commentary) {
      throw new Error('Empty response from Cohere API');
    }

    const parsedResult = parseCommentary(commentary, match.team1.name, match.team2.name);
    
    return {
      commentary: commentary.split('\n').filter(line => line.trim()),
      result: parsedResult,
    };
  } catch (error) {
    console.error('Cohere API error (will try Groq as fallback):', error);
    throw error; // Re-throw to allow Groq fallback
  }
}

/**
 * Fallback commentary generation (when Cohere is not available)
 */
function generateFallbackCommentary(
  minute: number,
  score: { team1: number; team2: number },
  team1: Team,
  team2: Team,
  context: { tournamentRound: string; isExtraTime: boolean }
): string {
  const team1Name = team1.country || 'Team 1';
  const team2Name = team2.country || 'Team 2';
  
  // Calculate win probability
  const ratingDiff = team1.overallRating - team2.overallRating;
  const scoreDiff = score.team1 - score.team2;
  let team1Prob = 50 + (ratingDiff * 0.5) + (scoreDiff * 10);
  team1Prob = Math.max(10, Math.min(90, team1Prob));
  
  const minutesRemaining = context.isExtraTime ? 120 - minute : 90 - minute;
  
  if (minute < 15) {
    return `Early stages. Score ${score.team1} - ${score.team2}.`;
  } else if (minute < 45) {
    return `Approaching halftime. ${team1Name} ${team1Prob.toFixed(0)}% to win.`;
  } else if (minute < 75) {
    return `Second half. ${score.team1} - ${score.team2}. ${minutesRemaining} minutes left.`;
  } else if (minute < 90) {
    return `Final minutes. ${score.team1} - ${score.team2}.`;
  } else if (context.isExtraTime) {
    return `Extra time. ${score.team1} - ${score.team2}.`;
  } else {
    return `Full time. ${score.team1} - ${score.team2}.`;
  }
}

