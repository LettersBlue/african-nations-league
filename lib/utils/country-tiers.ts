/**
 * Country tier system for realistic player rating generation
 * Based on real-world football performance and FIFA rankings
 */

export type CountryTier = 1 | 2 | 3 | 4;

export interface CountryTierConfig {
  tier: CountryTier;
  naturalPositionRange: { min: number; max: number }; // For natural position
  nonNaturalPositionRange: { min: number; max: number }; // For other positions
  description: string;
}

/**
 * Country tiers based on recent performance and rankings
 * Tier 1: Top African teams (consistent World Cup qualifiers, strong squads)
 * Tier 2: Strong competitive teams (regular AFCON contenders)
 * Tier 3: Mid-level teams (decent but inconsistent)
 * Tier 4: Developing teams (weaker but growing)
 */
export const COUNTRY_TIERS: Record<string, CountryTier> = {
  // Tier 1 - Top teams (World Cup regulars, strong squads)
  'Morocco': 1,
  'Senegal': 1,
  'Nigeria': 1,
  'Egypt': 1,
  'Tunisia': 1,
  'Algeria': 1,
  
  // Tier 2 - Strong competitive teams
  'Ghana': 2,
  'Cameroon': 2,
  'Ivory Coast': 2,
  'Mali': 2,
  'Burkina Faso': 2,
  'Guinea': 2,
  
  // Tier 3 - Mid-level teams
  'South Africa': 3,
  'Congo (DRC)': 3,
  'Uganda': 3,
  'Angola': 3,
  'Zambia': 3,
  'Kenya': 3,
  'Gabon': 3,
  'Cape Verde': 3,
  
  // Tier 4 - Developing teams (default for unlisted countries)
};

/**
 * Tier configurations defining rating ranges
 */
export const TIER_CONFIGS: Record<CountryTier, CountryTierConfig> = {
  1: {
    tier: 1,
    naturalPositionRange: { min: 75, max: 100 }, // World-class players (like Messi-level)
    nonNaturalPositionRange: { min: 10, max: 50 },
    description: 'Elite Level - World-class players'
  },
  2: {
    tier: 2,
    naturalPositionRange: { min: 65, max: 90 }, // Strong international players
    nonNaturalPositionRange: { min: 5, max: 45 },
    description: 'Strong Level - Quality international players'
  },
  3: {
    tier: 3,
    naturalPositionRange: { min: 55, max: 80 }, // Good domestic/regional players
    nonNaturalPositionRange: { min: 0, max: 40 },
    description: 'Mid Level - Decent regional players'
  },
  4: {
    tier: 4,
    naturalPositionRange: { min: 50, max: 70 }, // Developing players
    nonNaturalPositionRange: { min: 0, max: 35 },
    description: 'Developing Level - Growing players'
  }
};

/**
 * Get country tier (defaults to 4 if not in list)
 */
export function getCountryTier(country: string): CountryTier {
  return COUNTRY_TIERS[country] || 4;
}

/**
 * Get tier configuration for a country
 */
export function getCountryTierConfig(country: string): CountryTierConfig {
  const tier = getCountryTier(country);
  return TIER_CONFIGS[tier];
}

