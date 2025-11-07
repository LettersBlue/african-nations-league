// Core Types
export type Position = 'GK' | 'DF' | 'MD' | 'AT';
export type Role = 'admin' | 'representative' | 'visitor';
export type MatchStatus = 'pending' | 'in_progress' | 'completed';
export type MatchRound = 'quarterFinal' | 'semiFinal' | 'final';
export type TournamentStatus = 'registration' | 'active' | 'completed';
export type SimulationType = 'played' | 'simulated';

// User Types
export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  country?: string; // Only for representatives
  createdAt: Date;
  updatedAt: Date;
  // Invitation fields (for pending representative invitations)
  invitationToken?: string;        // Unique token for invitation link
  invitationSentAt?: Date;         // When invitation was sent
  acceptedAt?: Date;              // When invitation was accepted (null if pending)
  createdBy?: string;             // Admin UID who created the invitation
  pendingInvitation?: boolean;     // true if invitation not yet accepted
}

// Player Types
export interface Player {
  id: string;
  name: string;
  naturalPosition: Position;
  isCaptain: boolean;
  ratings: {
    GK: number; // 50-100 if natural, 0-50 otherwise
    DF: number;
    MD: number;
    AT: number;
  };
  // Analytics tracking
  goals: number;
  appearances: number;
}

// Team Types
export interface Team {
  id: string;
  country: string; // Must be unique per tournament
  managerName: string;
  representativeUid: string;
  representativeEmail: string; // For email notifications
  players: Player[]; // Exactly 23 players
  starting11Ids: string[]; // Exactly 11 player IDs for starting lineup
  overallRating: number; // Average of all 92 ratings (23 players × 4 positions)
  tournamentId: string;
  // Team analytics
  stats: {
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsScored: number;
    goalsConceded: number;
    goalDifference: number;
  };
  createdAt: Date;
  updatedAt?: Date;
}

// Tournament Types
export interface Tournament {
  id: string;
  name: string; // e.g., "African Nations League 2026"
  status: TournamentStatus;
  startedAt?: Date;
  completedAt?: Date;
  teamIds: string[]; // COMPUTED: Always derived from teams collection (teams.tournamentId) - NOT stored in Firestore
  currentRound: MatchRound | null;
  bracket: {
    quarterFinals: Array<{
      matchId: string;
      team1Id: string;
      team2Id: string;
      winnerId?: string;
    }>; // 4 matches
    semiFinals: Array<{
      matchId: string;
      team1Id: string;
      team2Id: string;
      winnerId?: string;
    }>; // 2 matches
    final: {
      matchId: string;
      team1Id: string;
      team2Id: string;
      winnerId?: string;
    }; // 1 match
  };
  winnerId?: string;
  runnerUpId?: string;
}

// Match Types
export interface GoalScorer {
  playerId: string;
  playerName: string;
  teamId: string;
  minute: number; // 1-90 normal, 91-120 extra time, 121+ for penalty marker
  isExtraTime: boolean;
  isPenalty: boolean;
}

// Match Event Types for realistic simulation
export type MatchEventType = 
  | 'kickoff'
  | 'goal'
  | 'own_goal'
  | 'shot_on_target'
  | 'shot_off_target'
  | 'save'
  | 'assist'
  | 'offside'
  | 'foul'
  | 'free_kick'
  | 'penalty_kick'
  | 'corner_kick'
  | 'goal_kick'
  | 'throw_in'
  | 'yellow_card'
  | 'red_card'
  | 'substitution'
  | 'halftime'
  | 'fulltime'
  | 'injury_stoppage'
  | 'var_review'
  | 'added_time'
  | 'extratime'
  | 'penalties'
  | 'final';

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  minute: number; // 0-90 normal, 91-120 extra time, 121+ penalties
  isExtraTime: boolean;
  teamId?: string; // Team involved (null for neutral events)
  playerId?: string; // Player involved
  playerName?: string;
  description: string; // Human-readable event description
  // For goals
  goal?: GoalScorer;
  isOwnGoal?: boolean;
  // For assists
  assistPlayerId?: string;
  assistPlayerName?: string;
  // For cards
  cardType?: 'yellow' | 'red';
  // For shots
  shotType?: 'shot' | 'header' | 'free_kick' | 'penalty' | 'volley';
  saved?: boolean;
  // For offsides
  offsidePlayer?: string;
  // For substitutions
  subbedOutPlayerId?: string;
  subbedOutPlayerName?: string;
  subbedInPlayerId?: string;
  subbedInPlayerName?: string;
  // For VAR reviews
  varDecision?: 'goal' | 'no_goal' | 'penalty' | 'no_penalty' | 'red_card' | 'no_red_card';
  // For added time
  addedTimeMinutes?: number;
  // Score at this moment
  score?: {
    team1: number;
    team2: number;
  };
  // Pause duration for this event (in milliseconds)
  pauseDuration?: number;
}

