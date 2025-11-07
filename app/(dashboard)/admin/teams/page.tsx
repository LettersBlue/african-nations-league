'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUser } from '@/lib/firebase/firestore';
import { getTournamentStatus } from '@/app/actions/tournament';
import { getTeamsByTournament } from '@/lib/firebase/firestore';
import AdminLayout from '@/components/admin/AdminLayout';
import { Users2, Trophy, TrendingUp, Award } from 'lucide-react';
import { COUNTRY_FLAGS } from '@/lib/constants';

export default function AdminTeamsPage() {
  const [user, setUser] = useState<any>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
          
          // Sort teams based on tournament status
          const sortedTeams = sortTeams(teamsData, tournamentResult.tournament);
          setTeams(sortedTeams);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sort teams based on tournament status
  const sortTeams = (teams: any[], tournament: any) => {
    if (!tournament || tournament.status === 'registration') {
      // Tournament hasn't started: sort by overall rating (highest to lowest)
      return [...teams].sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0));
    } else {
      // Tournament has started: sort by points (descending), then goal difference (descending)
      return [...teams].sort((a, b) => {
        // Calculate points: 3 for win, 1 for draw, 0 for loss
        const pointsA = (a.stats?.wins || 0) * 3 + (a.stats?.draws || 0) * 1;
        const pointsB = (b.stats?.wins || 0) * 3 + (b.stats?.draws || 0) * 1;
        
        // First priority: Points (descending)
        if (pointsB !== pointsA) {
          return pointsB - pointsA;
        }
        
        // Second priority: Goal difference (descending)
        const goalDiffA = a.stats?.goalDifference || 0;
        const goalDiffB = b.stats?.goalDifference || 0;
        return goalDiffB - goalDiffA;
      });
    }
  };

  // Calculate statistics
  const statistics = {
    totalTeams: teams.length,
    averageRating: teams.length > 0 
      ? (teams.reduce((sum, team) => sum + team.overallRating, 0) / teams.length).toFixed(1)
      : '0.0',
    highestRating: teams.length > 0
      ? Math.max(...teams.map((team) => team.overallRating)).toFixed(1)
      : '0.0',
    lowestRating: teams.length > 0
      ? Math.min(...teams.map((team) => team.overallRating)).toFixed(1)
      : '0.0',
  };

  if (loading) {
    return (
      <AdminLayout activePage="teams">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted">Loading teams...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activePage="teams">
      <div className="mb-8">
        <h1 className="heading-primary mb-2">Registered Teams</h1>
        <p className="text-description">View all teams and their statistics</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card-sm">
          <div className="flex flex-row items-center justify-between mb-4">
            <h3 className="heading-quaternary">Total Teams</h3>
            <Users2 className="h-5 w-5" />
          </div>
          <div className="text-3xl font-bold mb-1">{statistics.totalTeams}</div>
          <p className="text-muted text-sm">Registered</p>
        </div>

        <div className="card-sm">
          <div className="flex flex-row items-center justify-between mb-4">
            <h3 className="heading-quaternary">Average Rating</h3>
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="text-3xl font-bold mb-1">{statistics.averageRating}</div>
          <p className="text-muted text-sm">Team rating</p>
        </div>

        <div className="card-sm">
          <div className="flex flex-row items-center justify-between mb-4">
            <h3 className="heading-quaternary">Highest Rating</h3>
            <Trophy className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="text-3xl font-bold mb-1">{statistics.highestRating}</div>
          <p className="text-muted text-sm">Top team</p>
        </div>

        <div className="card-sm">
          <div className="flex flex-row items-center justify-between mb-4">
            <h3 className="heading-quaternary">Lowest Rating</h3>
            <Award className="h-5 w-5" />
          </div>
          <div className="text-3xl font-bold mb-1">{statistics.lowestRating}</div>
          <p className="text-muted text-sm">Underdog</p>
        </div>
      </div>

      {/* Teams Table */}
      <div className="card card-padding">
        <h2 className="heading-tertiary mb-6">All Registered Teams</h2>
        {teams.length === 0 ? (
          <div className="table-empty">
            <Users2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-description">No teams registered yet.</p>
            <p className="text-muted text-sm mt-2">Teams will appear here once representatives register.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header-cell">#</th>
                  <th className="table-header-cell">Country</th>
                  <th className="table-header-cell">Manager</th>
                  <th className="table-header-cell">Overall Rating</th>
                  {tournament && tournament.status !== 'registration' && (
                    <>
                      <th className="table-header-cell">Points</th>
                      <th className="table-header-cell">Goal Diff</th>
                    </>
                  )}
                  <th className="table-header-cell">Players</th>
                  <th className="table-header-cell">Starting 11</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, index) => {
                  const points = tournament && tournament.status !== 'registration'
                    ? (team.stats?.wins || 0) * 3 + (team.stats?.draws || 0) * 1
                    : null;
                  const goalDifference = tournament && tournament.status !== 'registration'
                    ? team.stats?.goalDifference || 0
                    : null;
                  
                  return (
                    <tr key={`${team.id}-${index}`} className="border-b border-gray-100">
                      <td className="table-cell">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/30">
                          <span className="font-bold text-sm">
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center mr-3">
                            <span className="text-2xl">
                              {COUNTRY_FLAGS[team.country] || ''}
                            </span>
                          </div>
                          <div className="text-sm font-medium">{team.country}</div>
                        </div>
                      </td>
                      <td className="table-cell-muted">
                        {team.managerName}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center">
                          <span className="text-sm font-medium mr-2">
                            {team.overallRating.toFixed(1)}
                          </span>
                          <div className="w-20 bg-white/20 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(team.overallRating / 100) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      {tournament && tournament.status !== 'registration' && (
                        <>
                          <td className="table-cell">
                            <span className="text-sm font-medium">
                              {points}
                            </span>
                          </td>
                          <td className="table-cell-muted">
                            {goalDifference !== null && goalDifference > 0 ? '+' : ''}{goalDifference}
                          </td>
                        </>
                      )}
                      <td className="table-cell-muted">
                        {team.players?.length || 0}
                      </td>
                      <td className="table-cell-muted">
                        {team.starting11Ids?.length || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

