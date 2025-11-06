'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUser } from '@/lib/firebase/firestore';
import { getTournamentStatus, startTournament, resetTournament } from '@/app/actions/tournament';
import { regenerateAllMatchEvents } from '@/app/actions/regenerate-events';
import { getTeamsByTournament, getMatchesByTournament } from '@/lib/firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users2, Play, RotateCcw, Eye, Trophy } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await getUser(firebaseUser.uid);
        if (!userData || userData.role !== 'admin') {
          router.push('/login');
        } else {
          setUser(userData);
          loadData();
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadData = async () => {
    try {
      const tournamentResult = await getTournamentStatus();
      if (tournamentResult.success) {
        setTournament(tournamentResult.tournament);
        
        if (tournamentResult.tournament?.id) {
          const teamsData = await getTeamsByTournament(tournamentResult.tournament.id);
          setTeams(teamsData);
          const matchesData = await getMatchesByTournament(tournamentResult.tournament.id);
          setMatches(matchesData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTournament = async () => {
    if (!window.confirm('Are you sure you want to start the tournament? This will lock team registrations.')) {
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const result = await startTournament();
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Tournament started!' });
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to start tournament' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetTournament = async () => {
    if (!window.confirm('Are you sure you want to reset the tournament? This will clear all data and reset to registration phase.')) {
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const result = await resetTournament();
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Tournament reset!' });
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to reset tournament' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateEvents = async () => {
    if (!window.confirm('Regenerate events for all completed matches? This will add detailed event timelines to existing matches.')) {
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const result = await regenerateAllMatchEvents();
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Events regenerated! ${result.successCount} matches updated, ${result.errorCount} errors.` 
        });
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to regenerate events' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout activePage="dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Manage the African Nations League Tournament</p>
      </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-blue-600" />
                Tournament Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><span className="font-medium">Status:</span> {tournament?.status === 'registration' ? 'Registration' : tournament?.status === 'active' ? 'Active' : 'Completed'}</p>
                <p><span className="font-medium">Teams:</span> {tournament?.teamCount || teams.length}/8</p>
                <p><span className="font-medium">Current Round:</span> {tournament?.currentRound || 'Not Started'}</p>
              </div>
              <Button 
                onClick={handleStartTournament}
                disabled={actionLoading || tournament?.status !== 'registration' || (tournament?.teamCount || teams.length) !== 8}
                className="w-full mt-4"
              >
                <Play className="h-4 w-4 mr-2" />
                {actionLoading ? 'Processing...' : 'Start Tournament'}
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" asChild>
                  <a href="/admin/teams">
                    <Users2 className="h-4 w-4 mr-2" />
                    View All Teams
                  </a>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/">
                    <Eye className="h-4 w-4 mr-2" />
                    View Public Bracket
                  </a>
                </Button>
                <Button 
                  onClick={handleRegenerateEvents}
                  variant="outline"
                  className="w-full"
                  disabled={actionLoading}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {actionLoading ? 'Processing...' : 'Regenerate Match Events'}
                </Button>
                <Button 
                  onClick={handleResetTournament}
                  disabled={actionLoading}
                  variant="destructive"
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {actionLoading ? 'Processing...' : 'Reset Tournament'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><span className="font-medium">Total Teams:</span> {teams.length}</p>
                <p><span className="font-medium">Matches Played:</span> {matches.filter(m => m.status === 'completed').length}</p>
                <p><span className="font-medium">Matches Pending:</span> {matches.filter(m => m.status === 'pending').length}</p>
                <p><span className="font-medium">Goals Scored:</span> 0</p>
                <p><span className="font-medium">Tournament:</span> {tournament?.name || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Matches List */}
        {tournament && tournament.status === 'active' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Tournament Matches</CardTitle>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p>No matches created yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Round</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {matches
                        .filter(m => {
                          // Only show matches in current bracket
                          const bracketMatchIds = new Set<string>();
                          if (tournament.bracket) {
                            tournament.bracket.quarterFinals?.forEach((qf: any) => {
                              if (qf.matchId) bracketMatchIds.add(qf.matchId);
                            });
                            tournament.bracket.semiFinals?.forEach((sf: any) => {
                              if (sf.matchId) bracketMatchIds.add(sf.matchId);
                            });
                            if (tournament.bracket.final?.matchId) {
                              bracketMatchIds.add(tournament.bracket.final.matchId);
                            }
                          }
                          return bracketMatchIds.has(m.id);
                        })
                        .sort((a, b) => {
                          const roundOrder: Record<string, number> = {
                            quarterFinal: 1,
                            semiFinal: 2,
                            final: 3,
                          };
                          return (roundOrder[a.round] || 0) - (roundOrder[b.round] || 0);
                        })
                        .map((match) => (
                        <tr key={match.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {ROUND_LABELS[match.round] || match.round}
                            {match.bracketPosition && ` (${match.bracketPosition})`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {match.team1?.name || 'TBD'} vs {match.team2?.name || 'TBD'}
                            {match.result && (
                              <span className="ml-2 text-gray-600">
                                {match.result.team1Score} - {match.result.team2Score}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              match.status === 'completed' 
                                ? 'bg-green-100 text-green-700' 
                                : match.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {match.status === 'completed' 
                                ? match.simulationType === 'played' 
                                  ? 'Played' 
                                  : 'Simulated'
                                : match.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Button variant="outline" size="sm" asChild>
                              <a href={`/admin/matches/${match.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                View/Simulate
                              </a>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
    </AdminLayout>
  );
}

const ROUND_LABELS: Record<string, string> = {
  quarterFinal: 'Quarter Final',
  semiFinal: 'Semi Final',
  final: 'Final',
};