export interface PenaltyShootout {
  team1Score: number;
  team2Score: number;
  penalties: Array<{
    teamId: string;
    playerId: string;
    scored: boolean;
    order: number;
  }>;
}

export interface MatchResult {
  team1Score: number;
  team2Score: number;
  winnerId: string;
  loserId: string;
  isDraw: boolean; // True if 90min ends in draw (before extra time)
  goalScorers: GoalScorer[];
  wentToExtraTime: boolean;
  wentToPenalties: boolean;
  penaltyShootout?: PenaltyShootout;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: MatchRound;
  bracketPosition: string; // 'QF1', 'QF2', 'QF3', 'QF4', 'SF1', 'SF2', 'FINAL'
  team1: {
    id: string;
    name: string;
    representativeEmail: string;
    squad: Player[]; // Include for AI commentary
  };
  team2: {
    id: string;
    name: string;
    representativeEmail: string;
    squad: Player[];
  };
  status: MatchStatus;
  simulationType?: SimulationType; // Set when match starts
  
  // For 'played' matches only - AI generated
  commentary?: string[]; // Full play-by-play text
  keyMoments?: string[]; // Extracted highlights
  
  // Match result (for both types)
  result?: MatchResult;
  
  // Match events timeline (for replay)
  events?: MatchEvent[]; // Chronological sequence of all match events
  
  emailsSent: boolean; // Track notification status
  createdAt: Date;
  completedAt?: Date;
}

// Tournament History Types (Bonus Feature B)
export interface TopScorer {
  playerId: string;
  playerName: string;
  teamName: string;
  goals: number;
  position: string;
}

export interface TournamentHistory {
  id: string;
  tournamentId: string;
  tournamentName: string;
  winnerId: string;
  winnerName: string;
  winnerManager: string;
  runnerUpId: string;
  runnerUpName: string;
  runnerUpManager: string;
  topScorers: TopScorer[];
  totalMatches: number;
  totalGoals: number;
  participatingTeams: string[];
  completedAt: Date;
  archivedAt: Date;
}

// Player Stats Types (for analytics)
export interface PlayerStats {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  tournamentId: string;
  goals: number;
  assists: number; // Can be simulated
  appearances: number;
  averageRating: number; // Position-based performance
  positionsPlayed: string[];
}

// Form Types
export interface TeamRegistrationForm {
  country: string;
  managerName: string;
  players: Array<{
    name: string;
    naturalPosition: Position;
    isCaptain: boolean;
  }>;
  starting11Ids?: string[]; // IDs of the 11 starting players
  starting11Indices?: number[]; // Indices (0-22) of the 11 starting players (used before IDs are generated)
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  displayName: string;
  role: Role;
  country?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Constants
export const POSITIONS: Position[] = ['GK', 'DF', 'MD', 'AT'];
export const POSITION_LABELS: Record<Position, string> = {
  GK: 'Goalkeeper',
  DF: 'Defender',
  MD: 'Midfielder',
  AT: 'Attacker'
};

export const ROUNDS: MatchRound[] = ['quarterFinal', 'semiFinal', 'final'];
export const ROUND_LABELS: Record<MatchRound, string> = {
  quarterFinal: 'Quarter Final',
  semiFinal: 'Semi Final',
  final: 'Final'
};

// African Countries (55 countries)
export const AFRICAN_COUNTRIES = [
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon',
  'Cape Verde', 'Central African Republic', 'Chad', 'Comoros', 'Congo', 'Congo (DRC)',
  'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon',
  'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho',
  'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius',
  'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'São Tomé and Príncipe',
  'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan',
  'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe'
];

