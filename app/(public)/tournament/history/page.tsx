import { adminDb } from '@/lib/firebase/admin';
import { TournamentHistory } from '@/types';
import { Trophy, Calendar, Users, Target } from 'lucide-react';
import Link from 'next/link';

export default async function TournamentHistoryPage() {
  let history: TournamentHistory[] = [];
  
  try {
    // Get all tournament history entries, sorted by archivedAt (newest first)
    const historySnapshot = await adminDb.collection('tournamentHistory')
      .orderBy('archivedAt', 'desc')
      .get();
    
    history = historySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        tournamentId: data.tournamentId || '',
        tournamentName: data.tournamentName || 'Tournament',
        winnerId: data.winnerId || '',
        winnerName: data.winnerName || 'N/A',
        winnerManager: data.winnerManager || 'N/A',
        runnerUpId: data.runnerUpId || '',
        runnerUpName: data.runnerUpName || 'N/A',
        runnerUpManager: data.runnerUpManager || 'N/A',
        topScorers: data.topScorers || [],
        totalMatches: data.totalMatches || 0,
        totalGoals: data.totalGoals || 0,
        participatingTeams: data.participatingTeams || [],
        completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : new Date(),
        archivedAt: data.archivedAt?.toDate ? data.archivedAt.toDate() : new Date(),
      } as TournamentHistory;
    });
  } catch (error) {
    console.error('Error fetching tournament history:', error);
  }
  
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2 flex items-center justify-center gap-3">
            <Trophy className="h-10 w-10" />
            Tournament History
          </h1>
          <p className="text-gray-600">Past African Nations League Tournaments</p>
        </div>
        
        {history.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-600">No Past Tournaments</h3>
            <p className="text-gray-500 mb-6">
              Tournament history will appear here after tournaments are completed and reset.
            </p>
            <Link 
              href="/" 
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Current Tournament
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {history.map((tournament) => (
              <div 
                key={tournament.id}
                className="card overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{tournament.tournamentName}</h2>
                      <div className="flex items-center gap-4 text-sm text-blue-100">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(tournament.completedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{tournament.participatingTeams.length} Teams</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span>{tournament.totalGoals} Goals</span>
                        </div>
                      </div>
                    </div>
                    <Trophy className="h-12 w-12 text-yellow-300" />
                  </div>
                </div>
                
                <div className="p-6">
                  {/* Winner and Runner-up */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border-2 border-yellow-300">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 text-yellow-600" />
                        <span className="font-semibold text-yellow-800">Champion</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">{tournament.winnerName}</h3>
                      <p className="text-sm text-gray-600">Manager: {tournament.winnerManager}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border-2 border-gray-300">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 text-gray-500" />
                        <span className="font-semibold text-gray-700">Runner-up</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">{tournament.runnerUpName}</h3>
                      <p className="text-sm text-gray-600">Manager: {tournament.runnerUpManager}</p>
                    </div>
                  </div>
                  
                  {/* Top Scorers */}
                  {tournament.topScorers && tournament.topScorers.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Top Scorers
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {tournament.topScorers.slice(0, 6).map((scorer, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-500 w-6">
                                  {idx + 1}.
                                </span>
                                <div>
                                  <div className="font-semibold text-gray-800 text-sm">
                                    {scorer.playerName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {scorer.teamName} • {scorer.position}
                                  </div>
                                </div>
                              </div>
                              <span className="font-bold text-blue-600">
                                {scorer.goals}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{tournament.totalMatches}</div>
                      <div className="text-sm text-gray-600">Matches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{tournament.totalGoals}</div>
                      <div className="text-sm text-gray-600">Goals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {tournament.totalMatches > 0 
                          ? (tournament.totalGoals / tournament.totalMatches).toFixed(1)
                          : '0'}
                      </div>
                      <div className="text-sm text-gray-600">Goals/Match</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {tournament.topScorers.length > 0 ? tournament.topScorers[0].goals : 0}
                      </div>
                      <div className="text-sm text-gray-600">Top Scorer Goals</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {history.length > 0 && (
          <div className="mt-8 text-center">
            <Link 
              href="/" 
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors mr-4"
            >
              Current Tournament
            </Link>
            <Link 
              href="/tournament/scorers" 
              className="inline-block bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Top Scorers
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
