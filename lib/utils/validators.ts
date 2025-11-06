import { Player } from '@/types';

// Input validation functions
export function validateTeamComposition(players: Player[]): { isValid: boolean; errors: string[] } {
  // TODO: Implement team composition validation (already exists in ratings.ts)
  return { isValid: true, errors: [] };
}

export function validatePlayerCount(players: Player[]): boolean {
  // TODO: Implement player count validation
  return players.length === 23;
}

export function validateCaptainCount(players: Player[]): boolean {
  // TODO: Implement captain count validation
  return players.filter(p => p.isCaptain).length === 1;
}
