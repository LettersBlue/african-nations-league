'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMatch, simulateMatch, playMatch } from '@/app/actions/match';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Zap, Trophy, Clock, Target, Users } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import ProgressiveMatchSimulation from '@/components/match/ProgressiveMatchSimulation';
import Link from 'next/link';

const ROUND_LABELS: Record<string, string> = {
  quarterFinal: 'Quarter Final',
  semiFinal: 'Semi Final',
  final: 'Final',
};

export default function AdminMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [showProgressiveSimulation, setShowProgressiveSimulation] = useState(false);
  const [simulationMatch, setSimulationMatch] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadMatchId() {
      const resolvedParams = await params;
      setMatchId(resolvedParams.matchId);
    }
    loadMatchId();
  }, [params]);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    async function loadMatch() {
      const id = matchId; // Local copy for type narrowing
      if (!id) return;
      
      try {
        const result = await getMatch(id);
        if (result.success && result.match) {
          setMatch(result.match);
        } else {
          setMessage({ type: 'error', text: 'Match not found' });
        }
      } catch (error: any) {
        setMessage({ type: 'error', text: error.message || 'Failed to load match' });
      } finally {
        setLoading(false);
      }
    }

    loadMatch();
  }, [matchId]);

  const handleSimulate = async () => {
    if (!matchId) return;
    if (!window.confirm('Are you sure you want to simulate this match? The match will play progressively with sound effects.')) {
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      // First, simulate the match to get results
      const result = await simulateMatch(matchId);
      if (result.success && result.match) {
        // Set up progressive simulation
        setSimulationMatch(result.match);
        setShowProgressiveSimulation(true);
        setActionLoading(false);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to simulate match' });
        setActionLoading(false);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
      setActionLoading(false);
    }
  };

  const handleSimulationComplete = async (result: any) => {
    // Reload match data to show final results
    if (matchId) {
      const matchResult = await getMatch(matchId);
      if (matchResult.success && matchResult.match) {
        setMatch(matchResult.match);
      }
    }
    setShowProgressiveSimulation(false);
    setMessage({ type: 'success', text: 'Match simulation completed!' });
  };

  const handlePlay = async () => {
    if (!matchId) return;
    if (!window.confirm('Are you sure you want to play this match? This will generate AI commentary (may take a moment).')) {
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const result = await playMatch(matchId);
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Match played successfully!' });
        // Reload match data
        const matchResult = await getMatch(matchId);
        if (matchResult.success && matchResult.match) {
          setMatch(matchResult.match);
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to play match' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen ">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading match...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!match) {
    return (
      <AdminLayout>
        <div className="min-h-screen ">
          <div className="container mx-auto px-4 py-8">
            <div className="card card-padding text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Match Not Found</h1>
              <p className="text-gray-600 mb-6">The match you're looking for doesn't exist.</p>
              <Button asChild>
                <Link href="/admin">Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const isCompleted = match.status === 'completed';
  const isPlayed = match.simulationType === 'played';
  const isSimulated = match.simulationType === 'simulated';
  const canSimulate = !isCompleted && match.team1?.id && match.team2?.id && match.team1?.name !== 'TBD' && match.team2?.name !== 'TBD';

  return (
    <AdminLayout>
      <div className="min-h-screen ">
        <div className="container mx-auto px-4 py-8">
          <Link 
            href="/admin" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Progressive Match Simulation */}
          {showProgressiveSimulation && simulationMatch && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <ProgressiveMatchSimulation 
                  match={simulationMatch} 
                  onComplete={handleSimulationComplete}
                />
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Match Details
                </CardTitle>
                <span className="text-sm font-semibold text-gray-500 uppercase">
                  {ROUND_LABELS[match.round] || match.round}
                  {match.bracketPosition && ` • ${match.bracketPosition}`}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {/* Match Header */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-8 mb-4">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-800">{match.team1?.name || 'TBD'}</h2>
                  </div>
                  <div className="text-4xl font-bold text-gray-800">
                    {isCompleted && match.result ? (
                      <>
                        {match.result.team1Score} - {match.result.team2Score}
                      </>
                    ) : (
                      'vs'
                    )}
                  </div>
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-800">{match.team2?.name || 'TBD'}</h2>
                  </div>
                </div>

                {isCompleted && match.result && (
                  <div className="flex items-center justify-center gap-2 text-lg text-gray-600">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span className="font-semibold">
                      Winner: {match.result.winnerId === match.team1?.id ? match.team1?.name : match.team2?.name}
                    </span>
                  </div>
                )}

                <div className="mt-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isCompleted 
                      ? isPlayed 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {isCompleted 
                      ? isPlayed 
                        ? 'AI Commentary Match' 
                        : 'Simulated Match'
                      : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              {canSimulate && !showProgressiveSimulation && (
                <div className="flex gap-4 justify-center mb-6">
                  <Button 
                    onClick={handleSimulate}
                    disabled={actionLoading}
                    variant="outline"
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-5 w-5" />
                    {actionLoading ? 'Simulating...' : 'Simulate Match'}
                  </Button>
                  <Button 
                    onClick={handlePlay}
                    disabled={actionLoading}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Play className="h-5 w-5" />
                    {actionLoading ? 'Playing...' : 'Play Match (AI Commentary)'}
                  </Button>
                </div>
              )}

              {!canSimulate && !isCompleted && (
                <div className="text-center py-4 text-gray-500">
                  <p>Cannot simulate this match: Teams are not determined yet.</p>
                </div>
              )}

              {/* Match Result Details */}
              {isCompleted && match.result && (
                <div className="space-y-6 mt-6">
                  {/* Goal Scorers */}
                  {match.result.goalScorers && match.result.goalScorers.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Goal Scorers
                      </h3>
                      <div className="space-y-2">
                        {match.result.goalScorers.map((goal: any, idx: number) => (
                          <div 
                            key={idx}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-blue-600">
                                {goal.minute}'
                              </span>
                              <span className="font-medium text-gray-800">
                                {goal.playerName}
                              </span>
                              <span className="text-sm text-gray-500">
                                ({goal.isExtraTime ? 'ET' : goal.isPenalty ? 'Pen' : ''})
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {goal.teamId === match.team1?.id ? match.team1?.name : match.team2?.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extra Time / Penalties Info */}
                  {(match.result.wentToExtraTime || match.result.wentToPenalties) && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800 mb-2">
                        <Clock className="h-5 w-5" />
                        <span className="font-semibold">Match Duration</span>
                      </div>
                      {match.result.wentToExtraTime && (
                        <p className="text-sm text-yellow-700">This match went to extra time.</p>
                      )}
                      {match.result.wentToPenalties && match.result.penaltyShootout && (
                        <div className="mt-2 text-sm text-yellow-700">
                          <p className="font-semibold mb-1">Penalty Shootout:</p>
                          <p>
                            {match.team1?.name}: {match.result.penaltyShootout.team1Score} - {match.team2?.name}: {match.result.penaltyShootout.team2Score}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Commentary (for played matches) */}
                  {isPlayed && match.commentary && match.commentary.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Play className="h-5 w-5 text-blue-600" />
                        Match Commentary
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                        <div className="space-y-3">
                          {match.commentary.map((line: string, idx: number) => {
                            const isGoal = line.toLowerCase().includes('goal');
                            return (
                              <p 
                                key={idx}
                                className={`text-sm ${
                                  isGoal 
                                    ? 'font-semibold text-blue-700 bg-blue-50 p-2 rounded' 
                                    : 'text-gray-700'
                                }`}
                              >
                                {line}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Simulated Match Notice */}
                  {isSimulated && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600">
                        This match was simulated without AI commentary. Only the final scoreline and goal scorers are shown.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Team Squads */}
              {match.team1?.squad && match.team2?.squad && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {match.team1?.name} Squad
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {match.team1.squad.slice(0, 11).map((player: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium">{player.name}</span>
                            <span className="text-gray-500 ml-2">({player.naturalPosition})</span>
                            {player.isCaptain && <span className="text-yellow-600 ml-2">©</span>}
                          </div>
                        ))}
                        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                          + {match.team1.squad.length - 11} more players
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {match.team2?.name} Squad
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {match.team2.squad.slice(0, 11).map((player: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium">{player.name}</span>
                            <span className="text-gray-500 ml-2">({player.naturalPosition})</span>
                            {player.isCaptain && <span className="text-yellow-600 ml-2">©</span>}
                          </div>
                        ))}
                        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                          + {match.team2.squad.length - 11} more players
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Public View Link */}
              <div className="mt-6 pt-6 border-t">
                <Link 
                  href={`/tournament/matches/${matchId}`}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View Public Match Page →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

