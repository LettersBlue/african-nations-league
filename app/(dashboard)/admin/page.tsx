'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUser } from '@/lib/firebase/firestore';
import { getTournamentStatus, startTournament, resetTournament } from '@/app/actions/tournament';
import { regenerateAllMatchEvents } from '@/app/actions/regenerate-events';
import { getTeamsByTournament, getMatchesByTournament } from '@/lib/firebase/firestore';
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
      <AdminLayout activePage="dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activePage="dashboard">
      <div className="mb-8">
        <h1 className="heading-primary mb-2">Dashboard</h1>
        <p className="text-description">Manage the African Nations League Tournament</p>
      </div>

        {message && (
          <div className={`mb-4 ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {message.text}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="card-sm">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-blue-400" />
              <h2 className="heading-quaternary">Tournament Status</h2>
            </div>
            <div className="space-y-2 mb-4">
                <p><span className="font-medium">Status:</span> {tournament?.status === 'registration' ? 'Registration' : tournament?.status === 'active' ? 'Active' : 'Completed'}</p>
                <p><span className="font-medium">Teams:</span> {tournament?.teamCount || teams.length}/8</p>
                <p><span className="font-medium">Current Round:</span> {tournament?.currentRound || 'Not Started'}</p>
              </div>
            <button 
                onClick={handleStartTournament}
                disabled={actionLoading || tournament?.status !== 'registration' || (tournament?.teamCount || teams.length) !== 8}
              className="btn-primary-full-width btn-icon"
              >
              <Play className="h-4 w-4" />
                {actionLoading ? 'Processing...' : 'Start Tournament'}
            </button>
          </div>
          
          <div className="card-sm">
            <h2 className="heading-quaternary mb-4">Quick Actions</h2>
              <div className="space-y-2">
              <a href="/admin/teams" className="btn-outline w-full btn-icon justify-center">
                <Users2 className="h-4 w-4" />
                    View All Teams
                  </a>
              <a href="/" className="btn-outline w-full btn-icon justify-center">
                <Eye className="h-4 w-4" />
                    View Public Bracket
                  </a>
              <button 
                  onClick={handleRegenerateEvents}
                className="btn-outline w-full btn-icon justify-center"
                  disabled={actionLoading}
                >
                <RotateCcw className="h-4 w-4" />
                  {actionLoading ? 'Processing...' : 'Regenerate Match Events'}
              </button>
              <button 
                  onClick={handleResetTournament}
                  disabled={actionLoading}
                className="btn-action-danger w-full btn-icon justify-center"
                >
                <RotateCcw className="h-4 w-4" />
                  {actionLoading ? 'Processing...' : 'Reset Tournament'}
              </button>
            </div>
              </div>
          
          <div className="card-sm">
            <h2 className="heading-quaternary mb-4">Statistics</h2>
              <div className="space-y-2">
                <p><span className="font-medium">Total Teams:</span> {teams.length}</p>
                <p><span className="font-medium">Matches Played:</span> {matches.filter(m => m.status === 'completed').length}</p>
                <p><span className="font-medium">Matches Pending:</span> {matches.filter(m => m.status === 'pending').length}</p>
                <p><span className="font-medium">Goals Scored:</span> 0</p>
                <p><span className="font-medium">Tournament:</span> {tournament?.name || 'N/A'}</p>
              </div>
          </div>
        </div>

        {/* Matches List */}
        {tournament && tournament.status === 'active' && (
          <div className="card card-padding mt-6">
            <h2 className="heading-tertiary mb-6">Tournament Matches</h2>
              {matches.length === 0 ? (
              <div className="table-empty">
                <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-description">No matches created yet.</p>
                </div>
              ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="table-header-cell">Round</th>
                      <th className="table-header-cell">Match</th>
                      <th className="table-header-cell">Status</th>
                      <th className="table-header-cell">Actions</th>
                      </tr>
                    </thead>
                  <tbody>
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
                        <tr key={match.id} className="border-b border-gray-100">
                          <td className="table-cell-muted">
                            {ROUND_LABELS[match.round] || match.round}
                            {match.bracketPosition && ` (${match.bracketPosition})`}
                          </td>
                          <td className="table-cell">
                            <span className="text-sm font-medium">
                            {match.team1?.name || 'TBD'} vs {match.team2?.name || 'TBD'}
                            </span>
                            {match.result && (
                              <span className="ml-2 text-muted">
                                {match.result.team1Score} - {match.result.team2Score}
                              </span>
                            )}
                          </td>
                          <td className="table-cell">
                            <span className={`badge ${
                              match.status === 'completed' 
                                ? 'badge-accepted' 
                                : match.status === 'in_progress'
                                ? 'badge-pending'
                                : 'badge-visitor'
                            }`}>
                              {match.status === 'completed' 
                                ? match.simulationType === 'played' 
                                  ? 'Played' 
                                  : 'Simulated'
                                : match.status}
                            </span>
                          </td>
                          <td className="table-cell">
                            <a href={`/admin/matches/${match.id}`} className="btn-outline btn-small btn-icon">
                              <Eye className="h-4 w-4" />
                                View/Simulate
                              </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}
    </AdminLayout>
  );
}

const ROUND_LABELS: Record<string, string> = {
  quarterFinal: 'Quarter Final',
  semiFinal: 'Semi Final',
  final: 'Final',
};

