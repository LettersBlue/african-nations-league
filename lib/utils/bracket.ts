import { Team, MatchRound } from '@/types';

/**
 * Generate tournament bracket structure
 */
export function generateBracket(teamIds: string[]): {
  quarterFinals: Array<{ team1Id: string; team2Id: string }>;
  semiFinals: Array<{ team1Id: string; team2Id: string }>;
  final: { team1Id: string; team2Id: string };
} {
  if (teamIds.length !== 8) {
    throw new Error('Tournament must have exactly 8 teams');
  }
  
  // Shuffle teams randomly
  const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);
  
  // Create quarter final matches
  const quarterFinals = [
    { team1Id: shuffledTeams[0], team2Id: shuffledTeams[1] },
    { team1Id: shuffledTeams[2], team2Id: shuffledTeams[3] },
    { team1Id: shuffledTeams[4], team2Id: shuffledTeams[5] },
    { team1Id: shuffledTeams[6], team2Id: shuffledTeams[7] },
  ];
  
  // Semi finals (winners will be determined later)
  const semiFinals = [
    { team1Id: '', team2Id: '' }, // Winner QF1 vs Winner QF2
    { team1Id: '', team2Id: '' }, // Winner QF3 vs Winner QF4
  ];
  
  // Final (winner will be determined later)
  const final = {
    team1Id: '', // Winner SF1
    team2Id: '', // Winner SF2
  };
  
  return {
    quarterFinals,
    semiFinals,
    final,
  };
}

/**
 * Advance winner to next round
 */
export function advanceWinner(
  currentBracket: any,
  matchId: string,
  winnerId: string,
  round: MatchRound
): any {
  const updatedBracket = { ...currentBracket };
  
  if (round === 'quarterFinal') {
    // Find which QF match this is and advance winner to SF
    const qfIndex = updatedBracket.quarterFinals.findIndex((qf: any) => qf.matchId === matchId);
    if (qfIndex !== -1) {
      updatedBracket.quarterFinals[qfIndex].winnerId = winnerId;
      
      // Advance to semi final
      if (qfIndex < 2) {
        // QF1 or QF2 -> SF1
        if (qfIndex === 0) {
          updatedBracket.semiFinals[0].team1Id = winnerId;
        } else {
          updatedBracket.semiFinals[0].team2Id = winnerId;
        }
      } else {
        // QF3 or QF4 -> SF2
        if (qfIndex === 2) {
          updatedBracket.semiFinals[1].team1Id = winnerId;
        } else {
          updatedBracket.semiFinals[1].team2Id = winnerId;
        }
      }
    }
  } else if (round === 'semiFinal') {
    // Find which SF match this is and advance winner to Final
    const sfIndex = updatedBracket.semiFinals.findIndex((sf: any) => sf.matchId === matchId);
    if (sfIndex !== -1) {
      updatedBracket.semiFinals[sfIndex].winnerId = winnerId;
      
      // Advance to final
      if (sfIndex === 0) {
        updatedBracket.final.team1Id = winnerId;
      } else {
        updatedBracket.final.team2Id = winnerId;
      }
    }
  } else if (round === 'final') {
    // Set tournament winner
    updatedBracket.final.winnerId = winnerId;
  }
  
  return updatedBracket;
}

/**
 * Get bracket position string
 */
export function getBracketPosition(round: MatchRound, index?: number): string {
  switch (round) {
    case 'quarterFinal':
      return `QF${(index || 0) + 1}`;
    case 'semiFinal':
      return `SF${(index || 0) + 1}`;
    case 'final':
      return 'FINAL';
    default:
      return '';
  }
}

/**
 * Get next round
 */
export function getNextRound(currentRound: MatchRound): MatchRound | null {
  switch (currentRound) {
    case 'quarterFinal':
      return 'semiFinal';
    case 'semiFinal':
      return 'final';
    case 'final':
      return null; // Tournament complete
    default:
      return null;
  }
}

/**
 * Check if tournament is complete
 */
export function isTournamentComplete(bracket: any): boolean {
  return bracket.final.winnerId !== '';
}

/**
 * Get tournament winner and runner-up
 */
export function getTournamentResults(bracket: any): { winnerId: string; runnerUpId: string } | null {
  if (!isTournamentComplete(bracket)) {
    return null;
  }
  
  const winnerId = bracket.final.winnerId;
  const runnerUpId = bracket.final.team1Id === winnerId 
    ? bracket.final.team2Id 
    : bracket.final.team1Id;
  
  return { winnerId, runnerUpId };
}

