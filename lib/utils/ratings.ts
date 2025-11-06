import { Position, Player } from '@/types';
import { getCountryTierConfig, TIER_CONFIGS } from './country-tiers';

/**
 * Generate player ratings based on natural position and country tier
 * Ratings now vary based on country strength (tier system)
 * - Tier 1 (top teams): 75-100 for natural, 10-50 for others
 * - Tier 2 (strong): 65-90 for natural, 5-45 for others
 * - Tier 3 (mid): 55-80 for natural, 0-40 for others
 * - Tier 4 (developing): 50-70 for natural, 0-35 for others
 */
export function generatePlayerRatings(
  naturalPosition: Position,
  country?: string
): Record<Position, number> {
  const positions: Position[] = ['GK', 'DF', 'MD', 'AT'];
  const ratings: Record<Position, number> = {} as Record<Position, number>;
  
  // Get tier config for country (defaults to tier 4 if not provided)
  const tierConfig = country ? getCountryTierConfig(country) : TIER_CONFIGS[4];
  
  positions.forEach(pos => {
    if (pos === naturalPosition) {
      // Natural position: use tier-based range
      const { min, max } = tierConfig.naturalPositionRange;
      ratings[pos] = Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
      // Non-natural: use tier-based range (but lower overall)
      const { min, max } = tierConfig.nonNaturalPositionRange;
      ratings[pos] = Math.floor(Math.random() * (max - min + 1)) + min;
    }
  });
  
  return ratings;
}

/**
 * Calculate team overall rating
 * Average of all 92 ratings (23 players × 4 positions)
 */
export function calculateTeamRating(players: Player[]): number {
  if (players.length !== 23) {
    throw new Error('Team must have exactly 23 players');
  }
  
  let totalRating = 0;
  players.forEach(player => {
    totalRating += player.ratings.GK;
    totalRating += player.ratings.DF;
    totalRating += player.ratings.MD;
    totalRating += player.ratings.AT;
  });
  
  // 23 players × 4 positions = 92 total ratings
  return totalRating / 92;
}

/**
 * Generate random player names for demo purposes
 */
export function generatePlayerName(position: Position): string {
  const names = {
    GK: ['Ahmed', 'Mohamed', 'Ibrahim', 'Omar', 'Hassan', 'Ali', 'Youssef', 'Karim'],
    DF: ['Salah', 'Mahmoud', 'Tarek', 'Nabil', 'Khalid', 'Rashid', 'Fahad', 'Waleed'],
    MD: ['Amr', 'Hany', 'Sherif', 'Mostafa', 'Ashraf', 'Tamer', 'Khaled', 'Samir'],
    AT: ['Yasser', 'Hossam', 'Mido', 'Ahmed', 'Mohamed', 'Amr', 'Tarek', 'Karim']
  };
  
  const positionNames = names[position];
  const randomName = positionNames[Math.floor(Math.random() * positionNames.length)];
  const randomNumber = Math.floor(Math.random() * 99) + 1;
  
  return `${randomName} ${randomNumber}`;
}

/**
 * Validate team composition
 * Now only requires:
 * - Exactly 23 players
 * - Exactly 1 captain
 * - At least 1 goalkeeper in the entire squad
 * - Exactly 11 starting players (if starting11Ids provided)
 * - At least 1 goalkeeper in starting 11 (if starting11Ids provided)
 */
export function validateTeamComposition(
  players: Player[], 
  starting11Ids?: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (players.length !== 23) {
    errors.push('Team must have exactly 23 players');
    return { isValid: false, errors }; // Early return if player count is wrong
  }
  
  // Check captain count
  const captains = players.filter(p => p.isCaptain);
  if (captains.length !== 1) {
    errors.push('Team must have exactly one captain');
  }
  
  // Check for at least 1 goalkeeper in the entire squad
  const positionCounts = players.reduce((acc, player) => {
    acc[player.naturalPosition] = (acc[player.naturalPosition] || 0) + 1;
    return acc;
  }, {} as Record<Position, number>);
  
  if ((positionCounts.GK || 0) < 1) {
    errors.push('Team must have at least 1 goalkeeper');
  }
  
  // Validate starting 11 if provided
  if (starting11Ids) {
    if (starting11Ids.length !== 11) {
      errors.push('Starting lineup must have exactly 11 players');
    } else {
      // Check that all starting player IDs exist in the squad
      const playerIds = new Set(players.map(p => p.id));
      const invalidIds = starting11Ids.filter(id => !playerIds.has(id));
      if (invalidIds.length > 0) {
        errors.push(`Invalid player IDs in starting lineup: ${invalidIds.join(', ')}`);
      }
      
      // Check that starting 11 has exactly 1 goalkeeper (not more, not less)
      const startingPlayers = players.filter(p => starting11Ids.includes(p.id));
      const startingGKCount = startingPlayers.filter(p => p.naturalPosition === 'GK').length;
      if (startingGKCount < 1) {
        errors.push('Starting lineup must have exactly 1 goalkeeper');
      }
      if (startingGKCount > 1) {
        errors.push('Starting lineup can only have 1 goalkeeper (not more)');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate a complete team with random players
 */
export function generateRandomTeam(country: string, managerName: string, representativeUid: string, representativeEmail: string): Omit<Player, 'id'>[] {
  const players: Omit<Player, 'id'>[] = [];
  
  // Position distribution (realistic squad composition)
  const positionDistribution = {
    GK: 3,  // 3 goalkeepers
    DF: 8,  // 8 defenders
    MD: 7,  // 7 midfielders
    AT: 5   // 5 attackers
  };
  
  let captainAssigned = false;
  
  Object.entries(positionDistribution).forEach(([position, count]) => {
    for (let i = 0; i < count; i++) {
      const isCaptain = !captainAssigned && i === 0; // First player is captain
      if (isCaptain) captainAssigned = true;
      
      players.push({
        name: generatePlayerName(position as Position),
        naturalPosition: position as Position,
        isCaptain,
        ratings: generatePlayerRatings(position as Position),
        goals: 0,
        appearances: 0,
      });
    }
  });
  
  return players;
}

