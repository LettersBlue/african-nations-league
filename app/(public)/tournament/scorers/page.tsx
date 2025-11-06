import { getTournamentStatus } from '@/app/actions/tournament';
import { getMatchesByTournament } from '@/lib/firebase/firestore';
import { getTeamsByTournament } from '@/lib/firebase/firestore';
import { Target, Trophy, Award } from 'lucide-react';
import Link from 'next/link';

interface ScorerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  position: string;
  goals: number;
}

export default async function TopScorersPage() {
  const tournamentStatus = await getTournamentStatus();
  const tournament = tournamentStatus?.success ? tournamentStatus.tournament : null;
  
  let scorers: ScorerStats[] = [];
  
  if (tournament?.id) {
    const matches = await getMatchesByTournament(tournament.id);
    const teams = await getTeamsByTournament(tournament.id);
    
    // Create a map of team ID to team name
    const teamMap = new Map(teams.map(t => [t.id, t.country]));
    
    // Aggregate goals by player
    const scorerMap = new Map<string, ScorerStats>();
    
    matches
      .filter(m => m.status === 'completed' && m.result)
      .forEach(match => {
        if (match.result?.goalScorers) {
          match.result.goalScorers.forEach(goal => {
            const existing = scorerMap.get(goal.playerId);
            const teamName = teamMap.get(goal.teamId) || 'Unknown Team';
            
            // Find player position from team data
            let position = 'Unknown';
            const team = teams.find(t => t.id === goal.teamId);
            if (team) {
              const player = team.players.find(p => p.id === goal.playerId);
              if (player) {
                position = player.naturalPosition;
              }
            }
            
            if (existing) {
              existing.goals += 1;
            } else {
              scorerMap.set(goal.playerId, {
                playerId: goal.playerId,
                playerName: goal.playerName,
                teamId: goal.teamId,
                teamName,
                position,
                goals: 1,
              });
            }
          });
        }
      });
    
    // Convert to array and sort by goals (desc), then by name (asc)
    scorers = Array.from(scorerMap.values()).sort((a, b) => {
      if (b.goals !== a.goals) {
        return b.goals - a.goals;
      }
      return a.playerName.localeCompare(b.playerName);
    });
  }
  
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2 flex items-center justify-center gap-3">
            <Target className="h-10 w-10" />
            Top Scorers
          </h1>
          <p className="text-gray-600">
            {tournament ? tournament.name : 'African Nations League 2026'}
          </p>
        </div>
        
        {scorers.length === 0 ? (
          <div className="card p-12 text-center">
            <Target className="h-24 w-24 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2 text-gray-600">No Goals Yet</h3>
            <p className="text-gray-500 mb-6">
              Goal scorers will appear here once matches are played.
            </p>
          </div>
        ) : (
          <>
            {/* Top 3 Scorers Highlight */}
            {scorers.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* 2nd Place */}
                {scorers[1] && (
                  <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg p-6 text-center transform scale-95">
                    <Award className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <div className="text-4xl font-bold text-gray-700 mb-1">{scorers[1].goals}</div>
                    <div className="font-semibold text-gray-800">{scorers[1].playerName}</div>
                    <div className="text-sm text-gray-600">{scorers[1].teamName}</div>
                    <div className="text-xs text-gray-500 mt-1">2nd Place</div>
                  </div>
                )}
                
                {/* 1st Place */}
                {scorers[0] && (
                  <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg p-6 text-center transform scale-105 shadow-xl">
                    <Trophy className="h-10 w-10 mx-auto mb-2 text-yellow-800" />
                    <div className="text-5xl font-bold text-white mb-1">{scorers[0].goals}</div>
                    <div className="font-bold text-white text-lg">{scorers[0].playerName}</div>
                    <div className="text-sm text-yellow-100">{scorers[0].teamName}</div>
                    <div className="text-xs text-yellow-200 mt-1 font-semibold">Top Scorer</div>
                  </div>
                )}
                
                {/* 3rd Place */}
                {scorers[2] && (
                  <div className="bg-gradient-to-br from-orange-200 to-orange-300 rounded-lg p-6 text-center transform scale-95">
                    <Award className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <div className="text-4xl font-bold text-orange-700 mb-1">{scorers[2].goals}</div>
                    <div className="font-semibold text-orange-800">{scorers[2].playerName}</div>
                    <div className="text-sm text-orange-600">{scorers[2].teamName}</div>
                    <div className="text-xs text-orange-500 mt-1">3rd Place</div>
                  </div>
                )}
              </div>
            )}
            
            {/* Full Leaderboard Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Rank</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Player</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Team</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Position</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Goals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {scorers.map((scorer, index) => (
                      <tr 
                        key={scorer.playerId}
                        className={`hover:bg-gray-50 transition-colors ${
                          index < 3 ? 'bg-gray-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {index === 0 && <Trophy className="h-4 w-4 inline text-yellow-500 mr-1" />}
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                          {scorer.playerName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {scorer.teamName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {scorer.position}
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold">
                            {scorer.goals}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        
        <div className="mt-8 text-center">
          <Link 
            href="/" 
            className="inline-block bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
