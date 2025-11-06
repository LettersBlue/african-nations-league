'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUser } from '@/lib/firebase/firestore';
import { getTournamentStatus } from '@/app/actions/tournament';
import { getTeamsByTournament } from '@/lib/firebase/firestore';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
            <p className="text-gray-600">Loading teams...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activePage="teams">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Registered Teams</h1>
        <p className="text-gray-600">View all teams and their statistics</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalTeams}</div>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.averageRating}</div>
            <p className="text-xs text-muted-foreground">Team rating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Rating</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.highestRating}</div>
            <p className="text-xs text-muted-foreground">Top team</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lowest Rating</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.lowestRating}</div>
            <p className="text-xs text-muted-foreground">Underdog</p>
          </CardContent>
        </Card>
      </div>

      {/* Teams Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Registered Teams</CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Users2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p>No teams registered yet.</p>
              <p className="text-sm mt-2">Teams will appear here once representatives register.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overall Rating
                    </th>
                    {tournament && tournament.status !== 'registration' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Goal Diff
                        </th>
                      </>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Players
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Starting 11
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teams.map((team, index) => {
                    const points = tournament && tournament.status !== 'registration'
                      ? (team.stats?.wins || 0) * 3 + (team.stats?.draws || 0) * 1
                      : null;
                    const goalDifference = tournament && tournament.status !== 'registration'
                      ? team.stats?.goalDifference || 0
                      : null;
                    
                    return (
                      <tr key={`${team.id}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                            <span className="text-blue-900 font-bold text-sm">
                              {index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center mr-3">
                              <span className="text-2xl">
                                {COUNTRY_FLAGS[team.country] || ''}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-900">{team.country}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {team.managerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">
                              {team.overallRating.toFixed(1)}
                            </span>
                            <div className="ml-2 w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(team.overallRating / 100) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        {tournament && tournament.status !== 'registration' && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {points}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {goalDifference !== null && goalDifference > 0 ? '+' : ''}{goalDifference}
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {team.players?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {team.starting11Ids?.length || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

