/**
 * Cohere API integration for generating rich match commentary
 */

import { Match, Team, MatchEvent } from '@/types';

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

