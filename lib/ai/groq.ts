import Groq from 'groq-sdk';
import { Match, Player } from '@/types';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Format squads for AI prompt
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
 * Generate match commentary using AI
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
  const prompt = `
You are a professional football commentator for the African Nations League. Generate a detailed play-by-play commentary for a match between ${match.team1.name} and ${match.team2.name} in the ${match.round === 'quarterFinal' ? 'Quarter Final' : match.round === 'semiFinal' ? 'Semi Final' : 'Final'}.

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
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 2000,
    });
    
    const commentary = response.choices[0].message.content || '';
    const parsedResult = parseCommentary(commentary, match.team1.name, match.team2.name);
    
    return {
      commentary: commentary.split('\n').filter(line => line.trim()),
      result: parsedResult,
    };
  } catch (error) {
    console.error('Error generating AI commentary:', error);
    throw new Error('Failed to generate match commentary');
  }
}

/**
 * Parse AI commentary to extract match result
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
 * Fallback function for when AI fails
 */
export function generateFallbackCommentary(match: Match): {
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
} {
  // Simple fallback commentary
  const commentary = [
    `Welcome to the ${match.round === 'quarterFinal' ? 'Quarter Final' : match.round === 'semiFinal' ? 'Semi Final' : 'Final'} between ${match.team1.name} and ${match.team2.name}!`,
    'The match kicks off with both teams looking to advance.',
    'Both teams are creating chances in the opening minutes.',
    'The match is heating up as we approach halftime.',
    'Second half begins with both teams still searching for the breakthrough.',
    'The match is reaching its climax with both teams pushing for victory.',
    'Full time whistle blows!',
  ];
  
  // Generate simple result (1-0, 2-1, etc.)
  const team1Score = Math.floor(Math.random() * 3);
  const team2Score = Math.floor(Math.random() * 3);
  
  const goalScorers: Array<{ playerName: string; teamName: string; minute: number }> = [];
  
  // Add goals
  if (team1Score > 0) {
    const scorer = match.team1.squad.find(p => p.naturalPosition === 'AT') || match.team1.squad[0];
    goalScorers.push({
      playerName: scorer.name,
      teamName: match.team1.name,
      minute: Math.floor(Math.random() * 60) + 30,
    });
  }
  
  if (team2Score > 0) {
    const scorer = match.team2.squad.find(p => p.naturalPosition === 'AT') || match.team2.squad[0];
    goalScorers.push({
      playerName: scorer.name,
      teamName: match.team2.name,
      minute: Math.floor(Math.random() * 60) + 30,
    });
  }
  
  return {
    commentary,
    result: {
      team1Score,
      team2Score,
      goalScorers,
    },
  };
}

