'use client';

import dynamic from "next/dynamic";
import { Tournament, Team } from '@/types';

// Dynamically import BracketView to avoid hydration issues
const BracketView = dynamic(() => import("@/components/tournament/BracketView"), {
  ssr: false,
  loading: () => <div className="p-8 text-white">Loading bracket...</div>
});

interface BracketViewWrapperProps {
  tournament: Tournament | null;
  teams: Team[];
  matches: any[];
}

export default function BracketViewWrapper({ tournament, teams, matches }: BracketViewWrapperProps) {
  // Provide default empty tournament structure if tournament is null
  const defaultTournament: Tournament = {
    id: '',
    name: 'African Nations League',
    status: 'registration',
    bracket: {
      quarterFinals: [
        { matchId: null, team1Id: null, team2Id: null },
        { matchId: null, team1Id: null, team2Id: null },
        { matchId: null, team1Id: null, team2Id: null },
        { matchId: null, team1Id: null, team2Id: null },
      ],
      semiFinals: [
        { matchId: null, team1Id: null, team2Id: null },
        { matchId: null, team1Id: null, team2Id: null },
      ],
      final: { matchId: null, team1Id: null, team2Id: null },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tournamentToUse = tournament || defaultTournament;

  return <BracketView tournament={tournamentToUse} teams={teams} matches={matches} />;
}

