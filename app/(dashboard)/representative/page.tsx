'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUser } from '@/lib/firebase/firestore';
import { getUserTeam } from '@/app/actions/team';
import { getTournamentStatus } from '@/app/actions/tournament';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users2, BarChart3, UserPlus, Eye, TrendingUp, Edit } from 'lucide-react';
import TeamAnalytics from '@/components/representative/TeamAnalytics';

export default function RepresentativeDashboard() {
  const [user, setUser] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await getUser(firebaseUser.uid);
        if (!userData || userData.role !== 'representative') {
          router.push('/login');
        } else {
          setUser(userData);
          
          // Load team data
          const teamResult = await getUserTeam(firebaseUser.uid);
          if (teamResult.success && teamResult.team) {
            setTeam(teamResult.team);
          }
          
          // Load tournament status
          const tournamentResult = await getTournamentStatus();
          if (tournamentResult.success) {
            setTournament(tournamentResult.tournament);
          }
          
          setLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Representative Dashboard</h1>
          <p className="text-gray-600">Manage your team and track performance</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users2 className="h-5 w-5 text-blue-600" />
                My Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              {team ? (
                <div 
                  onClick={() => router.push('/representative/team')}
                  className="cursor-pointer hover:bg-gray-50 transition-colors rounded-lg p-2 -m-2"
                >
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{team.country}</div>
                    <p className="text-gray-600">Manager: {team.managerName}</p>
                    <p className="text-sm text-gray-500 mt-2">Rating: {team.overallRating.toFixed(1)}</p>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Players:</span>
                        <span className="font-semibold ml-2">{team.players.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Wins:</span>
                        <span className="font-semibold ml-2">{team.stats.wins}</span>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <a href="/representative/team" className="btn-outline btn-small w-full">
                        View Full Team Details
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Users2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="mb-4">No team registered yet</p>
                  <a href="/representative/register-team" className="btn-primary btn-icon justify-center">
                    Register Team
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Team Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user && <TeamAnalytics representativeUid={user.uid} />}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <a href="/representative/register-team" className="btn-primary-full-width btn-icon justify-center">
                    {team ? (
                      <>
                        <Edit className="h-4 w-4" />
                        Edit Team
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Register Team
                      </>
                    )}
                  </a>
                <Button className="w-full" variant="outline" disabled>
                  <Eye className="h-4 w-4 mr-2" />
                  View Matches
                </Button>
                <Button className="w-full" variant="outline" disabled>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Team Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Tournament Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Current Status</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Tournament Status: {tournament?.status === 'registration' ? 'Registration Phase' : tournament?.status === 'active' ? 'Active' : 'Completed'}</li>
                  <li>• Teams Registered: {tournament?.teamCount || 0}/8</li>
                  <li>• Next Round: {tournament?.currentRound ? `${tournament.currentRound}` : 'Quarter Finals'}</li>
                  <li>• Registration Deadline: {tournament?.status === 'registration' ? 'Open' : 'Closed'}</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Requirements</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Exactly 23 players</li>
                  <li>• One captain designated</li>
                  <li>• Minimum 2 goalkeepers</li>
                  <li>• Minimum 4 defenders</li>
                  <li>• Minimum 4 midfielders</li>
                  <li>• Minimum 3 attackers</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center">
          <a href="/" className="btn-outline btn-icon justify-center">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}

