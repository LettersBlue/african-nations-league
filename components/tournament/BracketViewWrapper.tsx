'use client';

import dynamic from "next/dynamic";
import { Tournament, Team } from '@/types';

// Dynamically import BracketView to avoid hydration issues
const BracketView = dynamic(() => import("@/components/tournament/BracketView"), {
  ssr: false,
  loading: () => <div className="p-8 text-white">Loading bracket...</div>
});

interface BracketViewWrapperProps {
  tournament: Tournament;
  teams: Team[];
  matches: any[];
}

export default function BracketViewWrapper({ tournament, teams, matches }: BracketViewWrapperProps) {
  return <BracketView tournament={tournament} teams={teams} matches={matches} />;
}

